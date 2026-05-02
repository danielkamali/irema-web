import test from 'node:test';
import assert from 'node:assert/strict';
import { getSubscriptionAccess } from './subscriptionAccess.js';

const now = new Date('2026-05-02T10:00:00Z');

test('expired professional trials immediately downgrade to starter access', () => {
  const access = getSubscriptionAccess({
    plan: 'professional',
    status: 'trial',
    locked: false,
    trialEndsAt: new Date('2026-05-01T10:00:00Z'),
    analyticsAccessLevel: 'middle',
  }, now);

  assert.equal(access.isExpired, true);
  assert.equal(access.effectivePlan, 'starter');
  assert.equal(access.analyticsAccessLevel, 'free');
  assert.equal(access.hasAccess('unlimited_replies'), false);
});

test('active paid subscriptions past next billing date immediately lose paid access', () => {
  const access = getSubscriptionAccess({
    plan: 'enterprise',
    status: 'active',
    locked: false,
    nextBillingDate: new Date('2026-05-01T10:00:00Z'),
    analyticsAccessLevel: 'premium',
  }, now);

  assert.equal(access.isExpired, true);
  assert.equal(access.effectivePlan, 'starter');
  assert.equal(access.analyticsAccessLevel, 'free');
  assert.equal(access.hasAccess('product_listings'), false);
});

test('company feature overrides are ignored when subscription is expired', () => {
  const access = getSubscriptionAccess({
    plan: 'enterprise',
    status: 'expired',
    locked: true,
    analyticsAccessLevel: 'premium',
  }, now, {
    enabledFeatures: {
      company_stories: true,
      product_listings: true,
    },
  });

  assert.equal(access.hasAccess('company_stories'), false);
  assert.equal(access.hasAccess('product_listings'), false);
});

test('pending subscriptions do not grant paid access', () => {
  const access = getSubscriptionAccess({
    plan: 'enterprise',
    status: 'pending',
    locked: false,
    analyticsAccessLevel: 'premium',
  }, now);

  assert.equal(access.effectivePlan, 'starter');
  assert.equal(access.analyticsAccessLevel, 'free');
  assert.equal(access.hasAccess('api_access'), false);
});
