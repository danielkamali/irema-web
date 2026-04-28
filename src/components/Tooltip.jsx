import React, { useState } from 'react';

export default function Tooltip({ text, children, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false);

  const positionStyles = {
    top: {
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: '8px'
    },
    right: {
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginLeft: '8px'
    },
    bottom: {
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: '8px'
    },
    left: {
      right: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginRight: '8px'
    }
  };

  const arrowStyles = {
    top: {
      bottom: '-4px',
      left: '50%',
      transform: 'translateX(-50%)',
      borderTop: '4px solid var(--text-1)',
      borderLeft: '4px solid transparent',
      borderRight: '4px solid transparent'
    },
    right: {
      left: '-4px',
      top: '50%',
      transform: 'translateY(-50%)',
      borderRight: '4px solid var(--text-1)',
      borderTop: '4px solid transparent',
      borderBottom: '4px solid transparent'
    },
    bottom: {
      top: '-4px',
      left: '50%',
      transform: 'translateX(-50%)',
      borderBottom: '4px solid var(--text-1)',
      borderLeft: '4px solid transparent',
      borderRight: '4px solid transparent'
    },
    left: {
      right: '-4px',
      top: '50%',
      transform: 'translateY(-50%)',
      borderLeft: '4px solid var(--text-1)',
      borderTop: '4px solid transparent',
      borderBottom: '4px solid transparent'
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        style={{ display: 'inline-block' }}
      >
        {children}
      </div>

      {isVisible && (
        <div
          style={{
            position: 'absolute',
            ...positionStyles[position],
            background: 'var(--text-1)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            pointerEvents: 'none'
          }}
        >
          {text}
          <div
            style={{
              position: 'absolute',
              ...arrowStyles[position],
              width: 0,
              height: 0
            }}
          />
        </div>
      )}
    </div>
  );
}
