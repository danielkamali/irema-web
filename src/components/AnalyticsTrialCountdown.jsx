import React from 'react';

/**
 * Analytics Trial Countdown Component
 * Shows remaining trial days and upgrade CTA
 */
export default function AnalyticsTrialCountdown({ daysRemaining = 14, onUpgradeClick }) {
  const getCountdownColor = () => {
    if (daysRemaining <= 0) return '#ef4444';
    if (daysRemaining <= 3) return '#f59e0b';
    return '#2d8f6f';
  };

  const getCountdownIcon = () => {
    if (daysRemaining <= 0) return '⏰';
    if (daysRemaining <= 3) return '⚠️';
    return '🎁';
  };

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${getCountdownColor()} 0%, ${getCountdownColor()}dd 100%)`,
        color: 'white',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        boxShadow: `0 4px 12px ${getCountdownColor()}33`,
      }}
    >
      {/* Left Section - Message */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: '24px' }}>{getCountdownIcon()}</span>
          <span style={{ fontSize: '18px', fontWeight: 700 }}>
            {daysRemaining > 0
              ? `Free Analytics Trial: ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`
              : 'Trial Expired'}
          </span>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: '0.95rem',
            opacity: 0.95,
            lineHeight: '1.5',
          }}
        >
          {daysRemaining > 0
            ? 'Your analytics trial gives you full access to advanced metrics, sentiment analysis, and competitive benchmarking. Upgrade anytime to maintain access after trial ends.'
            : 'Your free trial has expired. Upgrade to continue accessing premium analytics and insights.'}
        </p>
      </div>

      {/* Right Section - Countdown Circle + Button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, minWidth: 120 }}>
        {/* Countdown Circle */}
        <div
          style={{
            position: 'relative',
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, lineHeight: 1 }}>
              {daysRemaining > 0 ? daysRemaining : '0'}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.9, marginTop: 2 }}>
              {daysRemaining > 0 ? 'days left' : 'expired'}
            </div>
          </div>
        </div>

        {/* Upgrade Button */}
        <button
          onClick={onUpgradeClick}
          style={{
            background: 'white',
            color: getCountdownColor(),
            border: 'none',
            padding: '8px 16px',
            borderRadius: 6,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
          onMouseEnter={e => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
          }}
          onMouseLeave={e => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
          }}
        >
          Upgrade Now →
        </button>
      </div>
    </div>
  );
}
