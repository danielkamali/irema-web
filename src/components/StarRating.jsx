import React from 'react';

// Professional SVG star rating component
export default function StarRating({ rating = 0, size = 18, showNumber = false }) {
  return (
    <span className="stars" aria-label={`${rating} out of 5 stars`} role="img" style={{ display:'inline-flex', alignItems:'center', gap: size * 0.08 }}>
      {[1,2,3,4,5].map(i => {
        const filled = rating >= i;
        const half = !filled && rating >= i - 0.5;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
            <defs>
              {half && <linearGradient id={`half${i}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="50%" stopColor="#E8B800"/>
                <stop offset="50%" stopColor="#d4d4d4"/>
              </linearGradient>}
            </defs>
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill={filled ? '#E8B800' : half ? `url(#half${i})` : '#d4d4d4'}
              stroke={filled ? '#D4A000' : half ? '#D4A000' : '#c0c0c0'}
              strokeWidth="0.5"
            />
          </svg>
        );
      })}
      {showNumber && (
        <span style={{ marginLeft: size * 0.35, fontWeight: 700, fontSize: size * 0.85, color: 'var(--text-1)', lineHeight: 1 }}>
          {rating.toFixed(1)}
        </span>
      )}
    </span>
  );
}
