import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import StarRating from './StarRating';
import { formatRelativeTime, getInitials } from '../utils/helpers';
import { companyPath } from '../utils/slug';

// Avatar palette shared with other review cards for consistency
const AVATAR_COLORS = ['#2d8f6f','#0ea5e9','#8b5cf6','#f59e0b','#ef4444','#14b8a6','#ec4899'];
function avatarColor(name) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

/**
 * ReviewDetailModal — a read-only deep-view of a single review, used from
 * the homepage and dashboards when a user clicks "View Review". The modal
 * deliberately does NOT redirect to the business page on open — instead it
 * surfaces a "Go to business page" button so the user can opt into the jump.
 *
 * Props:
 *   review          – the review doc ({ id, userName, userPhotoURL, rating,
 *                     comment, images[], createdAt, companyId, companySlug,
 *                     companyName, companyLogoUrl, replies[] })
 *   onClose         – close handler
 *   onGoToBusiness  – optional override for the "go to business" action
 *                     (defaults to navigate(companyPath(review)))
 */
export default function ReviewDetailModal({ review, onClose, onGoToBusiness }) {
  const navigate = useNavigate();
  const [lightbox, setLightbox] = useState(null);

  if (!review) return null;

  const name = review.userName || review.userEmail?.split('@')[0] || 'Anonymous';
  const color = avatarColor(name);
  const comment = review.comment || '';
  const images = review.images || [];
  const replies = review.replies || [];
  const reactions = review.reactions || {};

  function goToBusiness() {
    if (onGoToBusiness) {
      onGoToBusiness();
      return;
    }
    // Prefer the canonical slug URL; fall back to legacy id route.
    const targetCompany = {
      id: review.companyId,
      slug: review.companySlug || null,
    };
    const path = targetCompany.slug
      ? `/business/${targetCompany.slug}`
      : targetCompany.id ? `/company/${targetCompany.id}` : '/';
    onClose && onClose();
    navigate(path);
  }

  const modal = (
    <>
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
            zIndex: 10001, display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'zoom-out',
          }}
        >
          <img
            src={lightbox}
            alt=""
            style={{ maxWidth: '92vw', maxHeight: '90vh', borderRadius: 10, objectFit: 'contain' }}
          />
        </div>
      )}

      <div
        onClick={e => e.target === e.currentTarget && onClose && onClose()}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 10000, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)',
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Review details"
          style={{
            background: 'var(--surface, white)',
            borderRadius: 20,
            maxWidth: 620,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 28,
            position: 'relative',
            boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
            border: '1px solid var(--border, #e5e7eb)',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute', top: 14, right: 14,
              width: 32, height: 32, borderRadius: '50%',
              border: '1px solid var(--border, #e5e7eb)',
              background: 'var(--bg, #f9fafb)',
              cursor: 'pointer', fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-2, #374151)',
            }}
          >
            ✕
          </button>

          {/* Reviewer header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, paddingRight: 38 }}>
            {review.userPhotoURL
              ? <img
                  src={review.userPhotoURL}
                  alt={name}
                  style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
              : <div
                  style={{
                    width: 48, height: 48, borderRadius: '50%', background: color,
                    color: 'white', fontWeight: 700, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  {getInitials(name)}
                </div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-1, #111827)', fontSize: '1rem' }}>{name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-4, #9ca3af)' }}>
                {formatRelativeTime(review.createdAt)}
              </div>
            </div>
            <StarRating rating={review.rating || 0} size={18} />
          </div>

          {/* Review body */}
          {comment && (
            <div style={{
              fontSize: '0.95rem', lineHeight: 1.7,
              color: 'var(--text-2, #374151)', whiteSpace: 'pre-wrap',
              marginBottom: 14,
            }}>
              {comment}
            </div>
          )}

          {/* Images */}
          {images.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`review photo ${i + 1}`}
                  onClick={() => setLightbox(src)}
                  style={{
                    width: 110, height: 80, borderRadius: 10,
                    objectFit: 'cover', cursor: 'zoom-in',
                    border: '1px solid var(--border, #e5e7eb)',
                  }}
                />
              ))}
            </div>
          )}

          {/* Reaction counts — read-only summary */}
          {(reactions.helpful || reactions.thanks || reactions.love) > 0 && (
            <div style={{
              display: 'flex', gap: 10, flexWrap: 'wrap',
              paddingTop: 14, marginTop: 2, marginBottom: 14,
              borderTop: '1px solid var(--border, #f3f4f6)',
            }}>
              {reactions.helpful > 0 && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-3, #6b7280)' }}>
                  👍 {reactions.helpful} helpful
                </span>
              )}
              {reactions.thanks > 0 && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-3, #6b7280)' }}>
                  🙏 {reactions.thanks} thanks
                </span>
              )}
              {reactions.love > 0 && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-3, #6b7280)' }}>
                  ❤ {reactions.love} love
                </span>
              )}
            </div>
          )}

          {/* Replies summary */}
          {replies.length > 0 && (
            <div style={{
              padding: 12, marginBottom: 16, borderRadius: 10,
              background: 'var(--bg, #f9fafb)', border: '1px solid var(--border, #f3f4f6)',
            }}>
              <div style={{
                fontSize: '0.7rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.07em',
                color: 'var(--text-4, #9ca3af)', marginBottom: 8,
              }}>
                {replies.length} {replies.length === 1 ? 'Response' : 'Responses'}
              </div>
              {replies.slice(0, 3).map((r, i) => (
                <div key={i} style={{ marginBottom: i === replies.slice(0,3).length - 1 ? 0 : 8 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-2, #374151)' }}>
                    {r.userName || (r.by === 'business' ? 'Business' : r.by === 'admin' ? 'Admin' : 'User')}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-3, #6b7280)', lineHeight: 1.5 }}>
                    {r.text || r.content}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Company row */}
          {(review.companyName || review.companyLogoUrl) && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10,
              background: 'var(--bg-2, #f3f4f6)', marginBottom: 14,
            }}>
              {review.companyLogoUrl
                ? <img
                    src={review.companyLogoUrl}
                    alt=""
                    style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }}
                  />
                : <div style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: 'var(--brand-xlight, #d1fae5)',
                    color: 'var(--brand, #2d8f6f)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.8rem',
                  }}>
                    {(review.companyName || '?')[0]?.toUpperCase()}
                  </div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-4, #9ca3af)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Review for
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1, #111827)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {review.companyName}
                </div>
              </div>
            </div>
          )}

          {/* Go to business */}
          <button
            onClick={goToBusiness}
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--brand, #2d8f6f)',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontFamily: 'inherit',
            }}
          >
            Take me to business page
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );

  if (typeof document === 'undefined') return null;
  return ReactDOM.createPortal(modal, document.body);
}
