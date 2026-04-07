import { useEffect } from 'react';

/**
 * LiveChat — integrates Tawk.to free live chat widget.
 * Replace TAWK_PROPERTY_ID and TAWK_WIDGET_ID with values from
 * your Tawk.to dashboard at https://tawk.to (free, no credit card).
 *
 * Setup steps:
 * 1. Go to tawk.to → Sign up free
 * 2. Create a property for "Irema"
 * 3. Copy your Property ID and Widget ID from Administration → Channels → Chat Widget
 * 4. Replace the placeholders below
 */
const TAWK_PROPERTY_ID = 'YOUR_PROPERTY_ID';  // e.g. '64abc123def456789012345'
const TAWK_WIDGET_ID   = 'YOUR_WIDGET_ID';    // e.g. '1hbcdefgh'

export default function LiveChat() {
  useEffect(() => {
    // Don't load if placeholder IDs are still set
    if (TAWK_PROPERTY_ID === 'YOUR_PROPERTY_ID') return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    const s = document.createElement('script');
    s.async = true;
    s.src = `https://embed.tawk.to/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`;
    s.charset = 'UTF-8';
    s.setAttribute('crossorigin', '*');
    document.head.appendChild(s);

    return () => {
      // Clean up on unmount
      if (window.Tawk_API?.hideWidget) window.Tawk_API.hideWidget();
      document.head.removeChild(s);
    };
  }, []);

  return null; // no visible render — widget injects itself
}
