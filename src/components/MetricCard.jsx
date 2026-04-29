import React from 'react';

/**
 * Reusable Metric Card Component
 * Displays a single metric with icon, label, value, and optional trend
 */
export default function MetricCard({
  icon = '📊',
  label = 'Metric',
  value = '0',
  unit = '',
  subtext = '',
  trend = null,
  color = '#2d8f6f',
  locked = false,
}) {
  return (
    <div
      style={{
        background: locked ? '#f3f4f6' : 'white',
        border: `1px solid ${locked ? '#e5e7eb' : '#e0e0e0'}`,
        borderRadius: 12,
        padding: '20px 16px',
        minWidth: 180,
        position: 'relative',
        opacity: locked ? 0.6 : 1,
        transition: 'all 0.3s ease',
      }}
    >
      {locked && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            fontSize: '18px',
          }}
        >
          🔒
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: '28px' }}>{icon}</span>
        <span
          style={{
            fontSize: '0.85rem',
            color: '#666',
            fontWeight: 500,
          }}
        >
          {label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
        <span
          style={{
            fontSize: '32px',
            fontWeight: 700,
            color: locked ? '#999' : color,
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontSize: '14px',
              color: '#999',
              fontWeight: 500,
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {trend && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '12px',
            fontWeight: 600,
            color: trend > 0 ? '#10b981' : trend < 0 ? '#ef4444' : '#999',
          }}
        >
          <span>{trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}</span>
          <span>{Math.abs(trend)}% from last month</span>
        </div>
      )}

      {subtext && (
        <div
          style={{
            fontSize: '12px',
            color: '#999',
            marginTop: 8,
            fontStyle: 'italic',
          }}
        >
          {subtext}
        </div>
      )}
    </div>
  );
}
