import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getRatingLabel } from '../utils/helpers';

export default function StarRatingInput({ value = 0, onChange, size = 36 }) {
  const { i18n } = useTranslation();
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, userSelect: 'none' }}>
      <div style={{ display: 'inline-flex', gap: 6 }} role="radiogroup" aria-label="Star rating">
        {[1,2,3,4,5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            style={{ background:'none', border:'none', cursor:'pointer', padding: 2, lineHeight:1,
              transform: star <= display ? 'scale(1.15)' : 'scale(1)',
              transition: 'transform 0.1s ease',
            }}
          >
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon
                points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                fill={star <= display ? '#E8B800' : '#e0e0e0'}
                stroke={star <= display ? '#D4A000' : '#c8c8c8'}
                strokeWidth="0.5"
                style={{ transition: 'fill 0.1s ease' }}
              />
            </svg>
          </button>
        ))}
      </div>
      {display > 0 && (
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#E8B800', marginLeft: 4 }}>
          {getRatingLabel(display, i18n.language)}
        </span>
      )}
    </div>
  );
}
