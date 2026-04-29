import React, { useState } from 'react';
import TierComparison from './TierComparison';

/**
 * Analytics Upgrade Prompt
 * Shows upgrade CTA and tier comparison modal
 */
export default function AnalyticsUpgradePrompt({
  currentTier = 'free',
  category = 'restaurant',
  onUpgradeSelect,
}) {
  const [showComparison, setShowComparison] = useState(false);

  const tiers = {
    free: {
      name: 'Free',
      price: 0,
      features: ['Basic metrics', 'Rating & reviews', 'Response rate'],
    },
    middle: {
      name: 'Advanced',
      price: 15000,
      features: [
        'Sentiment analysis',
        'Competitor benchmarking',
        'Trend forecasting',
        'Theme extraction',
      ],
    },
    premium: {
      name: 'Professional',
      price: 45000,
      features: [
        'Everything in Advanced',
        'AI recommendations',
        'Revenue forecasting',
        'Executive reports',
        'Priority support',
      ],
    },
  };

  return (
    <>
      <div
        style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%)',
          border: '2px solid #f59e0b',
          borderRadius: 12,
          padding: '20px 24px',
          marginTop: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Icon */}
        <div style={{ fontSize: '40px', minWidth: 60, textAlign: 'center' }}>💰</div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 4px 0', color: '#92400e', fontSize: '1.1rem' }}>
            Unlock Advanced Analytics
          </h3>
          <p
            style={{
              margin: '0 0 12px 0',
              color: '#78350f',
              fontSize: '0.95rem',
              lineHeight: '1.4',
            }}
          >
            Get sentiment analysis, competitor insights, trend forecasting, and AI-powered recommendations to
            grow your business.
          </p>

          <button
            onClick={() => setShowComparison(true)}
            style={{
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 6,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.95rem',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={e => {
              e.target.style.background = '#d97706';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.target.style.background = '#f59e0b';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            View Plans & Pricing →
          </button>
        </div>
      </div>

      {/* Tier Comparison Modal */}
      {showComparison && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowComparison(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              maxWidth: 900,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '32px 24px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 32,
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#1f2937' }}>
                Analytics Plans & Pricing
              </h2>
              <button
                onClick={() => setShowComparison(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#999',
                }}
              >
                ✕
              </button>
            </div>

            <TierComparison
              currentTier={currentTier}
              category={category}
              onSelectTier={tier => {
                onUpgradeSelect?.(tier);
                setShowComparison(false);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
