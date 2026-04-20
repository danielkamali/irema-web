// src/components/EnvBanner.jsx
// Visible only on non-production environments.
// Renders a small ribbon in the corner so you can SEE which Firebase project
// the running bundle is actually talking to. If you ever open staging and this
// says "PRODUCTION", you've shipped the wrong bundle — stop and redeploy.

import React from 'react';

export default function EnvBanner() {
  const env = import.meta.env.VITE_APP_ENV || 'unknown';
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'unknown';

  // Only show on non-production so real users never see it.
  if (env === 'production') return null;

  const color = env === 'staging' ? '#f59e0b' : '#ef4444';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        left: 12,
        zIndex: 99999,
        background: color,
        color: 'white',
        padding: '6px 10px',
        fontFamily: 'monospace',
        fontSize: 12,
        borderRadius: 6,
        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {env.toUpperCase()} · {projectId}
    </div>
  );
}
