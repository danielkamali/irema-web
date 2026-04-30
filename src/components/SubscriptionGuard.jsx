import React from 'react';

/**
 * Soft subscription guard for route-level awareness.
 * This does NOT hard-redirect; instead it wraps children and lets the
 * inner component (CompanyDashboard) handle the UI for expired states.
 * It exists as a future extension point for hard redirects if needed.
 *
 * Currently: pass-through. All gating is handled by CompanyDashboard via useSubscriptionStatus.
 *
 * Usage: <Route path="/company-dashboard" element={<SubscriptionGuard><CompanyDashboard /></SubscriptionGuard>} />
 */
export function SubscriptionGuard({ children }) {
  return children;
}
