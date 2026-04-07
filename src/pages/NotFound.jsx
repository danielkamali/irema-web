import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-8)' }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }} className="animate-up">
        <div style={{ fontSize: '6rem', lineHeight: 1, marginBottom: 'var(--sp-4)' }}>404</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: 'var(--sp-4)' }}>
          Page Not Found
        </div>
        <p style={{ color: 'var(--text-3)', marginBottom: 'var(--sp-8)', fontSize: '1rem' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Go Back</button>
          <Link to="/" className="btn btn-primary">Go Home</Link>
          <Link to="/search" className="btn btn-outline">Search Businesses</Link>
        </div>
      </div>
    </div>
  );
}
