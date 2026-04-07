import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';
import AdminLayout from './AdminLayout';
import './AdminPages.css';

const ALL_FEATURES = [
  { key: 'company_stories',   label: 'Company Review Stories', desc: 'Business can post and manage video stories', tier: 'professional' },
  { key: 'advanced_analytics',label: 'Advanced Analytics',     desc: 'Charts, trends, sentiment, competitor insights', tier: 'professional' },
  { key: 'reply_reviews',     label: 'Reply to Reviews',       desc: 'Business owner can reply to customer reviews', tier: 'professional' },
  { key: 'qr_codes',          label: 'QR Code Downloads',      desc: 'Generate and download QR codes for the business', tier: 'professional' },
  { key: 'verified_badge',    label: 'Verified Badge',         desc: 'Show verified checkmark on business profile', tier: 'professional' },
  { key: 'competitor_insights',label: 'Competitor Insights',   desc: 'See how they rank vs similar businesses', tier: 'professional' },
  { key: 'product_listings',  label: 'Product Listings',       desc: 'Post products/menu items on their page', tier: 'enterprise' },
  { key: 'ai_sentiment',      label: 'AI Sentiment Analysis',  desc: 'Automated sentiment scoring on reviews', tier: 'enterprise' },
  { key: 'white_label',       label: 'White-label Widgets',    desc: 'Embeddable review widgets for their website', tier: 'enterprise' },
  { key: 'multi_listing',     label: 'Multi-location (5)',     desc: 'Manage up to 5 business listings', tier: 'enterprise' },
  { key: 'api_access',        label: 'API Access',             desc: 'Programmatic access to review data', tier: 'enterprise' },
];

const TIER_COLOR = { professional: 'teal', enterprise: 'blue' };

export default function AdminFeatures() {
  const { user } = useAuthStore();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [features, setFeatures] = useState({});

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'companies'));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (a.companyName || a.name || '').localeCompare(b.companyName || b.name || ''));
        setCompanies(data);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  function openFeatureEditor(company) {
    setSelectedCompany(company);
    setFeatures({ ...(company.enabledFeatures || {}) });
  }

  async function saveFeatures() {
    if (!selectedCompany) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'companies', selectedCompany.id), {
        enabledFeatures: features,
        featuresUpdatedAt: serverTimestamp(),
        featuresUpdatedBy: user?.email,
      });
      // Audit log
      await addDoc(collection(db, 'audit_logs'), {
        action: 'features_updated',
        detail: `Updated features for ${selectedCompany.companyName || selectedCompany.name}: ${Object.keys(features).filter(k => features[k]).join(', ') || 'none'}`,
        adminEmail: user?.email, timestamp: serverTimestamp(),
      }).catch(() => {});
      // Update local state
      setCompanies(prev => prev.map(c =>
        c.id === selectedCompany.id ? { ...c, enabledFeatures: features } : c
      ));
      setSelectedCompany(prev => ({ ...prev, enabledFeatures: features }));
      showToast(`✓ Features saved for ${selectedCompany.companyName || selectedCompany.name}`);
    } catch (e) { showToast(e.message, 'error'); }
    setSaving(false);
  }

  function enableTier(tier) {
    const tierFeatures = {};
    ALL_FEATURES.forEach(f => {
      if (f.tier === tier || (tier === 'enterprise')) tierFeatures[f.key] = true;
    });
    setFeatures(prev => ({ ...prev, ...tierFeatures }));
  }

  const filtered = companies.filter(c =>
    !search || (c.companyName || c.name || c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const getActiveCount = (company) =>
    Object.values(company.enabledFeatures || {}).filter(Boolean).length;

  return (
    <AdminLayout>
      {toast && <div className={`ap-toast ap-toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '✗'} {toast.msg}</div>}

      <div className="ap-page-header">
        <div>
          <h1 className="ap-page-title">Features Management</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginTop: 4 }}>
            Enable or disable premium features per business
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedCompany ? '1fr 1.2fr' : '1fr', gap: 24 }}>

        {/* Company List */}
        <div className="ap-table-wrap">
          <div className="ap-table-toolbar">
            <div className="ap-table-search">
              <svg className="ap-table-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input placeholder="Search businesses…" value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
          </div>
          <table className="ap-table">
            <thead><tr><th>Business</th><th>Category</th><th>Features</th><th>Action</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="ap-loading-cell"><div className="ap-spinner"/></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="4" className="ap-empty">No businesses found</td></tr>
              ) : filtered.map(company => (
                <tr key={company.id} className={`ap-tr-hover${selectedCompany?.id === company.id ? ' ap-row-selected' : ''}`}>
                  <td>
                    <div className="ap-table-user">
                      <div className="ap-table-avatar">{(company.companyName || company.name || 'B')[0].toUpperCase()}</div>
                      <div>
                        <div className="ap-table-name">{company.companyName || company.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-4)' }}>{company.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="ap-badge gray">{company.category || 'other'}</span></td>
                  <td>
                    <span className={`ap-badge ${getActiveCount(company) > 0 ? 'teal' : 'gray'}`}>
                      {getActiveCount(company)} active
                    </span>
                  </td>
                  <td>
                    <button className="ap-btn ap-btn-sm ap-btn-primary" onClick={() => openFeatureEditor(company)}>
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Feature Editor */}
        {selectedCompany && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
                  {selectedCompany.companyName || selectedCompany.name}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-4)', margin: '4px 0 0' }}>{selectedCompany.email}</p>
              </div>
              <button className="ap-modal-close" onClick={() => setSelectedCompany(null)}>✕</button>
            </div>

            {/* Quick enable tier buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <button className="ap-btn ap-btn-sm ap-btn-secondary" onClick={() => setFeatures({})}>Clear All</button>
              <button className="ap-btn ap-btn-sm" style={{ background: 'rgba(45,143,111,0.15)', color: 'var(--brand)', border: '1px solid var(--brand-light)' }}
                onClick={() => enableTier('professional')}>
                ✓ Enable Professional
              </button>
              <button className="ap-btn ap-btn-sm" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}
                onClick={() => enableTier('enterprise')}>
                ✓ Enable Enterprise
              </button>
            </div>

            {/* Feature toggles grouped by tier */}
            {['professional', 'enterprise'].map(tier => (
              <div key={tier} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: tier === 'professional' ? 'var(--brand)' : '#60a5fa', marginBottom: 10 }}>
                  {tier === 'professional' ? '⭐ Professional Features' : '🚀 Enterprise Features'}
                </div>
                {ALL_FEATURES.filter(f => f.tier === tier).map(feature => (
                  <label key={feature.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '10px 14px', borderRadius: 10,
                    background: features[feature.key] ? 'var(--brand-xlight)' : 'var(--bg)',
                    border: `1px solid ${features[feature.key] ? 'var(--brand-light)' : 'var(--border)'}`,
                    marginBottom: 8, cursor: 'pointer', transition: 'all 0.15s' }}>
                    <input type="checkbox" checked={!!features[feature.key]}
                      onChange={e => setFeatures(prev => ({ ...prev, [feature.key]: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: 'var(--brand)', marginTop: 2, flexShrink: 0 }}/>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-1)' }}>{feature.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>{feature.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            ))}

            <div className="ap-modal-actions" style={{ marginTop: 0 }}>
              <button className="ap-btn ap-btn-secondary" onClick={() => setSelectedCompany(null)}>Cancel</button>
              <button className="ap-btn ap-btn-primary" onClick={saveFeatures} disabled={saving}>
                {saving ? 'Saving…' : 'Save Features'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
