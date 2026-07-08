import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db, collection, query, orderBy, getDocs, doc, getDoc } from '../firebase/config';
import LoadingSpinner from '../components/LoadingSpinner';
import ReviewDetailModal from '../components/ReviewDetailModal';
import './HomePage.css';

/* ── Review card — compact row, same format as homepage ── */
function ReviewCard({ review, onOpen }) {
  const name      = review.companyName || 'Unknown Service';
  const userName  = review.userName   || 'Anonymous';
  const comment   = review.comment    || '';
  const rating    = review.rating     || 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="ir2-review-mini"
      style={{ textAlign:'left', font:'inherit', cursor:'pointer' }}
      aria-label={`View review by ${userName}`}
    >
      <div className="ir2-rm-score">{rating > 0 ? rating.toFixed(1) : '—'}</div>
      <div className="ir2-rm-body">
        <div className="ir2-rm-name">{userName}</div>
        <p className="ir2-rm-comment">{comment.length > 90 ? comment.slice(0, 90) + '…' : comment}</p>
        <div className="ir2-rm-meta">{name.toUpperCase()}</div>
      </div>
    </button>
  );
}

/* ── Grid with load-more ── */
function ReviewGrid({ reviews }) {
  const [shown, setShown] = useState(12);
  const [active, setActive] = useState(null);
  const visible = reviews.slice(0, shown);
  const hasMore = shown < reviews.length;

  return (
    <div className="review-grid-wrap">
      <div className="ir2-review-mini-grid">
        {visible.map((rev, i) => (
          <ReviewCard key={rev.id || i} review={rev} onOpen={() => setActive(rev)} />
        ))}
      </div>
      <div style={{ textAlign:'center', marginTop:32 }}>
        {hasMore && (
          <button
            className="btn btn-outline"
            style={{ padding:'10px 32px', fontSize:'0.9rem', fontWeight:600 }}
            onClick={() => setShown(s => s + 12)}
          >
            Load More Reviews
          </button>
        )}
        {reviews.length > 0 && (
          <p style={{ marginTop:12, fontSize:'0.8rem', color:'var(--text-4)' }}>
            Showing {visible.length} of {reviews.length} reviews
          </p>
        )}
      </div>
      {active && (
        <ReviewDetailModal review={active} onClose={() => setActive(null)} />
      )}
    </div>
  );
}

/* ── Page ── */
export default function AllReviewsPage() {
  const { t } = useTranslation();
  const [reviews, setReviews]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'reviews'), orderBy('createdAt', 'desc'))
        );
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Batch-fetch company logos for the first 20 reviews only (perf)
        const ids = [...new Set(data.slice(0, 20).map(r => r.companyId).filter(Boolean))];
        const logoMap = {};
        await Promise.all(ids.map(async id => {
          try {
            const s = await getDoc(doc(db, 'companies', id));
            if (s.exists()) logoMap[id] = s.data().logoUrl || null;
          } catch {}
        }));

        setReviews(data.map(r => ({ ...r, companyLogoUrl: logoMap[r.companyId] || null })));
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  return (
    <section className="section recent-reviews-section ir2" style={{ paddingTop: 40 }}>
      <div className="container">
        <div className="section-header" style={{ marginBottom: 'var(--sp-7)' }}>
          <div>
            <div className="section-eyebrow">
              <span className="section-eyebrow-dot" />Live
            </div>
            <h2 className="section-title">All Reviews</h2>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : reviews.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px', color:'var(--text-4)' }}>
            No reviews yet. Be the first!
          </div>
        ) : (
          <ReviewGrid reviews={reviews} />
        )}
      </div>
    </section>
  );
}
