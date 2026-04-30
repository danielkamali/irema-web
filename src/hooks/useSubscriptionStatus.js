import { useState, useEffect, useCallback } from 'react';
import { db, collection, query, where, getDocs, doc, updateDoc } from '../firebase/config';

// Module-scope constants (avoid reallocation on every render/call)
const PLAN_RANK = { starter: 0, professional: 1, enterprise: 2 };

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
export function useSubscriptionStatus(companyId) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Guard to prevent duplicate auto-lock writes
  const [lockAttempted, setLockAttempted] = useState(false);

  // Load subscription from Firestore
  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadSubscription = async () => {
      try {
        setError(null);
        const q = query(collection(db, 'subscriptions'), where('companyId', '==', companyId));
        const snap = await getDocs(q);
        if (cancelled) return;
        if (!snap.empty) {
          const sub = { id: snap.docs[0].id, ...snap.docs[0].data() };
          setSubscription(sub);
        } else {
          setSubscription(null);
        }
      } catch (e) {
        console.error('useSubscriptionStatus: failed to load subscription:', e);
        if (!cancelled) {
          setError(e.message || 'Failed to load subscription');
          setSubscription(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadSubscription();
    return () => { cancelled = true; };
  }, [companyId]);

  // Auto-lock expired subscriptions (trial or paid past billing date)
  useEffect(() => {
    if (!subscription || lockAttempted) return;
    autoLockExpiredSubscription(subscription)
      .then(() => setLockAttempted(true))
      .catch(console.error);
  }, [subscription, lockAttempted]);

  // Derived state
  const status = subscription?.status;
  const plan = subscription?.plan || 'starter';
  const isExpired = status === 'expired';
  const isCancelled = status === 'cancelled';
  const isLocked = subscription?.locked === true;
  const isTrial = status === 'trial';
  const isPaidActive = status === 'active';

  // Effective plan: expired/cancelled/locked/missing → starter
  const effectivePlan = (isExpired || isCancelled || isLocked || !subscription)
    ? 'starter'
    : plan;

  // Trial days left (derived, no separate state needed)
  let trialDaysLeft = null;
  if (isTrial && subscription?.trialEndsAt) {
    const endDate = subscription.trialEndsAt.toDate
      ? subscription.trialEndsAt.toDate()
      : new Date(subscription.trialEndsAt.seconds * 1000);
    trialDaysLeft = Math.max(0, Math.ceil((endDate - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  // Analytics trial
  let analyticsTrialDaysLeft = 0;
  let isOnAnalyticsTrial = false;
  if (subscription?.analyticsTrialEndsAt) {
    const trialEnds = subscription.analyticsTrialEndsAt.toDate
      ? subscription.analyticsTrialEndsAt.toDate()
      : new Date(subscription.analyticsTrialEndsAt.seconds * 1000);
    analyticsTrialDaysLeft = Math.max(0, Math.ceil((trialEnds - Date.now()) / (1000 * 60 * 60 * 24)));
    isOnAnalyticsTrial = analyticsTrialDaysLeft > 0;
  }

  // Analytics access level: downgrade to 'free' if expired/cancelled/locked
  const rawAnalyticsLevel = subscription?.analyticsAccessLevel || 'free';
  const analyticsAccessLevel = (isExpired || isCancelled || isLocked) ? 'free' : rawAnalyticsLevel;

  // Feature access check (memoized to avoid re-creation on every render)
  const hasAccess = useCallback(
    (feature) => {
      if (isLocked || isExpired || isCancelled) return false;

      const rank = PLAN_RANK[effectivePlan] || 0;

      const featureMap = {
        reply_reviews: rank >= 1,
        unlimited_replies: rank >= 1,
        analytics_advanced: rank >= 1 || isOnAnalyticsTrial,
        analytics_premium: rank >= 2,
        qr_code: rank >= 1,
        competitor_insights: rank >= 1,
        verified_badge: rank >= 1,
        multi_listing: rank >= 2,
        ai_sentiment: rank >= 2,
        api_access: rank >= 2,
        white_label: rank >= 2,
        priority_support: rank >= 1,
        product_listings: rank >= 2,
      };

      return featureMap[feature] || false;
    },
    [isLocked, isExpired, isCancelled, effectivePlan, isOnAnalyticsTrial]
  );

  return {
    subscription,
    loading,
    error,
    effectivePlan,
    isExpired,
    isCancelled,
    isLocked,
    isTrial,
    trialDaysLeft,
    analyticsAccessLevel,
    isOnAnalyticsTrial,
    analyticsTrialDaysLeft,
    hasAccess,
  };
}
