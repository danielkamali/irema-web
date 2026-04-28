import React from 'react';
import { Link } from 'react-router-dom';

export default function Breadcrumb({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        marginBottom: '20px',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap'
      }}
    >
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && (
            <span style={{ color: 'var(--text-4)', margin: '0 4px' }}>
              /
            </span>
          )}
          {item.href ? (
            <Link
              to={item.href}
              style={{
                color: 'var(--brand)',
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--brand-dark)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--brand)'}
            >
              {item.label}
            </Link>
          ) : (
            <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
