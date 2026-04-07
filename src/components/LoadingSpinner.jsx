import React from 'react';

export default function LoadingSpinner({ fullPage = false, size = 40 }) {
  const spinner = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
      <svg
        width={size} height={size} viewBox="0 0 44 44" fill="none"
        style={{ animation: 'spin 0.8s linear infinite' }}
        aria-label="Loading"
      >
        <circle cx="22" cy="22" r="18" stroke="var(--border)" strokeWidth="4" />
        <path d="M22 4a18 18 0 0 1 18 18" stroke="var(--teal)" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </div>
  );

  if (fullPage) {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', zIndex: 9999,
      }}>
        {spinner}
      </div>
    );
  }

  return spinner;
}
