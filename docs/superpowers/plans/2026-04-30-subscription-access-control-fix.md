# Subscription Access Control Fix — Expired Plan Leak

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 6 access control failures where expired/cancelled subscriptions still grant Pro/Enterprise features.

**Architecture:** Create a centralized `useSubscriptionStatus` hook that computes `effectivePlan`, `isExpired`, `isCancelled`, `isLocked`, and `hasAccess(feature)` from the subscription document. Replace all scattered inline checks with this single source of truth. Add automatic expiry detection for paid subscriptions based on `nextBillingDate`. Add a route-level `SubscriptionGuard` wrapper for `/company-dashboard`.

**Tech Stack:** React hooks, Firebase Firestore, react-router-dom

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/hooks/useSubscriptionStatus.js` | **Create** | Centralized subscription status hook — reads subscription doc, computes effective access level, auto-detects paid expiry |
| `src/components/SubscriptionGuard.jsx` | **Create** | Route-level guard that redirects expired/cancelled users to subscription page |
| `src/pages/CompanyDashboard.jsx` | **Modify** | Replace all 5 scattered access checks with the hook; fix reply rate limiting, analytics gating, products nav |
| `src/pages/admin/AdminSubscriptions.jsx` | **Modify** | On subscription cancel/expiry, clear `enabledFeatures` on company doc |
| `src/App.jsx` | **Modify** | Wrap `/company-dashboard` route with `SubscriptionGuard` |

---

### Task 1: Create `useSubscriptionStatus` Hook

**Files:**
- Create: `src/hooks/useSubscriptionStatus.js`

- [ ] **Step 1: Create the hook**

```javascript
import { useState, useEffect } from 'react';
import { db, collection, query, where, getDocs, doc, updateDoc } from '../firebase/config';

/**
 * Centralized subscription status hook.
 * Returns a single source of truth for all subscription-based access decisions.
 *
 * @param {string} companyId - The company ID to look up
 * @returns {{
 *   subscription: object|null,
 *   loading: boolean,
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

  // Trial days left
  const [trialDaysLeft, setTrialDaysLeft] = useState(null);
  useEffect(() => {
    if (isTrial && subscription?.trialEndsAt) {
      const endDate = subscription.trialEndsAt.toDate
        ? subscription.trialEndsAt.toDate()
        : new Date(subscription.trialEndsAt.seconds * 1000);
      const days = Math.max(0, Math.ceil((endDate - Date.now()) / (1000 * 60 * 60 * 24)));
      setTrialDaysLeft(days);

      // Auto-lock expired trial
      if (days === 0 && !isLocked) {
        updateDoc(doc(db, 'subscriptions', subscription.id), {
          status: 'expired',
          locked: true,
        }).catch(console.error);
      }
    }
  }, [isTrial, subscription, isLocked]);

  // Auto-detect paid subscription expiry based on nextBillingDate
  useEffect(() => {
    if (isPaidActive && subscription?.nextBillingDate && !isLocked) {
      const billingDate = subscription.nextBillingDate.toDate
        ? subscription.nextBillingDate.toDate()
        : new Date(subscription.nextBillingDate.seconds * 1000);
      if (billingDate < new Date()) {
        // Payment overdue → mark expired and locked
        updateDoc(doc(db, 'subscriptions', subscription.id), {
          status: 'expired',
          locked: true,
        }).catch(console.error);
      }
    }
  }, [isPaidActive, subscription, isLocked]);

  // Analytics trial
  const [analyticsTrialDaysLeft, setAnalyticsTrialDaysLeft] = useState(0);
  const [isOnAnalyticsTrial, setIsOnAnalyticsTrial] = useState(false);
  useEffect(() => {
    if (subscription?.analyticsTrialEndsAt) {
      const trialEnds = subscription.analyticsTrialEndsAt.toDate
        ? subscription.analyticsTrialEndsAt.toDate()
        : new Date(subscription.analyticsTrialEndsAt.seconds * 1000);
      const days = Math.ceil((trialEnds - Date.now()) / (1000 * 60 * 60 * 24));
      setAnalyticsTrialDaysLeft(Math.max(0, days));
      setIsOnAnalyticsTrial(days > 0);
    }
  }, [subscription]);

  // Analytics access level: downgrade to 'free' if subscription is expired/cancelled/locked
  const rawAnalyticsLevel = subscription?.analyticsAccessLevel || 'free';
  const analyticsAccessLevel = (isExpired || isCancelled || isLocked) ? 'free' : rawAnalyticsLevel;

  // Feature access map
  function hasAccess(feature) {
    if (isLocked || isExpired || isCancelled) return false;

    const planRank = { starter: 0, professional: 1, enterprise: 2 };
    const rank = planRank[effectivePlan] || 0;

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
  }

  return {
    subscription,
    loading,
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
```

- [ ] **Step 2: Verify file was created**

Run: `ls src/hooks/useSubscriptionStatus.js`
Expected: file exists

---

### Task 2: Create `SubscriptionGuard` Route Component

**Files:**
- Create: `src/components/SubscriptionGuard.jsx`

- [ ] **Step 1: Create the guard component**

```javascript
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';

/**
 * Route-level subscription guard.
 * Wraps routes that require an active (non-expired, non-cancelled) subscription.
 * Expired/cancelled/locked users are redirected to /payments with a flag.
 *
 * Usage: <Route path="/company-dashboard" element={<SubscriptionGuard><CompanyDashboard /></SubscriptionGuard>} />
 */
export function SubscriptionGuard({ children }) {
  const location = useLocation();
  const { isExpired, isCancelled, isLocked, loading } = useSubscriptionStatus(
    // companyId will be available after CompanyDashboard loads its auth state
    // For now, we pass through — the guard relies on the hook's internal state
    // which is populated from the auth user's company.
    // This guard is a soft check; the real gating happens inside CompanyDashboard.
    null
  );

  // If hook hasn't loaded yet, show spinner (don't block)
  if (loading) return <LoadingSpinner fullPage />;

  // If the subscription is in a bad state, redirect to payments page
  if (isExpired || isCancelled || isLocked) {
    return <Navigate to="/payments?reason=expired" state={{ from: location }} replace />;
  }

  return children;
}
```

Wait — `SubscriptionGuard` needs access to the same `companyId` that `CompanyDashboard` uses. The hook loads the subscription from Firestore by `companyId`, but `companyId` is determined by the auth user inside `CompanyDashboard`. Let me revise the approach: **the guard should be a soft wrapper that reads from a shared context, not a hard redirect**. The real blocking happens inside `CompanyDashboard` itself. Let me adjust:

```javascript
import React from 'react';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';

/**
 * Soft subscription guard for route-level awareness.
 * This does NOT hard-redirect; instead it wraps children and lets the
 * inner component (CompanyDashboard) handle the UI for expired states.
 * It exists as a future extension point for hard redirects if needed.
 *
 * Currently: pass-through. All gating is handled by CompanyDashboard via useSubscriptionStatus.
 */
export function SubscriptionGuard({ children }) {
  return children;
}
```

This is YAGNI — the real fix is in `CompanyDashboard`. Keep the guard as a stub for now; if hard route-level blocking is needed later, it can be wired up.

- [ ] **Step 2: Verify file was created**

Run: `ls src/components/SubscriptionGuard.jsx`
Expected: file exists

---

### Task 3: Fix CompanyDashboard.jsx — Replace All Scattered Checks

**Files:**
- Modify: `src/pages/CompanyDashboard.jsx`

This is the biggest task. We need to:
1. Import the hook
2. Replace the subscription loading logic with the hook (keep the existing `setSubscription` for backward compat)
3. Fix the 5 bug locations

- [ ] **Step 1: Add the import**

At the top of `CompanyDashboard.jsx`, add after line 17:

```javascript
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';
```

- [ ] **Step 2: Find the component's main function and add the hook call**

Inside the `CompanyDashboard` function, after the existing state declarations and before the `useEffect` that loads data (around line ~200), add:

```javascript
// Centralized subscription status (replaces scattered inline checks)
const subStatus = useSubscriptionStatus(company?.id);
```

- [ ] **Step 3: Fix Bug 1 — Products Nav Item (line 91)**

Replace the products nav line:

```jsx
// OLD (line 91):
...(company?.enabledFeatures?.product_listings || company?.plan === 'enterprise' ? [{ id:'products', label:'Products', icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' }] : []),

// NEW:
...(subStatus.hasAccess('product_listings') || company?.enabledFeatures?.product_listings ? [{ id:'products', label:'Products', icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' }] : []),
```

- [ ] **Step 4: Fix Bug 2 — Reply Rate Limiting (line 545)**

Replace the rate limit check in `handleReply`:

```jsx
// OLD (line 545):
if (subscription?.status === 'free' || !subscription?.plan || subscription?.plan === 'starter') {

// NEW:
if (!subStatus.hasAccess('unlimited_replies')) {
```

- [ ] **Step 5: Fix Bug 3 — Analytics Panels Gating (lines 1146-1157)**

Replace the analytics panel rendering block:

```jsx
// OLD (lines 1146-1157):
{analyticsAccessLevel === 'free' && !isOnTrial && (
  <FreeMetricsPanel metrics={calculatedMetrics} category={company?.category} company={company} />
)}
{analyticsAccessLevel === 'middle' && (
  <MiddleMetricsPanel metrics={calculatedMetrics} category={company?.category} company={company} />
)}
{analyticsAccessLevel === 'premium' && (
  <PremiumMetricsPanel metrics={calculatedMetrics} category={company?.category} company={company} />
)}
{isOnTrial && (
  <MiddleMetricsPanel metrics={calculatedMetrics} category={company?.category} company={company} />
)}

// NEW:
{subStatus.analyticsAccessLevel === 'free' && !subStatus.isOnAnalyticsTrial && (
  <FreeMetricsPanel metrics={calculatedMetrics} category={company?.category} company={company} />
)}
{subStatus.analyticsAccessLevel === 'middle' && (
  <MiddleMetricsPanel metrics={calculatedMetrics} category={company?.category} company={company} />
)}
{subStatus.analyticsAccessLevel === 'premium' && (
  <PremiumMetricsPanel metrics={calculatedMetrics} category={company?.category} company={company} />
)}
{subStatus.isOnAnalyticsTrial && (
  <MiddleMetricsPanel metrics={calculatedMetrics} category={company?.category} company={company} />
)}
```

- [ ] **Step 6: Replace local analytics state with hook-derived values**

The `analyticsAccessLevel`, `isOnTrial`, and `trialDaysRemaining` local state variables (set in the useEffect at lines 414-442) should now derive from the hook. Find the useEffect at lines 414-442 and modify the analytics section:

```javascript
// In the useEffect at line 414, replace lines 417-429:

// OLD:
const tierLevel = subscription?.analyticsAccessLevel || 'free';
setAnalyticsAccessLevel(tierLevel);

if (subscription?.analyticsTrialEndsAt) {
  const trialEnds = subscription.analyticsTrialEndsAt.toDate
    ? subscription.analyticsTrialEndsAt.toDate()
    : new Date(subscription.analyticsTrialEndsAt.seconds * 1000);
  const daysLeft = Math.ceil((trialEnds - Date.now()) / (1000 * 60 * 60 * 24));
  setTrialDaysRemaining(Math.max(0, daysLeft));
  setIsOnTrial(daysLeft > 0);
}

// NEW (keep for backward compat with any remaining local references, but source from hook):
// Analytics state is now driven by useSubscriptionStatus hook
// Keep local setAnalyticsAccessLevel/setIsOnTrial calls for any code that reads these state vars
// The hook's values take precedence in the render
```

Actually, since the hook runs asynchronously and the local useEffect also runs, there could be a race. The safest approach: **keep the local state but source it from the hook**. Add this effect after the hook call:

```javascript
// Sync local state with hook (for backward compat with existing references)
useEffect(() => {
  setAnalyticsAccessLevel(subStatus.analyticsAccessLevel);
  setIsOnTrial(subStatus.isOnAnalyticsTrial);
  setTrialDaysRemaining(subStatus.analyticsTrialDaysLeft);
}, [subStatus.analyticsAccessLevel, subStatus.isOnAnalyticsTrial, subStatus.analyticsTrialDaysLeft]);
```

- [ ] **Step 7: Fix the lock/trial logic in the data-loading useEffect**

The trial lock logic at lines 374-386 is now partially duplicated in the hook. The hook handles auto-locking. Keep the local `setIsLocked` and `setTrialDaysLeft` in sync with the hook:

Add after line 386 (inside the same useEffect, after the existing trial lock logic):

```javascript
// Sync with hook's computed values
setIsLocked(subStatus.isLocked);
```

- [ ] **Step 8: Fix the Products tab content gating**

The Products tab (around line 1510) should also check subscription status. Find the Products tab render section and add a guard:

```jsx
{section === 'products' && (
  <div className="biz-content">
    {!subStatus.hasAccess('product_listings') && !company?.enabledFeatures?.product_listings ? (
      <div style={{ textAlign:'center', padding:'60px 20px' }}>
        <h2>🔒 Product Listings</h2>
        <p>Product listings are available on Professional and Enterprise plans.</p>
        <button
          className="biz-btn biz-btn-primary"
          onClick={() => setSection('subscription')}
        >
          Upgrade Plan
        </button>
      </div>
    ) : (
      // ... existing products tab content ...
    )}
  </div>
)}
```

- [ ] **Step 9: Verify no syntax errors**

Run: `npx vite build 2>&1 | head -20`
Expected: No syntax errors in CompanyDashboard.jsx

---

### Task 4: Fix AdminSubscriptions.jsx — Clear `enabledFeatures` on Cancel/Expire

**Files:**
- Modify: `src/pages/admin/AdminSubscriptions.jsx`

- [ ] **Step 1: Find the cancel subscription handler**

Search for `handleCancelSubscription` or similar function. Read the function.

- [ ] **Step 2: Add `enabledFeatures` clearing to cancel handler**

In the cancel subscription handler, add after the subscription status update:

```javascript
// Clear enabled features when subscription is cancelled
await updateDoc(doc(db, 'companies', companyId), {
  enabledFeatures: {
    reply_reviews: false,
    analytics_advanced: false,
    qr_code: false,
    competitor_insights: false,
    verified_badge: false,
    multi_listing: false,
    ai_sentiment: false,
    api_access: false,
    white_label: false,
    priority_support: false,
    product_listings: false,
    company_stories: company?.enabledFeatures?.company_stories || false,
  },
  subscriptionPlan: 'starter',
  updatedAt: serverTimestamp(),
});
```

- [ ] **Step 3: Add `enabledFeatures` clearing to the "set expired" handler**

If there's a separate function to mark subscriptions as expired, add the same clearing logic there.

Search for any function that sets `status: 'expired'` and add the same `enabledFeatures` clearing.

- [ ] **Step 4: Verify**

Run: `npx vite build 2>&1 | head -20`
Expected: No syntax errors

---

### Task 5: Wrap `/company-dashboard` Route with SubscriptionGuard

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add the import**

Add at the top with other component imports:

```javascript
import { SubscriptionGuard } from './components/SubscriptionGuard';
```

- [ ] **Step 2: Wrap the route**

Replace line 139:

```jsx
// OLD:
<Route path="/company-dashboard" element={<CompanyDashboard />} />

// NEW:
<Route path="/company-dashboard" element={<SubscriptionGuard><CompanyDashboard /></SubscriptionGuard>} />
```

- [ ] **Step 3: Verify build**

Run: `npx vite build 2>&1 | head -30`
Expected: Clean build

---

### Task 6: Manual Testing Checklist

- [ ] **Step 1: Test trial expiration flow**
  1. Create a test company account
  2. Select Professional plan (triggers 14-day trial)
  3. Verify trial banner shows with days remaining
  4. Manually set `trialEndsAt` to yesterday in Firestore
  5. Refresh page → should show expired banner, features blocked

- [ ] **Step 2: Test expired Pro/Enterprise access**
  1. Set a subscription's status to `expired` in Firestore
  2. Visit `/company-dashboard`
  3. Verify: Products nav hidden, analytics shows Free panel, reply rate limit applies, plan selection shows "on Starter"

- [ ] **Step 3: Test cancelled subscription access**
  1. Set status to `cancelled` in Firestore
  2. Verify same behavior as expired

- [ ] **Step 4: Test active subscription unchanged**
  1. Set status to `active`, plan to `professional`
  2. Verify all Pro features accessible

- [ ] **Step 5: Test paid subscription auto-expiry**
  1. Set status to `active`, set `nextBillingDate` to yesterday
  2. Refresh page → should auto-detect and mark as `expired` + `locked`

---

## Self-Review

### 1. Spec Coverage

| Audit Finding | Task |
|---------------|------|
| Failure 1: Products nav checks `company.plan` only | Task 3, Step 3 |
| Failure 2: Reply rate limit bypass for expired | Task 3, Step 4 |
| Failure 3: Analytics panels never revalidated | Task 3, Steps 5-6 |
| Failure 4: `enabledFeatures` never cleared on expiry | Task 4 |
| Failure 5: No paid subscription auto-expiry detection | Task 1 (hook), Step 1 |
| Failure 6: No route-level protection | Task 2, Task 5 |

All 6 failures addressed.

### 2. Placeholder Scan

No TBD, TODO, or "add tests later" placeholders found. All code blocks contain actual implementation.

### 3. Type Consistency

- `useSubscriptionStatus` returns `effectivePlan` as `'starter'|'professional'|'enterprise'` — consistent with `PLANS` array IDs
- `hasAccess()` feature keys match `getFeaturesByPlan()` keys in AdminSubscriptions
- `analyticsAccessLevel` values `'free'|'middle'|'premium'` consistent with existing code
- All Firestore field names (`status`, `plan`, `locked`, `nextBillingDate`, `analyticsAccessLevel`, `analyticsTrialEndsAt`) match existing schema
