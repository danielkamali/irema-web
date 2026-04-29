import React from 'react';
import { getCategoryTierPricing, getEnabledMetrics } from '../utils/analyticsConfig';

/**
 * Tier Comparison Component
 * Shows FREE, MIDDLE, PREMIUM tiers side-by-side with feature comparison and upgrade CTAs
 */
export default function TierComparison({
  currentTier = 'free',
  category = 'restaurant',
  onSelectTier,
}) {
  const pricing = getCategoryTierPricing(category);

  const tiers = [
    {
      id: 'free',
      name: 'Free',
      price: pricing.free,
      period: 'month',
      description: 'Get started with basic analytics',
      highlights: ['Perfect for new businesses', 'No credit card required', '14-day free trial on signup'],
      features: getEnabledMetrics(category, 'free'),
      cta: 'Current Plan',
      ctaDisabled: currentTier === 'free',
    },
    {
      id: 'middle',
      name: 'Advanced',
      price: pricing.middle,
      period: 'month',
      description: 'Advanced insights to grow faster',
      highlights: ['Sentiment analysis', 'Competitor benchmarking', 'Trend forecasting'],
      features: getEnabledMetrics(category, 'middle'),
      cta: currentTier === 'middle' ? 'Current Plan' : 'Upgrade',
      ctaDisabled: currentTier === 'middle',
      recommended: true,
    },
    {
      id: 'premium',
      name: 'Professional',
      price: pricing.premium,
      period: 'month',
      description: 'Enterprise-grade analytics & AI',
      highlights: ['AI-powered recommendations', 'Revenue forecasting', 'Executive reports'],
      features: getEnabledMetrics(category, 'premium'),
      cta: currentTier === 'premium' ? 'Current Plan' : 'Upgrade',
      ctaDisabled: currentTier === 'premium',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 24,
      }}
    >
      {tiers.map(tier => (
        <div
          key={tier.id}
          style={{
            border: tier.recommended ? '2px solid #2d8f6f' : '1px solid #e5e7eb',
            borderRadius: 12,
            padding: '28px 20px',
            background: tier.recommended ? '#f0fdf4' : 'white',
            position: 'relative',
            transition: 'all 0.3s ease',
            transform: tier.recommended ? 'scale(1.02)' : 'scale(1)',
            boxShadow: tier.recommended ? '0 8px 24px rgba(45, 143, 111, 0.15)' : 'none',
          }}
          onMouseEnter={e => {
            if (!tier.recommended) {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }
          }}
          onMouseLeave={e => {
            if (!tier.recommended) {
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          {/* Recommended Badge */}
          {tier.recommended && (
            <div
              style={{
                position: 'absolute',
                top: -12,
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#2d8f6f',
                color: 'white',
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              ⭐ RECOMMENDED
            </div>
          )}

          {/* Tier Name */}
          <h3
            style={{
              margin: '0 0 8px 0',
              fontSize: '1.5rem',
              color: '#1f2937',
              fontWeight: 700,
            }}
          >
            {tier.name}
          </h3>

          <p
            style={{
              margin: '0 0 16px 0',
              color: '#666',
              fontSize: '0.9rem',
              minHeight: '36px',
            }}
          >
            {tier.description}
          </p>

          {/* Price */}
          <div
            style={{
              marginBottom: 20,
              paddingBottom: 20,
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: tier.price > 0 ? '28px' : '36px',
                  fontWeight: 700,
                  color: '#1f2937',
                }}
              >
                {tier.price === 0 ? 'Free' : `${tier.price.toLocaleString()} RWF`}
              </span>
              {tier.price > 0 && (
                <span style={{ color: '#666', fontSize: '0.9rem' }}>/{tier.period}</span>
              )}
            </div>
            {tier.price === 0 && (
              <div style={{ fontSize: '12px', color: '#999' }}>14-day free trial on signup</div>
            )}
          </div>

          {/* Highlights */}
          <div style={{ marginBottom: 20 }}>
            {tier.highlights.map((highlight, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                  fontSize: '0.9rem',
                  color: '#374151',
                }}
              >
                <span style={{ color: '#2d8f6f', fontWeight: 700 }}>✓</span>
                {highlight}
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <button
            onClick={() => !tier.ctaDisabled && onSelectTier?.(tier.id)}
            disabled={tier.ctaDisabled}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 8,
              border: tier.recommended ? 'none' : '1px solid #e5e7eb',
              background: tier.ctaDisabled
                ? '#f3f4f6'
                : tier.recommended
                  ? '#2d8f6f'
                  : 'white',
              color: tier.ctaDisabled ? '#999' : tier.recommended ? 'white' : '#2d8f6f',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: tier.ctaDisabled ? 'default' : 'pointer',
              transition: 'all 0.3s ease',
              marginBottom: 16,
            }}
            onMouseEnter={e => {
              if (!tier.ctaDisabled) {
                e.target.style.background = tier.recommended ? '#1f6b52' : '#f3f4f6';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={e => {
              if (!tier.ctaDisabled) {
                e.target.style.background = tier.recommended ? '#2d8f6f' : 'white';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            {tier.cta}
          </button>

          {/* Feature List */}
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#999',
                marginBottom: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Included Features:
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              {tier.features.slice(0, 8).map((feature, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.85rem',
                    color: '#4b5563',
                  }}
                >
                  <span style={{ color: '#2d8f6f', fontWeight: 700, minWidth: 16 }}>✓</span>
                  <span>{formatFeatureName(feature)}</span>
                </div>
              ))}

              {tier.features.length > 8 && (
                <div
                  style={{
                    fontSize: '0.85rem',
                    color: '#2d8f6f',
                    fontWeight: 600,
                    marginTop: 4,
                    paddingTop: 8,
                    borderTop: '1px solid #e5e7eb',
                  }}
                >
                  +{tier.features.length - 8} more features
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Format metric name for display
 */
function formatFeatureName(feature) {
  return feature
    .split(/(?=[A-Z])/)
    .join(' ')
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
