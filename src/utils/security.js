// src/utils/security.js
// Prevents XSS by escaping user-generated content before rendering

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// React renders text as safe by default when using JSX expressions {value}
// Only use escapeHtml when you must use dangerouslySetInnerHTML (avoid where possible)

export function sanitizeUrl(url) {
  if (!url) return '#';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '#';
    return parsed.toString();
  } catch {
    return '#';
  }
}

export function truncate(str, maxLength = 200) {
  if (!str) return '';
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}
