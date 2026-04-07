import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db, firebaseConfig, getApps, deleteApp } from '../../firebase/config';
import { collection, getDocs, setDoc, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { useAuthStore } from '../../store/authStore';
import AdminLayout from './AdminLayout';
import './AdminPages.css';

export default function AdminAdministrators() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [admins, setAdmins] = useState([]);
  const [roles, setRoles] = useState(['Super Admin', 'Moderator', 'Support', 'Analyst']);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // all | active | pending | inactive
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editAdmin, setEditAdmin] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // permanently delete (inactive only)
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [addForm, setAddForm] = useState({ email: '', displayName: '', role: 'Moderator', password: '' });
  const [editForm, setEditForm] = useState({});
  const [resetPwTarget, setResetPwTarget] = useState(null); // { id, email, displayName }
  const [resetPwSaving, setResetPwSaving] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => { loadAdmins(); }, []);

  async function loadAdmins() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'admin_users'));
      setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      const rSnap = await getDocs(collection(db, 'admin_roles')).catch(() => ({ docs: [] }));
      if (rSnap.docs.length) setRoles(rSnap.docs.map(d => d.data().name).filter(Boolean));
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function handleAdd() {
    if (!addForm.email || !addForm.displayName || !addForm.password) {
      showToast('Email, name and password are required.', 'error'); return;
    }
    if (addForm.password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error'); return;
    }
    setSaving(true);
    // Use a secondary Firebase app instance so creating the new user
    // does NOT sign out the currently logged-in super admin.
    const SECONDARY = 'irema-admin-secondary';
    let secondaryApp = null;
    try {
      // Reuse existing secondary app if it exists, otherwise create it
      const existing = getApps().find(a => a.name === SECONDARY);
      secondaryApp = existing || initializeApp(firebaseConfig, SECONDARY);
      const secondaryAuth = getAuth(secondaryApp);

      const cred = await createUserWithEmailAndPassword(secondaryAuth, addForm.email, addForm.password);
      await updateProfile(cred.user, { displayName: addForm.displayName });
      const uid = cred.user.uid;

      // Sign out of the secondary app immediately — we only needed it for account creation
      await secondaryAuth.signOut();

      const data = {
        uid, email: addForm.email, displayName: addForm.displayName, role: addForm.role,
        isActive: true, isPending: false, mustChangePassword: false,
        createdAt: serverTimestamp(), createdBy: user?.email,
      };
      await setDoc(doc(db, 'admin_users', uid), data);
      await addDoc(collection(db, 'audit_logs'), {
        action: 'admin_created',
        detail: `Created admin: ${addForm.email} (${addForm.role})`,
        adminEmail: user?.email, timestamp: serverTimestamp(),
      });

      setAdmins(prev => [...prev, { id: uid, ...data, createdAt: { seconds: Date.now() / 1000 } }]);
      setShowAdd(false);
      setAddForm({ email: '', displayName: '', role: 'Moderator', password: '' });
      showToast(`✓ Admin account created for ${addForm.displayName}. Share their credentials to log in at /admin/login.`);
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        showToast('An account with this email already exists. Use a different email.', 'error');
      } else {
        showToast(e.message, 'error');
      }
    } finally {
      // Clean up secondary app to free resources
      if (secondaryApp) {
        try { await deleteApp(secondaryApp); } catch (_) {}
      }
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!editAdmin) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'admin_users', editAdmin.id), {
        displayName: editForm.displayName, role: editForm.role, isActive: editForm.isActive
      });
      setAdmins(prev => prev.map(a => a.id === editAdmin.id ? { ...a, ...editForm } : a));
      setEditAdmin(null);
      showToast('Admin updated successfully.');
    } catch(e) { showToast(e.message, 'error'); }
    setSaving(false);
  }

  async function handleResetPassword() {
    if (!resetPwTarget) return;
    setResetPwSaving(true);
    try {
      await sendPasswordResetEmail(getAuth(), resetPwTarget.email);
      await addDoc(collection(db, 'audit_logs'), {
        action: 'admin_password_reset_sent',
        detail: `Password reset email sent to: ${resetPwTarget.email}`,
        adminEmail: user?.email, timestamp: serverTimestamp(),
      });
      setResetPwTarget(null);
      showToast(`✓ Password reset email sent to ${resetPwTarget.email}. They can set a new password from the link.`);
    } catch(e) {
      showToast(e.message, 'error');
    } finally {
      setResetPwSaving(false);
    }
  }

  async function toggleActive(admin) {
    try {
      const newVal = !admin.isActive;
      await updateDoc(doc(db, 'admin_users', admin.id), { isActive: newVal });
      setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, isActive: newVal } : a));
      showToast(newVal ? t('admin.activate_admin') : t('admin.deactivate_admin'));
    } catch(e) { showToast(e.message, 'error'); }
  }

  async function handleDelete(admin) {
    // Only allow delete on deactivated admins
    if (admin.isActive !== false) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'admin_users', admin.id));
      await addDoc(collection(db, 'audit_logs'), {
        action: 'admin_deleted', detail: `Permanently deleted: ${admin.email}`,
        adminEmail: user?.email, timestamp: serverTimestamp()
      });
      setAdmins(prev => prev.filter(a => a.id !== admin.id));
      setDeleteTarget(null);
      showToast('admin.admin_deleted');
    } catch(e) { showToast(e.message, 'error'); }
    setSaving(false);
  }

  const fmt = ts => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds*1000) : null;
    return d ? d.toLocaleDateString('en', { month:'short', day:'numeric', year:'numeric' }) : '—';
  };

  const ROLE_COLOR = { 'Super Admin': 'teal', 'Moderator': 'blue', 'Support': 'green', 'Analyst': 'yellow' };

  const filtered = admins.filter(a => {
    const matchTab = tab === 'all' ? true : tab === 'active' ? (a.isActive !== false && !a.isPending) :
      tab === 'pending' ? a.isPending : tab === 'inactive' ? a.isActive === false : true;
    const q = search.toLowerCase();
    const matchSearch = !q || (a.displayName||'').toLowerCase().includes(q) || (a.email||'').toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const counts = {
    all: admins.length,
    active: admins.filter(a => a.isActive !== false && !a.isPending).length,
    pending: admins.filter(a => a.isPending).length,
    inactive: admins.filter(a => a.isActive === false).length,
  };

  return (
    <AdminLayout>
      {toast && <div className={`ap-toast ap-toast-${toast.type}`}>{toast.type==='success'?'✓':'✗'} {toast.msg}</div>}

      <div className="ap-page-header">
        <div>
          <h1 className="ap-page-title">{t('admin.administrators')}</h1>
          <p style={{ color:'var(--text-3)', fontSize:'0.82rem', marginTop:4 }}>{t('admin.manage_access')}</p>
        </div>
        <button className="ap-btn ap-btn-primary" onClick={() => setShowAdd(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {t('admin.add_admin')}
        </button>
      </div>

      {/* Tab navigation */}
      <div className="ap-tabs-row">
        {['all','active','pending','inactive'].map(tabKey => (
          <button key={tabKey} className={`ap-tab-btn${tab === tabKey ? ' active' : ''}`}
            onClick={() => setTab(tabKey)}>
            {t(`admin.${tabKey}_admins`)}
            <span className="ap-tab-count">{counts[tabKey]}</span>
          </button>
        ))}
        <div style={{ flex:1 }} />
        <input
          className="ap-input ap-search-input"
          placeholder={t('admin.search_admins')}
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 220, marginBottom: 0 }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'60px' }}><div className="ap-spinner"/></div>
      ) : filtered.length === 0 ? (
        <div className="ap-empty-state">
          <div style={{ fontSize:'3rem', marginBottom:12 }}>👤</div>
          <h3>{t('admin.no_admins')}</h3>
          {tab === 'all' && <button className="ap-btn ap-btn-primary" onClick={() => setShowAdd(true)}>{t('admin.add_admin')}</button>}
        </div>
      ) : (
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>{t('admin.full_name')}</th>
                <th>{t('admin.email')}</th>
                <th>{t('admin.role')}</th>
                <th>{t('admin.status')}</th>
                <th>{t('admin.added')}</th>
                <th>{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(admin => (
                <tr key={admin.id} className={admin.isActive === false ? 'ap-row-inactive' : ''}>
                  <td>
                    <div className="ap-table-user">
                      <div className="ap-table-avatar">{(admin.displayName||admin.email||'A')[0].toUpperCase()}</div>
                      <span className="ap-table-name">{admin.displayName || '—'}</span>
                    </div>
                  </td>
                  <td style={{ color:'var(--text-3)', fontSize:'0.82rem' }}>{admin.email}</td>
                  <td>
                    <span className={`ap-badge ${ROLE_COLOR[admin.role] || 'gray'}`}>{admin.role || 'Admin'}</span>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      <span className={`ap-badge ${admin.isActive !== false ? 'green' : 'red'}`}>
                        {admin.isActive !== false ? t('admin.active_admins') : t('admin.inactive_admins')}
                      </span>
                      {admin.isPending && <span className="ap-badge yellow">{t('admin.pending_admins')}</span>}
                    </div>
                  </td>
                  <td style={{ color:'var(--text-4)', fontSize:'0.78rem' }}>{fmt(admin.createdAt)}</td>
                  <td>
                    <div className="ap-table-actions">
                      {/* Edit */}
                      <button className="ap-icon-action-btn" title="Edit admin"
                        onClick={() => { setEditAdmin(admin); setEditForm({ displayName: admin.displayName||'', role: admin.role||'Moderator', isActive: admin.isActive !== false }); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      {/* Reset password */}
                      <button className="ap-icon-action-btn" title="Reset password"
                        onClick={() => setResetPwTarget(admin)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </button>
                      {/* Toggle active */}
                      {admin.id !== user?.uid && (
                        <button className="ap-icon-action-btn" title={admin.isActive !== false ? t('admin.deactivate_admin') : t('admin.activate_admin')}
                          onClick={() => admin.isActive !== false ? setDeactivateTarget(admin) : toggleActive(admin)}>
                          {admin.isActive !== false
                            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                          }
                        </button>
                      )}
                      {/* Delete — only for deactivated + not self */}
                      {admin.isActive === false && admin.id !== user?.uid && (
                        <button className="ap-icon-action-btn danger" title={t('admin.delete_admin')}
                          onClick={() => setDeleteTarget(admin)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          </svg>
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

      {/* ── Add Modal ── */}
      {showAdd && (
        <div className="ap-modal-overlay" onClick={e => e.target===e.currentTarget && setShowAdd(false)}>
          <div className="ap-modal">
            <div className="ap-modal-header">
              <h3>{t('admin.add_admin')}</h3>
              <button className="ap-modal-close" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className="ap-modal-note" style={{background:'var(--brand-xlight)',borderColor:'var(--brand-light)',color:'var(--brand-dark)'}}>
              ✓ A Firebase Auth account is created automatically. Share the email &amp; password with the new admin — they can log in immediately at /admin/login.
            </div>
            <div className="ap-field">
              <label>{t('admin.full_name')}</label>
              <input className="ap-input" placeholder="Jane Doe"
                value={addForm.displayName} onChange={e => setAddForm(f => ({...f, displayName:e.target.value}))}/>
            </div>
            <div className="ap-field">
              <label>{t('admin.email')}</label>
              <input className="ap-input" type="email" placeholder="admin@irema.rw"
                value={addForm.email} onChange={e => setAddForm(f => ({...f, email:e.target.value}))}/>
            </div>
            <div className="ap-field">
              <label className="ap-label">Temporary Password <span style={{color:'var(--danger)'}}>*</span></label>
              <input className="ap-input" type="password" placeholder="Min. 6 characters"
                value={addForm.password} onChange={e => setAddForm(f => ({...f, password:e.target.value}))}/>
              <p style={{fontSize:'0.72rem',color:'var(--text-4)',marginTop:4}}>They will be forced to change this on first login.</p>
            </div>
            <div className="ap-field">
              <label>{t('admin.role')}</label>
              <select className="ap-input" value={addForm.role}
                onChange={e => setAddForm(f => ({...f, role:e.target.value}))}>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="ap-modal-actions">
              <button className="ap-btn ap-btn-secondary" onClick={() => setShowAdd(false)}>{t('admin.cancel')}</button>
              <button className="ap-btn ap-btn-primary" onClick={handleAdd} disabled={saving}>
                {saving ? <><span className="ap-spinner" style={{width:14,height:14,marginRight:6}}/>Creating…</> : t('admin.add_admin')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editAdmin && (
        <div className="ap-modal-overlay" onClick={e => e.target===e.currentTarget && setEditAdmin(null)}>
          <div className="ap-modal">
            <div className="ap-modal-header">
              <h3>{t('admin.edit_admin')}</h3>
              <button className="ap-modal-close" onClick={() => setEditAdmin(null)}>✕</button>
            </div>
            <div className="ap-edit-user-info">
              <div className="ap-table-avatar">{(editAdmin.displayName||editAdmin.email||'A')[0].toUpperCase()}</div>
              <div>
                <div style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--text-1)' }}>{editAdmin.email}</div>
                <div style={{ fontSize:'0.72rem', color:'var(--text-4)' }}>ID: {editAdmin.id}</div>
              </div>
            </div>
            <div className="ap-field">
              <label>{t('admin.full_name')}</label>
              <input className="ap-input" value={editForm.displayName}
                onChange={e => setEditForm(f => ({...f, displayName:e.target.value}))}/>
            </div>
            <div className="ap-field">
              <label>{t('admin.role')}</label>
              <select className="ap-input" value={editForm.role}
                onChange={e => setEditForm(f => ({...f, role:e.target.value}))}>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="ap-field ap-field-toggle">
              <label>{t('admin.status')}</label>
              <label className="ap-toggle">
                <input type="checkbox" checked={editForm.isActive}
                  onChange={e => setEditForm(f => ({...f, isActive:e.target.checked}))}/>
                <span className="ap-toggle-slider"/>
              </label>
              <span style={{ fontSize:'0.82rem', color: editForm.isActive ? 'var(--brand)' : 'var(--text-4)' }}>
                {editForm.isActive ? t('admin.active_admins') : t('admin.inactive_admins')}
              </span>
            </div>
            <div className="ap-modal-actions">
              <button className="ap-btn ap-btn-secondary" onClick={() => setEditAdmin(null)}>{t('admin.cancel')}</button>
              <button className="ap-btn ap-btn-primary" onClick={handleEdit} disabled={saving}>
                {saving ? '…' : t('admin.save_changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deactivate Confirm ── */}
      {deactivateTarget && (
        <div className="ap-modal-overlay" onClick={e => e.target===e.currentTarget && setDeactivateTarget(null)}>
          <div className="ap-modal ap-modal-sm">
            <div className="ap-modal-header">
              <h3>{t('admin.deactivate_confirm')}</h3>
              <button className="ap-modal-close" onClick={() => setDeactivateTarget(null)}>✕</button>
            </div>
            <div className="ap-danger-box">
              <div className="ap-danger-icon">⚠️</div>
              <div>
                <p>This will block <strong>{deactivateTarget.email}</strong> from logging in. You can reactivate them at any time.</p>
              </div>
            </div>
            <div className="ap-modal-actions">
              <button className="ap-btn ap-btn-secondary" onClick={() => setDeactivateTarget(null)}>{t('admin.cancel')}</button>
              <button className="ap-btn ap-btn-danger" onClick={() => { toggleActive(deactivateTarget); setDeactivateTarget(null); }} disabled={saving}>
                {t('admin.deactivate_admin')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Permanent Delete Confirm ── */}
      {deleteTarget && (
        <div className="ap-modal-overlay" onClick={e => e.target===e.currentTarget && setDeleteTarget(null)}>
          <div className="ap-modal ap-modal-sm">
            <div className="ap-modal-header">
              <h3>{t('admin.delete_confirm')}</h3>
              <button className="ap-modal-close" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <div className="ap-danger-box">
              <div className="ap-danger-icon">🗑️</div>
              <div>
                <strong>Permanently delete {deleteTarget.email}?</strong>
                <p style={{ marginTop:6, fontSize:'0.82rem', color:'var(--text-3)' }}>
                  This removes all admin access. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="ap-modal-actions">
              <button className="ap-btn ap-btn-secondary" onClick={() => setDeleteTarget(null)}>{t('admin.cancel')}</button>
              <button className="ap-btn ap-btn-danger" onClick={() => handleDelete(deleteTarget)} disabled={saving}>
                {saving ? '…' : t('admin.delete_admin')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Reset Password Confirm ── */}
      {resetPwTarget && (
        <div className="ap-modal-overlay" onClick={e => e.target===e.currentTarget && setResetPwTarget(null)}>
          <div className="ap-modal ap-modal-sm">
            <div className="ap-modal-header">
              <h3>Reset Password</h3>
              <button className="ap-modal-close" onClick={() => setResetPwTarget(null)}>✕</button>
            </div>
            <div style={{padding:'4px 0 16px'}}>
              <p style={{color:'var(--text-2)',fontSize:'0.9rem',marginBottom:12}}>
                A password reset email will be sent to:
              </p>
              <div style={{background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 14px',fontWeight:700,color:'var(--text-1)',fontSize:'0.9rem'}}>
                {resetPwTarget.email}
              </div>
              <p style={{color:'var(--text-3)',fontSize:'0.78rem',marginTop:10}}>
                They will receive a secure link to set a new password. The link expires in 1 hour.
              </p>
            </div>
            <div className="ap-modal-actions">
              <button className="ap-btn ap-btn-secondary" onClick={() => setResetPwTarget(null)}>Cancel</button>
              <button className="ap-btn ap-btn-primary" onClick={handleResetPassword} disabled={resetPwSaving}>
                {resetPwSaving ? 'Sending…' : 'Send Reset Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
