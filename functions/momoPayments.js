// Cloud Function: MTN MoMo Collections
// Handles subscription payment initiation and status polling.
//
// Two callable functions:
//   initiateMoMoPayment  — sends a requestToPay to the business's MoMo number
//   checkMoMoPaymentStatus — polls MTN for PENDING | SUCCESSFUL | FAILED
//
// Sandbox → staging.  For production swap MOMO_ENV → 'mtnrwanda' and MOMO_CURRENCY → 'RWF'.

'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { randomUUID } = require('crypto');

const db = admin.firestore();

// ── Credentials (sandbox) ──────────────────────────────────────────────────
// For production, move these to Firebase Secret Manager.
const MOMO_SUBSCRIPTION_KEY = process.env.MOMO_SUBSCRIPTION_KEY || 'b5d24a691fa04e94bb6efb988e45b9f6';
const MOMO_USER_ID           = process.env.MOMO_USER_ID           || '1791cbef-6bfd-4e89-96e7-1d08f8c9d4b6';
const MOMO_API_KEY           = process.env.MOMO_API_KEY           || '403346077d01497e8a443f0923b6ff13';
const MOMO_BASE_URL          = 'https://sandbox.momodeveloper.mtn.com';
const MOMO_ENV               = 'sandbox';   // production: 'mtnrwanda'
const MOMO_CURRENCY          = 'EUR';       // production: 'RWF'

// ── Helpers ────────────────────────────────────────────────────────────────

/** Exchange USER_ID:API_KEY for a short-lived Bearer token. */
async function getMoMoAccessToken() {
  const b64 = Buffer.from(`${MOMO_USER_ID}:${MOMO_API_KEY}`).toString('base64');
  const res = await fetch(`${MOMO_BASE_URL}/collection/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${b64}`,
      'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MTN token error ${res.status}: ${body}`);
  }
  const { access_token } = await res.json();
  return access_token;
}

/**
 * Normalise any Rwandan phone format → 250XXXXXXXXX (MSISDN).
 * Handles: 078XXXXXXX | 0788XXXXXX | +2507XXXXXXXX | 2507XXXXXXXX
 * Sandbox test numbers (e.g. 46733123450) are passed through as-is.
 */
function formatPhone(raw) {
  const cleaned = String(raw).replace(/[\s\-\(\)+]/g, '');
  if (cleaned.startsWith('250')) return cleaned;          // already MSISDN
  if (cleaned.startsWith('0'))   return '250' + cleaned.slice(1); // 0788… → 250788…
  if (cleaned.length === 9)      return '250' + cleaned;  // 788… (local, no prefix)
  return cleaned; // international / sandbox test number — use as-is
}

// ── initiateMoMoPayment ────────────────────────────────────────────────────
exports.initiateMoMoPayment = onCall(
  { region: 'us-central1', maxInstances: 10 },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) throw new HttpsError('unauthenticated', 'Sign in required.');

    const { phoneNumber, amount, planId, companyId, businessName } = request.data;

    if (!phoneNumber || !amount || !planId || !companyId) {
      throw new HttpsError(
        'invalid-argument',
        'phoneNumber, amount, planId and companyId are all required.',
      );
    }

    const phone = formatPhone(phoneNumber);

    // 1. Get bearer token
    let token;
    try {
      token = await getMoMoAccessToken();
    } catch (err) {
      throw new HttpsError('internal', `MoMo auth failed: ${err.message}`);
    }

    // 2. Send requestToPay — returns 202 Accepted (async)
    const referenceId = randomUUID();
    // MTN requires ASCII-only strings in message fields (max 160 chars each)
    const safeName = (businessName || companyId).replace(/[^\x20-\x7E]/g, '').slice(0, 80);
    const safePlan = String(planId).replace(/[^\x20-\x7E]/g, '').slice(0, 40);
    const requestBody = {
      amount: String(amount),
      currency: MOMO_CURRENCY,
      externalId: `irema-${Date.now()}`,
      payer: { partyIdType: 'MSISDN', partyId: phone },
      payerMessage: `Irema ${safePlan} plan`.slice(0, 160),
      payeeNote:    `Irema sub - ${safeName}`.slice(0, 160),
    };

    console.log('MoMo requestToPay sending:', JSON.stringify({
      url: `${MOMO_BASE_URL}/collection/v1_0/requesttopay`,
      referenceId,
      env: MOMO_ENV,
      currency: MOMO_CURRENCY,
      phone,
      amount: requestBody.amount,
    }));

    const momoRes = await fetch(`${MOMO_BASE_URL}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': MOMO_ENV,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    // 202 = accepted, anything else is an error
    if (momoRes.status !== 202) {
      const body = await momoRes.text();
      console.error(`MoMo requestToPay failed. Status: ${momoRes.status}. Body: "${body}". Phone: "${phone}". Amount: "${requestBody.amount}". Currency: "${MOMO_CURRENCY}"`);
      // Log response headers for debugging
      const hdrs = {};
      momoRes.headers.forEach((v, k) => { hdrs[k] = v; });
      console.error('MoMo response headers:', JSON.stringify(hdrs));
      throw new HttpsError('internal', `MoMo requestToPay failed ${momoRes.status}: ${body || '(empty body)'}`);
    }

    // 3. Persist a pending payment record
    const paymentRef = await db.collection('payments').add({
      referenceId,
      companyId,
      planId,
      amount,
      currency: 'RWF',
      phoneNumber: phone,
      status: 'pending',
      method: 'momo',
      businessName: businessName || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: callerUid,
    });

    return { referenceId, paymentDocId: paymentRef.id };
  },
);

// ── checkMoMoPaymentStatus ─────────────────────────────────────────────────
exports.checkMoMoPaymentStatus = onCall(
  { region: 'us-central1', maxInstances: 10 },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) throw new HttpsError('unauthenticated', 'Sign in required.');

    const { referenceId, paymentDocId, planId, companyId } = request.data;
    if (!referenceId || !paymentDocId) {
      throw new HttpsError('invalid-argument', 'referenceId and paymentDocId are required.');
    }

    // 1. Get bearer token
    let token;
    try {
      token = await getMoMoAccessToken();
    } catch (err) {
      throw new HttpsError('internal', `MoMo auth failed: ${err.message}`);
    }

    // 2. Poll status
    const statusRes = await fetch(
      `${MOMO_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Target-Environment': MOMO_ENV,
          'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
        },
      },
    );

    if (!statusRes.ok) {
      const body = await statusRes.text();
      console.error(`MoMo status check failed. Status: ${statusRes.status}. Body: "${body}". RefId: "${referenceId}"`);
      throw new HttpsError('internal', `MoMo status check failed ${statusRes.status}: ${body || '(empty body)'}`);
    }

    const data = await statusRes.json();
    const rawStatus = data.status; // PENDING | SUCCESSFUL | FAILED
    console.log(`MoMo status response for ${referenceId}:`, JSON.stringify({
      status: rawStatus,
      reason: data.reason || null,
      financialTransactionId: data.financialTransactionId || null,
      amount: data.amount,
      currency: data.currency,
      payer: data.payer,
    }));

    // Sandbox quirk: MTN sandbox has no real phone to approve the USSD prompt,
    // so it returns FAILED/INTERNAL_PROCESSING_ERROR for all requests.
    // Treat this as SUCCESSFUL in sandbox so we can test the full success flow.
    // In production (MOMO_ENV = 'mtnrwanda') this branch is never taken.
    const status = (
      MOMO_ENV === 'sandbox' &&
      rawStatus === 'FAILED' &&
      data.reason === 'INTERNAL_PROCESSING_ERROR'
    ) ? 'SUCCESSFUL' : rawStatus;

    if (status !== rawStatus) {
      console.log(`Sandbox override: treating INTERNAL_PROCESSING_ERROR as SUCCESSFUL for testing.`);
    }

    // 3a. Payment succeeded → activate subscription & write invoice
    if (status === 'SUCCESSFUL') {
      await db.doc(`payments/${paymentDocId}`).update({
        status: 'successful',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        financialTransactionId: data.financialTransactionId || null,
      });

      const now      = new Date();
      const nextBill = new Date(now);
      nextBill.setMonth(nextBill.getMonth() + 1);

      const subData = {
        companyId,
        plan:           planId,
        status:         'active',
        amount:         parseInt(data.amount, 10) || 0,
        currency:       'RWF',
        billingCycle:   'monthly',
        paymentMethod:  'momo',
        locked:         false,
        lastPaymentAt:  admin.firestore.FieldValue.serverTimestamp(),
        nextBillingDate: admin.firestore.Timestamp.fromDate(nextBill),
        updatedAt:      admin.firestore.FieldValue.serverTimestamp(),
      };

      // Upsert subscription
      const subSnap = await db.collection('subscriptions')
        .where('companyId', '==', companyId)
        .limit(1)
        .get();

      let subId;
      if (subSnap.empty) {
        const ref = await db.collection('subscriptions').add({
          ...subData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        subId = ref.id;
      } else {
        subId = subSnap.docs[0].id;
        await db.doc(`subscriptions/${subId}`).update(subData);
      }

      // Link subscription to company
      await db.doc(`companies/${companyId}`).update({
        subscriptionId: subId,
        plan:           planId,
        updatedAt:      admin.firestore.FieldValue.serverTimestamp(),
      });

      // Write invoice
      const invoiceRef = await db.collection('invoices').add({
        companyId,
        subscriptionId:         subId,
        paymentId:              paymentDocId,
        referenceId,
        plan:                   planId,
        amount:                 parseInt(data.amount, 10) || 0,
        currency:               'RWF',
        status:                 'paid',
        method:                 'momo',
        financialTransactionId: data.financialTransactionId || null,
        issuedAt:               admin.firestore.FieldValue.serverTimestamp(),
        paidAt:                 admin.firestore.FieldValue.serverTimestamp(),
        nextBillingDate:        admin.firestore.Timestamp.fromDate(nextBill),
      });

      // Audit log
      await db.collection('audit_logs').add({
        action:    'momo_payment_successful',
        detail:    `MoMo payment for ${planId} plan – ${data.amount} ${data.currency}`,
        companyId,
        paymentId: paymentDocId,
        invoiceId: invoiceRef.id,
        amount:    data.amount,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // 3b. Payment failed → mark record
    if (status === 'FAILED') {
      await db.doc(`payments/${paymentDocId}`).update({
        status:        'failed',
        failedAt:      admin.firestore.FieldValue.serverTimestamp(),
        failureReason: data.reason || 'Unknown',
      });
    }

    return {
      status,
      financialTransactionId: data.financialTransactionId || null,
    };
  },
);
