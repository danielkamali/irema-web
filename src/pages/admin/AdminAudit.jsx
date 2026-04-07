import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import AdminLayout from './AdminLayout';
import './AdminPages.css';

const ACTION_META = {
  delete_review:  { label:'Review Deleted', cls:'red', icon:'🗑' },
  admin_comment:  { label:'Admin Comment', cls:'blue', icon:'💬' },
  claim_approved: { label:'Claim Approved', cls:'green', icon:'✅' },
  claim_rejected: { label:'Claim Rejected', cls:'red', icon:'❌' },
  user_deleted:   { label:'User Deleted', cls:'red', icon:'👤' },
  biz_verified:   { label:'Business Verified', cls:'green', icon:'✓' },
  biz_deleted:    { label:'Business Deleted', cls:'red', icon:'🏢' },
  default:        { label:'Action', cls:'gray', icon:'📋' },
};

export default function AdminAudit() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'audit_logs'), orderBy('timestamp','desc'), limit(500)));
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch(e) {
        // audit_logs might not exist yet — seed with empty
        console.log('No audit logs yet');
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    let result = [...logs];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l => (l.detail||'').toLowerCase().includes(q) || (l.adminEmail||'').toLowerCase().includes(q));
    }
    if (actionFilter) result = result.filter(l => l.action === actionFilter);
    if (dateFilter) {
      const days = parseInt(dateFilter);
      const cutoff = Date.now() - days * 86400000;
      result = result.filter(l => {
        const ts = l.timestamp?.seconds ? l.timestamp.seconds*1000 : l.timestamp?.toDate?.()?.getTime?.() || 0;
        return ts >= cutoff;
      });
    }
    setFiltered(result);
  }, [search, actionFilter, dateFilter, logs]);

  const formatTs = ts => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds*1000);
    return d.toLocaleString();
  };

  const uniqueActions = [...new Set(logs.map(l=>l.action).filter(Boolean))];

  return (
    <AdminLayout>
      <div className="ap-page-header">
        <h1 className="ap-page-title">{t('admin.audit_title')||'Audit Trail'}</h1>
        <button className="ap-btn ap-btn-secondary" onClick={() => { setSearch(''); setActionFilter(''); setDateFilter(''); }}>
          ↺ Reset
        </button>
      </div>

      <div className="ap-table-wrap">
        <div className="ap-table-toolbar ap-toolbar-multi">
          <div className="ap-table-search">
            <svg className="ap-table-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input placeholder={t('admin.search_audit')||'Search audit logs…'} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="ap-filter-select" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
            <option value="">All Actions</option>
            {uniqueActions.map(a => <option key={a} value={a}>{ACTION_META[a]?.label || a}</option>)}
          </select>
          <select className="ap-filter-select" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
            <option value="">All Time</option>
            <option value="1">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <span className="ap-count-badge">{filtered.length} entries</span>
        </div>

        <table className="ap-table">
          <thead><tr><th>Time</th><th>{t('admin.action')||'Action'}</th><th>{t('admin.admin')||'Admin'}</th><th>Details</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan="4" className="ap-loading-cell">Loading…</td></tr>
            : filtered.length === 0 ? (
              <tr><td colSpan="4" className="ap-empty">
                {logs.length === 0 ? 'No audit logs yet — actions will be logged here automatically.' : 'No logs match your filters.'}
              </td></tr>
            )
            : filtered.map(log => {
              const meta = ACTION_META[log.action] || ACTION_META.default;
              return (
                <tr key={log.id}>
                  <td className="ap-td-date" style={{ whiteSpace:'nowrap', fontSize:'0.78rem' }}>{formatTs(log.timestamp)}</td>
                  <td><span className={`ap-badge ${meta.cls}`}>{meta.icon} {meta.label}</span></td>
                  <td style={{ fontSize:'0.82rem', color:'var(--muted)' }}>{log.adminEmail || '—'}</td>
                  <td style={{ fontSize:'0.82rem', maxWidth:340, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.detail || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="ap-table-footer">
          <span>Showing {filtered.length} of {logs.length} audit entries</span>
        </div>
      </div>
    </AdminLayout>
  );
}
