import { useState, useEffect, useCallback } from 'react';
import { db, collection, query, where, onSnapshot, doc, updateDoc } from '../firebase/config';
import { getSubscriptionAccess, selectBestSubscription } from '../utils/subscriptionAccess';

/**
 * Check if a trial or paid subscription has expired and auto-lock it.
 * This logic was previously duplicated in CompanyDashboard.jsx and is now
 * centralized here. Writes are guarded to prevent double-writes when
 * multiple components use this hook for the same companyId.
 */
async function autoLockExpiredSubscription(subscription) {
  if (!subscription?.id) return;
  // Only write if not already locked — prevents double-writes
  if (subscription.locked) return;

  const needsLock =
    (subscription.status === 'trial' && subscription.trialEndsAt) ||
    (subscription.status === 'active' && subscription.nextBillingDate);

  if (!needsLock) return;

  let expiryDate;
  if (subscription.status === 'trial') {
    expiryDate = subscription.trialEndsAt.toDate
      ? subscription.trialEndsAt.toDate()
      : new Date(subscription.trialEndsAt.seconds * 1000);
  } else {
    expiryDate = subscription.nextBillingDate.toDate
      ? subscription.nextBillingDate.toDate()
      : new Date(subscription.nextBillingDate.seconds * 1000);
  }

  if (expiryDate < new Date()) {
    await updateDoc(doc(db, 'subscriptions', subscription.id), {
      status: 'expired',
      locked: true,
    });
  }
}

/**
 * Centralized subscription status hook.
 * Reads the subscription document for a company from Firestore and computes
 * all access-control decisions from a single source of truth.
 *
 * Expired, cancelled, or locked subscriptions are automatically downgraded
 * to 'starter' for all feature checks. Paid subscriptions past their
 * nextBillingDate are auto-detected and marked expired.
 *
 * @param {string|null} companyId - The company ID to look up (null = skip fetch)
 * @returns {{
 *   subscription: object|null,
 *   loading: boolean,
 *   error: string|null,
 *   effectivePlan: 'starter'|'professional'|'enterprise',
 *   isExpired: boolean,
 *   isCancelled: boolean,
 *   isLocked: boolean,
 *   isTrial: boolean,
 *   trialDaysLeft: number|null,
 *   analyticsAccessLevel: 'free'|'middle'|'premium',
 *   isOnAnalyticsTrial: boolean,
 *   analyticsTrialDaysLeft: number,
 *   hasAccess: (feature: string) => boolean,
 * }}
 */
export function useSubscriptionStatus(companyId, company = {}) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Guard to prevent duplicate auto-lock writes
  const [lockAttempted, setLockAttempted] = useState(false);

  // Load subscription from Firestore (real-time listener)
  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'subscriptions'), where('companyId', '==', companyId));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const subscriptions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const sub = selectBestSubscription(subscriptions, new Date(), company);
        setSubscription(sub);
        setError(null);
      } else {
        setSubscription(null);
        setError(null);
      }
      setLoading(false);
    }, (e) => {
      console.error('useSubscriptionStatus: failed to load subscription:', e);
      setError(e.message || 'Failed to load subscription');
      setSubscription(null);
      setLoading(false);
    });
    return unsub;
  }, [companyId, company?.subscriptionId]);

  useEffect(() => {
    setLockAttempted(false);
  }, [subscription?.id, subscription?.status, subscription?.trialEndsAt, subscription?.nextBillingDate]);

  // Auto-lock expired subscriptions (trial or paid past billing date)
  useEffect(() => {
    if (!subscription || lockAttempted) return;
    autoLockExpiredSubscription(subscription)
      .then(() => setLockAttempted(true))
      .catch(console.error);
  }, [subscription, lockAttempted]);

  const access = getSubscriptionAccess(subscription, new Date(), company);

  // Feature access check (memoized to avoid re-creation on every render)
  const hasAccess = useCallback(
    (feature) => access.hasAccess(feature),
    [access]
  );

  return {
    subscription,
    loading,
    error,
    effectivePlan: access.effectivePlan,
    isExpired: access.isExpired,
    isCancelled: access.isCancelled,
    isLocked: access.isLocked,
    isTrial: access.isTrial,
    trialDaysLeft: access.trialDaysLeft,
    analyticsAccessLevel: access.analyticsAccessLevel,
    isOnAnalyticsTrial: access.isOnAnalyticsTrial,
    analyticsTrialDaysLeft: access.analyticsTrialDaysLeft,
    hasAccess,
  };
}
