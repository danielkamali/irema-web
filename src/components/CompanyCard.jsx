import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StarRating from './StarRating';
import { getCategoryLabel, getRatingColor, getRatingLabel } from '../utils/helpers';
import { companyPath } from '../utils/slug';
import { isArchivedRecord } from '../utils/adminModeration';
import './CompanyCard.css';

export default function CompanyCard({ company }) {
  const { t, i18n } = useTranslation();
  if (isArchivedRecord(company)) return null;

  const name = company.companyName || company.name || 'Unknown';
  const rating = company.averageRating || 0;
  const reviews = company.totalReviews || 0;
  const initial = name[0]?.toUpperCase() || '?';

  const scoreLabel = rating > 0 ? getRatingLabel(rating, i18n.language) : null;

  const location = [company.city, company.district].filter(Boolean).join(', ') || company.address || '';
  const reviewsWord = reviews === 1 ? t('profile.review') : t('profile.reviews');
  const metaParts = [getCategoryLabel(company.category, t), location, `${reviews.toLocaleString()} ${reviewsWord}`].filter(Boolean);

  return (
    <Link to={companyPath(company)} className="company-card-link company-row-link">
      <article className="company-row">
        <div className="company-row-score">
          {company.logoUrl
            ? <img src={company.logoUrl} alt={name} className="company-row-score-img" onError={e => { e.target.style.display = 'none'; }} />
            : (rating > 0 ? rating.toFixed(1) : initial)
          }
        </div>
        <div className="company-row-body">
          <div className="company-row-top">
            <span className="company-row-name">{name}</span>
            {company.isVerified && <span className="badge badge-verified" aria-label="Verified">✓</span>}
            <StarRating rating={rating} size={14} />
          </div>
          {scoreLabel && <p className="company-row-desc">{scoreLabel} · {rating > 0 ? rating.toFixed(1) : '—'}</p>}
          <div className="company-row-meta">{metaParts.join(' · ').toUpperCase()}</div>
        </div>
        <div className="company-row-arrow" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      </article>
    </Link>
  );
}
