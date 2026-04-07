import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Footer.css';

function FooterLogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 60 60" fill="none" aria-hidden="true">
      <rect width="60" height="60" rx="14" fill="url(#footerLogoGrad)"/>
      <defs>
        <linearGradient id="footerLogoGrad" x1="0" y1="0" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1f6b52"/>
          <stop offset="100%" stopColor="#164d3b"/>
        </linearGradient>
      </defs>
      <polygon points="30,8 34.5,21.5 49,21.5 37.5,30 41.5,43.5 30,35 18.5,43.5 22.5,30 11,21.5 25.5,21.5" fill="#E8B800"/>
      <polygon points="30,13 33.2,22.8 43.5,22.8 35.4,28.8 38.2,38.5 30,33 21.8,38.5 24.6,28.8 16.5,22.8 26.8,22.8" fill="rgba(255,255,255,0.2)"/>
      <circle cx="30" cy="27" r="3.5" fill="rgba(255,255,255,0.5)"/>
    </svg>
  );
}

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo" aria-label="Irema home">
              <div className="footer-logo-icon"><FooterLogoMark /></div>
              <span className="footer-logo-text">Irema</span>
            </Link>
            <p className="footer-tagline">
              {t('footer_tagline')}
            </p>
            <div className="footer-social" role="list">
              {[
                { label: 'X (Twitter)', href: 'https://twitter.com/irema_rw', d: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.633L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z' },
                { label: 'LinkedIn', href: 'https://linkedin.com/company/irema-rw', d: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
                { label: 'Facebook', href: 'https://facebook.com/irema.rw', d: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z' },
                { label: 'Instagram', href: 'https://instagram.com/irema.rw', d: 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z M17.5 6.5h.01 M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z' },
              ].map(({ label, href, d }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label={label} role="listitem">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d={d}/>
                  </svg>
                </a>
              ))}
            </div>
            <div className="footer-badge">
              <div className="footer-badge-dot" />
              Rwanda 🇷🇼 Verified Platform
            </div>
          </div>

          {/* Platform */}
          <div className="footer-col">
            <h4 className="footer-col-title">{t('footer_platform')}</h4>
            <Link to="/search" className="footer-link">{t('footer_search')}</Link>
            <Link to="/top-rated" className="footer-link">{t('footer_top_rated')}</Link>
            <Link to="/businesses" className="footer-link">{t('footer_for_business')}</Link>
            <Link to="/scan" className="footer-link">{t('footer_scan_qr')}</Link>
          </div>

          {/* Community */}
          <div className="footer-col">
            <h4 className="footer-col-title">{t('footer_community')}</h4>
            <a href="/" className="footer-link" onClick={e=>{e.preventDefault();window.dispatchEvent(new CustomEvent('irema:openModal',{detail:'writeReview'}));}}>{t('footer_write_review')}</a>
            <Link to="/contact" className="footer-link">{t('footer_help')}</Link>
            <Link to="/blog" className="footer-link">{t('footer_blog')}</Link>
            <Link to="/newsletter" className="footer-link">{t('footer_newsletter')}</Link>
          </div>

          {/* Company */}
          <div className="footer-col">
            <h4 className="footer-col-title">{t('footer_company')}</h4>
            <Link to="/about" className="footer-link">{t('footer_about')}</Link>
            <Link to="/privacy" className="footer-link">{t('footer_privacy')}</Link>
            <Link to="/terms" className="footer-link">{t('footer_terms')}</Link>
            <Link to="/contact" className="footer-link">{t('footer_contact')}</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <p>{t('footer_copyright').replace('{year}', new Date().getFullYear())}</p>
          <div className="footer-bottom-links">
            <Link to="/privacy" className="footer-bottom-link">Privacy</Link>
            <Link to="/terms" className="footer-bottom-link">Terms</Link>
            <Link to="/privacy" className="footer-bottom-link">{t('footer_cookies')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
