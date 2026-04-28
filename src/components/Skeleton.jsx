import React from 'react';

export default function Skeleton({ width = '100%', height = '20px', count = 1, circle = false, className = '' }) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          style={{
            background: 'linear-gradient(90deg, var(--bg-2) 25%, var(--bg-3) 50%, var(--bg-2) 75%)',
            backgroundSize: '200% 100%',
            animation: 'skeleton-loading 1.5s infinite',
            width: width,
            height: height,
            borderRadius: circle ? '50%' : '6px',
            marginBottom: idx < count - 1 ? '12px' : '0',
            display: 'inline-block'
          }}
          className={className}
        />
      ))}
      <style>{`
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
}

export function SkeletonRow({ columnCount = 3, columnWidths = [] }) {
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
      {Array.from({ length: columnCount }).map((_, idx) => (
        <Skeleton
          key={idx}
          width={columnWidths[idx] || '100%'}
          height="40px"
        />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, columnCount = 4 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, idx) => (
        <SkeletonRow key={idx} columnCount={columnCount} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px'
    }}>
      <Skeleton width="60%" height="24px" />
      <Skeleton width="100%" height="16px" count={3} />
      <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
        <Skeleton width="80px" height="36px" />
        <Skeleton width="80px" height="36px" />
      </div>
    </div>
  );
}
