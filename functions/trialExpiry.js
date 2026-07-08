/**
 * Cloud Function: Expire trials and lapsed paid subscriptions
 *
 * Server-side safety net for subscription expiry. Client code
 * (src/hooks/useSubscriptionStatus.js) already auto-locks a subscription the
 * next time its owner loads the dashboard past the expiry date — but if an
 * owner never comes back, that client-side check never runs and the
 * subscription doc sits stale in 'trial'/'active' forever. This scheduled
 * job catches those cases daily regardless of whether anyone opens the app.
 *
 * Mirrors the trial/paid expiry rules already enforced in firestore.rules
 * (isOwnerAutoExpiringSubscription / companyHasPaidFeatureAccess): a trial
 * expires once trialEndsAt has passed, an active paid plan expires once
 * nextBillingDate has passed. Both transition to status='expired', locked=true.
 *
 * Deploy: firebase deploy --only functions -P production
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const db = admin.firestore();

async function expireLapsedSubscriptions() {
  const now = admin.firestore.Timestamp.now();

  const snapshot = await db
    .collection('subscriptions')
    .where('status', 'in', ['trial', 'active'])
    .get();

  let expiredCount = 0;
  let batch = db.batch();
  let opsInBatch = 0;

  for (const docSnap of snapshot.docs) {
    const sub = docSnap.data();
    const isLapsedTrial = sub.status === 'trial' && sub.trialEndsAt && sub.trialEndsAt.toMillis() <= now.toMillis();
    const isLapsedPaid = sub.status === 'active' && sub.nextBillingDate && sub.nextBillingDate.toMillis() <= now.toMillis();

    if (!isLapsedTrial && !isLapsedPaid) continue;

    batch.update(docSnap.ref, {
      status: 'expired',
      locked: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'scheduled_expiry_job',
    });
    expiredCount += 1;
    opsInBatch += 1;

    // Firestore batches cap at 500 writes.
    if (opsInBatch === 500) {
      await batch.commit();
      batch = db.batch();
      opsInBatch = 0;
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
  }

  if (expiredCount > 0) {
    await db.collection('audit_logs').add({
      action: 'subscriptions_auto_expired',
      detail: `Scheduled job expired ${expiredCount} lapsed subscription(s).`,
      adminEmail: 'system',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  console.log(`expireLapsedSubscriptions: checked ${snapshot.size} trial/active subscriptions, expired ${expiredCount}.`);
  return { checked: snapshot.size, expired: expiredCount };
}

exports.expireLapsedSubscriptions = onSchedule(
  {
    schedule: 'every day 03:00',
    timeoutSeconds: 300,
    memory: '512MiB',
    region: 'us-central1',
  },
  async () => {
    await expireLapsedSubscriptions();
  }
);

// Manual trigger for admin testing — mirrors calculateAnalyticsMetricsManual.
exports.expireLapsedSubscriptionsManual = onCall(
  { region: 'us-central1' },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new Error('You must be signed in.');
    }
    const callerSnap = await db.doc(`admin_users/${callerUid}`).get();
    if (!callerSnap.exists || callerSnap.data().isActive === false) {
      throw new Error('Only active admins can run this manually.');
    }
    return expireLapsedSubscriptions();
  }
);
