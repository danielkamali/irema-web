import React from 'react';

export default function EmptyState({
  icon = '📭',
  title = 'Nothing here yet',
  message = 'Get started by creating your first item',
  action = null,
  compact = false
}) {
  return (
    <div style={{
      textAlign: 'center',
      padding: compact ? '32px 24px' : '60px 40px',
      background: 'var(--bg-2)',
      borderRadius: '12px',
      border: '2px dashed var(--border)',
      color: 'var(--text-3)'
    }}>
      <div style={{
        fontSize: compact ? '2.5rem' : '3.5rem',
        marginBottom: '16px',
        opacity: 0.8
      }}>
        {icon}
      </div>

      <h3 style={{
        fontFamily: 'var(--font-display)',
        fontSize: compact ? '1rem' : '1.2rem',
        fontWeight: 700,
        color: 'var(--text-1)',
        margin: '0 0 8px 0'
      }}>
        {title}
      </h3>

      <p style={{
        fontSize: compact ? '0.85rem' : '0.95rem',
        color: 'var(--text-2)',
        margin: '0 0 24px 0',
        lineHeight: 1.5
      }}>
        {message}
      </p>

      {action && (
        <button
          onClick={action.onClick}
          style={{
            background: 'var(--brand)',
            color: 'white',
            border: 'none',
            padding: compact ? '8px 16px' : '10px 24px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: compact ? '0.85rem' : '0.9rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.opacity = '0.9'}
          onMouseLeave={(e) => e.target.style.opacity = '1'}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
