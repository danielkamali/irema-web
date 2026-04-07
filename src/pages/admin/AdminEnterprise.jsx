import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';
import AdminLayout from './AdminLayout';
import './AdminPages.css';

const PLAN_OPTIONS = ['free', 'professional', 'enterprise'];
const STATUS_COLOR = { pending: 'yellow', active: 'green', rejected: 'red', contacted: 'blue', expired: 'gray', trial: 'teal' };

export default function AdminEnterprise() {
  const { user } = useAuthStore();
  const [enquiries, setEnquiries] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('enquiries'); // enquiries | subscriptions | all-plans
  const [search, setSearch] = useState('');
  const [viewItem, setViewItem] = useState(null);
  const [editSub, setEditSub] = useState(null);
  const [editSubForm, setEditSubForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    (async () => {
      try {
        const [eSnap, sSnap, cSnap] = await Promise.all([
          getDocs(query(collection(db, 'enterprise_enquiries'), orderBy('createdAt', 'desc'))).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'subscriptions')).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'companies')).catch(() => ({ docs: [] })),
        ]);
        setEnquiries(eSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setSubscriptions(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setCompanies(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const fmt = ts => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : null;
    return d ? d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  };

  async function handleEnquiryAction(enquiry, action) {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'enterprise_enquiries', enquiry.id), {
        status: action, updatedAt: serverTimestamp(), updatedBy: user?.email,
      });
      if (action === 'active') {
        // Create/update subscription record
        const existing = subscriptions.find(s => s.companyId === enquiry.companyId);
        const subData = {
          companyId: enquiry.companyId, businessName: enquiry.companyName,
          adminEmail: enquiry.contactEmail, plan: 'enterprise',
          status: 'active', billingCycle: enquiry.billingCycle || 'monthly',
          amount: enquiry.billingCycle === 'yearly' ? 60000 : 75000,
          activatedAt: serverTimestamp(), activatedBy: user?.email,
          nextBillingDate: (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; })(),
        };
        if (existing) {
          await updateDoc(doc(db, 'subscriptions', existing.id), subData);
        } else {
          await addDoc(collection(db, 'subscriptions'), { ...subData, createdAt: serverTimestamp() });
        }
        // Update company's plan
        if (enquiry.companyId) {
          await updateDoc(doc(db, 'companies', enquiry.companyId), {
            plan: 'enterprise', planActivatedAt: serverTimestamp(),
          }).catch(() => {});
        }
        showToast(`✓ Enterprise plan activated for ${enquiry.companyName}`);
      } else {
        showToast(`Status updated to "${action}"`);
      }
      setEnquiries(prev => prev.map(e => e.id === enquiry.id ? { ...e, status: action } : e));
      setViewItem(null);
      await addDoc(collection(db, 'audit_logs'), {
        action: `enterprise_${action}`,
        detail: `Enterprise enquiry ${action} for ${enquiry.companyName}`,
        adminEmail: user?.email, timestamp: serverTimestamp(),
      }).catch(() => {});
    } catch (e) { showToast(e.message, 'error'); }
    setSaving(false);
  }

  async function saveSubscriptionEdit() {
    if (!editSub) return;
    setSaving(true);
    try {
      const updates = {
        plan: editSubForm.plan, status: editSubForm.status,
        locked: editSubForm.locked,
        updatedAt: serverTimestamp(), updatedBy: user?.email,
      };
      if (editSubForm.trialEndsAt) updates.trialEndsAt = new Date(editSubForm.trialEndsAt);
      if (editSubForm.nextBillingDate) updates.nextBillingDate = new Date(editSubForm.nextBillingDate);
      await updateDoc(doc(db, 'subscriptions', editSub.id), updates);
      // Sync company plan
      if (editSub.companyId) {
        await updateDoc(doc(db, 'companies', editSub.companyId), { plan: editSubForm.plan }).catch(() => {});
      }
      setSubscriptions(prev => prev.map(s => s.id === editSub.id ? { ...s, ...updates } : s));
      setEditSub(null);
      showToast('✓ Subscription updated');
      await addDoc(collection(db, 'audit_logs'), {
        action: 'subscription_edited',
        detail: `Edited subscription for ${editSub.businessName}: plan=${editSubForm.plan}, status=${editSubForm.status}`,
        adminEmail: user?.email, timestamp: serverTimestamp(),
      }).catch(() => {});
    } catch (e) { showToast(e.message, 'error'); }
    setSaving(false);
  }

  const filteredEnquiries = enquiries.filter(e =>
    !search || (e.companyName || e.contactEmail || '').toLowerCase().includes(search.toLowerCase())
  );
  const filteredSubs = subscriptions.filter(s =>
    !search || (s.businessName || s.adminEmail || '').toLowerCase().includes(search.toLowerCase())
  );

  // All companies with their plan status
  const companiesWithPlan = companies.map(c => ({
    ...c,
    sub: subscriptions.find(s => s.companyId === c.id),
  })).filter(c =>
    !search || (c.companyName || c.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      {toast && <div className={`ap-toast ap-toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '✗'} {toast.msg}</div>}

      <div className="ap-page-header">
        <div>
          <h1 className="ap-page-title">Enterprise & Subscriptions</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginTop: 4 }}>
            Manage enterprise enquiries, activate plans, and control subscriptions
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="ap-stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Pending Enquiries', val: enquiries.filter(e => !e.status || e.status === 'pending').length, color: '#e8b800' },
          { label: 'Active Enterprise', val: subscriptions.filter(s => s.plan === 'enterprise' && s.status === 'active').length, color: '#7c3aed' },
          { label: 'Active Trials', val: subscriptions.filter(s => s.status === 'trial').length, color: 'var(--brand)' },
          { label: 'Locked Accounts', val: subscriptions.filter(s => s.locked).length, color: '#ef4444' },
          { label: 'Total Revenue Est.', val: subscriptions.filter(s => s.status === 'active').reduce((a, s) => a + (s.amount || 0), 0).toLocaleString() + ' RWF', color: 'var(--brand)' },
        ].map(k => (
          <div key={k.label} className="ap-stat-card">
            <div className="ap-stat-val" style={{ color: k.color }}>{k.val}</div>
            <div className="ap-stat-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="ap-tabs-row" style={{ marginBottom: 'var(--sp-4)' }}>
        {[['enquiries', 'Enterprise Enquiries', enquiries.length],
          ['subscriptions', 'Subscriptions', subscriptions.length],
          ['all-plans', 'All Companies & Plans', companies.length]].map(([key, label, count]) => (
          <button key={key} className={`ap-tab-btn${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
            {label} <span className="ap-tab-count">{count}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <input className="ap-input ap-search-input" placeholder="Search…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: 220, marginBottom: 0 }} />
      </div>

      {/* Enterprise Enquiries */}
      {tab === 'enquiries' && (
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead><tr><th>Business</th><th>Contact</th><th>Billing</th><th>Amount</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="7" className="ap-loading-cell"><div className="ap-spinner"/></td></tr>
                : filteredEnquiries.length === 0 ? <tr><td colSpan="7" className="ap-empty">No enterprise enquiries yet</td></tr>
                : filteredEnquiries.map(e => (
                <tr key={e.id} className="ap-tr-hover">
                  <td className="ap-td-bold">{e.companyName || '—'}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>{e.contactEmail}<br/><span style={{ color: 'var(--text-4)' }}>{e.phone}</span></td>
                  <td><span className="ap-badge blue">{e.billingCycle || 'monthly'}</span></td>
                  <td style={{ fontWeight: 700, color: 'var(--brand)' }}>{(e.amount || 75000).toLocaleString()} RWF</td>
                  <td className="ap-td-date">{fmt(e.createdAt)}</td>
                  <td><span className={`ap-badge ${STATUS_COLOR[e.status || 'pending'] || 'yellow'}`}>{e.status || 'pending'}</span></td>
                  <td>
                    <div className="ap-table-actions">
                      <button className="ap-icon-action-btn" title="View details" onClick={() => setViewItem(e)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      {(!e.status || e.status === 'pending' || e.status === 'contacted') && (
                        <button className="ap-icon-action-btn success" title="Activate enterprise plan"
                          onClick={() => handleEnquiryAction(e, 'active')}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        </button>
                      )}
                      {(!e.status || e.status === 'pending') && (
                        <button className="ap-icon-action-btn" title="Mark as contacted"
                          onClick={() => handleEnquiryAction(e, 'contacted')}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.93 11.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.88 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Subscriptions */}
      {tab === 'subscriptions' && (
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead><tr><th>Business</th><th>Plan</th><th>Status</th><th>Billing</th><th>Amount</th><th>Trial Ends</th><th>Next Bill</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="8" className="ap-loading-cell"><div className="ap-spinner"/></td></tr>
                : filteredSubs.length === 0 ? <tr><td colSpan="8" className="ap-empty">No subscriptions yet</td></tr>
                : filteredSubs.map(s => {
                const trialEnd = s.trialEndsAt ? (s.trialEndsAt.toDate ? s.trialEndsAt.toDate() : new Date(s.trialEndsAt.seconds*1000)) : null;
                const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - new Date()) / 86400000)) : null;
                return (
                <tr key={s.id} className="ap-tr-hover">
                  <td className="ap-td-bold">{s.businessName || '—'}</td>
                  <td><span className={`ap-badge ${s.plan === 'enterprise' ? 'blue' : s.plan === 'professional' ? 'teal' : 'gray'}`}>{s.plan || 'free'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <span className={`ap-badge ${STATUS_COLOR[s.status] || 'gray'}`}>{s.status || 'active'}</span>
                      {s.locked && <span className="ap-badge red">🔒 Locked</span>}
                    </div>
                  </td>
                  <td><span className="ap-badge gray">{s.billingCycle || 'monthly'}</span></td>
                  <td style={{ fontWeight: 700 }}>{s.amount ? s.amount.toLocaleString() + ' RWF' : '—'}</td>
                  <td>
                    {daysLeft !== null ? (
                      <span style={{ color: daysLeft <= 3 ? '#ef4444' : 'var(--text-2)', fontWeight: daysLeft <= 3 ? 700 : 400 }}>
                        {daysLeft === 0 ? 'Expired' : `${daysLeft}d left`}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="ap-td-date">{fmt(s.nextBillingDate)}</td>
                  <td>
                    <div className="ap-table-actions">
                      <button className="ap-icon-action-btn" title="Edit subscription"
                        onClick={() => {
                          setEditSub(s);
                          const trialEndDate = s.trialEndsAt ? (s.trialEndsAt.toDate ? s.trialEndsAt.toDate() : new Date(s.trialEndsAt.seconds*1000)) : null;
                          const nextBillDate = s.nextBillingDate ? (s.nextBillingDate.toDate ? s.nextBillingDate.toDate() : new Date(s.nextBillingDate.seconds*1000)) : null;
                          setEditSubForm({
                            plan: s.plan || 'professional',
                            status: s.status || 'active',
                            locked: s.locked || false,
                            trialEndsAt: trialEndDate ? trialEndDate.toISOString().split('T')[0] : '',
                            nextBillingDate: nextBillDate ? nextBillDate.toISOString().split('T')[0] : '',
                          });
                        }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      {s.locked ? (
                        <button className="ap-icon-action-btn success" title="Unlock account"
                          onClick={async () => {
                            await updateDoc(doc(db, 'subscriptions', s.id), { locked: false, status: 'active' });
                            setSubscriptions(prev => prev.map(x => x.id === s.id ? { ...x, locked: false, status: 'active' } : x));
                            showToast(`✓ Account unlocked for ${s.businessName}`);
                          }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                        </button>
                      ) : (
                        <button className="ap-icon-action-btn danger" title="Lock account"
                          onClick={async () => {
                            await updateDoc(doc(db, 'subscriptions', s.id), { locked: true, status: 'expired' });
                            setSubscriptions(prev => prev.map(x => x.id === s.id ? { ...x, locked: true, status: 'expired' } : x));
                            showToast(`Account locked for ${s.businessName}`, 'error');
                          }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      )}

      {/* All companies with plans */}
      {tab === 'all-plans' && (
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead><tr><th>Business</th><th>Category</th><th>Current Plan</th><th>Status</th><th>Trial Days</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="6" className="ap-loading-cell"><div className="ap-spinner"/></td></tr>
                : companiesWithPlan.map(c => {
                const sub = c.sub;
                const trialEnd = sub?.trialEndsAt ? (sub.trialEndsAt.toDate ? sub.trialEndsAt.toDate() : new Date(sub.trialEndsAt.seconds*1000)) : null;
                const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - new Date()) / 86400000)) : null;
                return (
                <tr key={c.id} className="ap-tr-hover">
                  <td>
                    <div className="ap-table-user">
                      <div className="ap-table-avatar">{(c.companyName || c.name || 'B')[0].toUpperCase()}</div>
                      <div>
                        <div className="ap-table-name">{c.companyName || c.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-4)' }}>{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="ap-badge gray">{c.category || 'other'}</span></td>
                  <td><span className={`ap-badge ${sub?.plan === 'enterprise' ? 'blue' : sub?.plan === 'professional' ? 'teal' : 'gray'}`}>
                    {sub?.plan || c.plan || 'free'}
                  </span></td>
                  <td>
                    {sub ? <span className={`ap-badge ${STATUS_COLOR[sub.status] || 'gray'}`}>{sub.status}</span>
                      : <span className="ap-badge gray">no sub</span>}
                    {sub?.locked && <span className="ap-badge red" style={{ marginLeft: 4 }}>🔒</span>}
                  </td>
                  <td>
                    {daysLeft !== null ? (
                      <span style={{ color: daysLeft <= 3 ? '#ef4444' : 'var(--text-2)', fontWeight: daysLeft <= 3 ? 700 : 400 }}>
                        {daysLeft === 0 ? 'Expired' : `${daysLeft}d`}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {sub?.locked ? (
                      <button className="ap-btn ap-btn-sm ap-btn-primary" onClick={async () => {
                        await updateDoc(doc(db, 'subscriptions', sub.id), { locked: false, status: 'active' });
                        setSubscriptions(prev => prev.map(x => x.id === sub.id ? { ...x, locked: false, status: 'active' } : x));
                        setCompanies(prev => prev.map(x => x.id === c.id ? { ...x, sub: { ...sub, locked: false, status: 'active' } } : x));
                        showToast(`✓ Account unlocked`);
                      }}>🔓 Unlock</button>
                    ) : (
                      <button className="ap-btn ap-btn-sm ap-btn-secondary" onClick={() => setTab('subscriptions')}>Manage</button>
                    )}
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      )}

      {/* View Enquiry Modal */}
      {viewItem && (
        <div className="ap-modal-overlay" onClick={e => e.target === e.currentTarget && setViewItem(null)}>
          <div className="ap-modal">
            <div className="ap-modal-header">
              <h3>Enterprise Enquiry — {viewItem.companyName}</h3>
              <button className="ap-modal-close" onClick={() => setViewItem(null)}>✕</button>
            </div>
            <div className="ap-report-detail">
              {[
                ['Company', viewItem.companyName],
                ['Contact Email', viewItem.contactEmail],
                ['Phone', viewItem.phone || '—'],
                ['Billing Cycle', viewItem.billingCycle || 'monthly'],
                ['Amount', `${(viewItem.amount || 75000).toLocaleString()} RWF`],
                ['Status', viewItem.status || 'pending'],
                ['Submitted', fmt(viewItem.createdAt)],
              ].map(([k, v]) => (
                <div key={k} className="ap-report-row"><span>{k}</span><strong>{v}</strong></div>
              ))}
              {viewItem.message && (
                <div className="ap-report-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                  <span>Message</span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>{viewItem.message}</p>
                </div>
              )}
            </div>
            <div className="ap-modal-actions">
              <button className="ap-btn ap-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
              {(!viewItem.status || viewItem.status === 'pending') && (
                <button className="ap-btn ap-btn-secondary" onClick={() => handleEnquiryAction(viewItem, 'contacted')} disabled={saving}>
                  Mark Contacted
                </button>
              )}
              {(!viewItem.status || viewItem.status === 'pending' || viewItem.status === 'contacted') && (
                <button className="ap-btn ap-btn-primary" onClick={() => handleEnquiryAction(viewItem, 'active')} disabled={saving}>
                  {saving ? 'Activating…' : '✓ Activate Enterprise'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Subscription Modal */}
      {editSub && (
        <div className="ap-modal-overlay" onClick={e => e.target === e.currentTarget && setEditSub(null)}>
          <div className="ap-modal">
            <div className="ap-modal-header">
              <h3>Edit Subscription — {editSub.businessName}</h3>
              <button className="ap-modal-close" onClick={() => setEditSub(null)}>✕</button>
            </div>
            <div className="ap-field">
              <label>Plan</label>
              <select className="ap-input" value={editSubForm.plan} onChange={e => setEditSubForm(f => ({ ...f, plan: e.target.value }))}>
                {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div className="ap-field">
              <label>Status</label>
              <select className="ap-input" value={editSubForm.status} onChange={e => setEditSubForm(f => ({ ...f, status: e.target.value }))}>
                {['active', 'trial', 'cancelled', 'expired', 'pending'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="ap-field-row">
              <div className="ap-field">
                <label>Trial Ends At</label>
                <input className="ap-input" type="date" value={editSubForm.trialEndsAt}
                  onChange={e => setEditSubForm(f => ({ ...f, trialEndsAt: e.target.value }))}/>
              </div>
              <div className="ap-field">
                <label>Next Billing Date</label>
                <input className="ap-input" type="date" value={editSubForm.nextBillingDate}
                  onChange={e => setEditSubForm(f => ({ ...f, nextBillingDate: e.target.value }))}/>
              </div>
            </div>
            <div className="ap-field ap-field-toggle">
              <label>Account Locked</label>
              <label className="ap-toggle">
                <input type="checkbox" checked={editSubForm.locked}
                  onChange={e => setEditSubForm(f => ({ ...f, locked: e.target.checked }))}/>
                <span className="ap-toggle-slider"/>
              </label>
              <span style={{ fontSize: '0.82rem', color: editSubForm.locked ? 'var(--danger)' : 'var(--brand)' }}>
                {editSubForm.locked ? '🔒 Locked' : '🔓 Active'}
              </span>
            </div>
            <div className="ap-modal-actions">
              <button className="ap-btn ap-btn-secondary" onClick={() => setEditSub(null)}>Cancel</button>
              <button className="ap-btn ap-btn-primary" onClick={saveSubscriptionEdit} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
