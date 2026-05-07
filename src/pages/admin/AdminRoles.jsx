import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../firebase/config';
import { collection, getDocs, setDoc, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';
import AdminLayout from './AdminLayout';
import './AdminPages.css';

const ALL_PERMISSIONS = [
  // Users
  { key: 'view_users',         label: 'View Users',              group: 'Users' },
  { key: 'edit_users',         label: 'Edit Users',              group: 'Users' },
  { key: 'delete_users',       label: 'Delete Users',            group: 'Users' },
  { key: 'ban_users',          label: 'Ban / Suspend Users',     group: 'Users' },
  { key: 'export_users',       label: 'Export User Data',        group: 'Users' },
  // Businesses
  { key: 'view_businesses',    label: 'View Businesses',         group: 'Businesses' },
  { key: 'edit_businesses',    label: 'Edit Businesses',         group: 'Businesses' },
  { key: 'verify_businesses',  label: 'Verify Businesses',       group: 'Businesses' },
  { key: 'delete_businesses',  label: 'Delete Businesses',       group: 'Businesses' },
  { key: 'feature_businesses', label: 'Feature Businesses',      group: 'Businesses' },
  // Reviews
  { key: 'view_reviews',       label: 'View Reviews',            group: 'Reviews' },
  { key: 'delete_reviews',     label: 'Delete Reviews',          group: 'Reviews' },
  { key: 'comment_reviews',    label: 'Comment on Reviews',      group: 'Reviews' },
  { key: 'pin_reviews',        label: 'Pin / Highlight Reviews', group: 'Reviews' },
  { key: 'flag_reviews',       label: 'Flag Reviews for Review', group: 'Reviews' },
  // Claims
  { key: 'manage_claims',      label: 'Manage Claims',           group: 'Claims' },
  { key: 'approve_claims',     label: 'Approve Claims',          group: 'Claims' },
  { key: 'reject_claims',      label: 'Reject Claims',           group: 'Claims' },
  // Reports
  { key: 'view_reports',       label: 'View Reports',            group: 'Reports' },
  { key: 'resolve_reports',    label: 'Resolve Reports',         group: 'Reports' },
  { key: 'escalate_reports',   label: 'Escalate Reports',        group: 'Reports' },
  // Analytics
  { key: 'view_analytics',     label: 'View Analytics',          group: 'Analytics' },
  { key: 'export_analytics',   label: 'Export Analytics Data',   group: 'Analytics' },
  // Blog & Content
  { key: 'view_blogs',         label: 'View Blog Posts',         group: 'Content' },
  { key: 'create_blogs',       label: 'Create Blog Posts',       group: 'Content' },
  { key: 'edit_blogs',         label: 'Edit Blog Posts',         group: 'Content' },
  { key: 'delete_blogs',       label: 'Delete Blog Posts',       group: 'Content' },
  { key: 'publish_blogs',      label: 'Publish Blog Posts',      group: 'Content' },
  { key: 'schedule_blogs',     label: 'Schedule Blog Posts',     group: 'Content' },
  // Newsletter
  { key: 'view_newsletter',    label: 'View Newsletter',         group: 'Content' },
  { key: 'manage_subscribers', label: 'Manage Subscribers',      group: 'Content' },
  { key: 'compose_newsletter', label: 'Compose Newsletter',      group: 'Content' },
  { key: 'schedule_newsletter',label: 'Schedule Newsletter',     group: 'Content' },
  { key: 'send_newsletter',    label: 'Send Newsletter',         group: 'Content' },
  { key: 'view_newsletter_analytics', label: 'View Newsletter Analytics', group: 'Content' },
  // Support & Chat
  { key: 'view_chat',          label: 'View Support Chat',       group: 'Support' },
  { key: 'reply_chat',         label: 'Reply to Chat',           group: 'Support' },
  { key: 'assign_chat',        label: 'Assign Chat Sessions',    group: 'Support' },
  { key: 'close_chat',         label: 'Close Chat Sessions',     group: 'Support' },
  // Notifications
  { key: 'send_notifications', label: 'Send Notifications',      group: 'Notifications' },
  { key: 'view_notification_status', label: 'View Notification Status', group: 'Notifications' },
  // Finance & Payments
  { key: 'view_payments',      label: 'View Payments',           group: 'Finance' },
  { key: 'export_payments',    label: 'Export Payment Data',     group: 'Finance' },
  { key: 'view_invoices',      label: 'View Invoices',           group: 'Finance' },
  { key: 'view_subscriptions', label: 'View Subscriptions',      group: 'Finance' },
  { key: 'manage_subscriptions', label: 'Manage Subscriptions',  group: 'Finance' },
  // System & Admin
  { key: 'manage_admins',      label: 'Manage Administrators',   group: 'System' },
  { key: 'manage_settings',    label: 'Manage Settings',         group: 'System' },
  { key: 'view_audit',         label: 'View Audit Trail',        group: 'System' },
  { key: 'manage_roles',       label: 'Manage Roles',            group: 'System' },
  // Technical
  { key: 'manage_api_keys',    label: 'Manage API Keys',         group: 'Technical' },
  { key: 'manage_webhooks',    label: 'Manage Webhooks',         group: 'Technical' },
  { key: 'view_logs',          label: 'View System Logs',        group: 'Technical' },
  { key: 'view_system_health', label: 'View System Health',      group: 'Technical' },
];

const PERMISSION_GROUPS = [...new Set(ALL_PERMISSIONS.map(p => p.group))];

// Role Templates - pre-built roles for common use cases
const ROLE_TEMPLATES = [
  {
    name: 'Content Manager',
    description: 'Manages blog posts, newsletters, and content publications',
    permissions: ['view_blogs','create_blogs','edit_blogs','delete_blogs','publish_blogs','schedule_blogs','view_newsletter','manage_subscribers','compose_newsletter','schedule_newsletter','send_newsletter','view_newsletter_analytics']
  },
  {
    name: 'Moderator',
    description: 'Moderates reviews, manages claims, and verifies businesses',
    permissions: ['view_businesses','verify_businesses','feature_businesses','view_reviews','comment_reviews','delete_reviews','flag_reviews','pin_reviews','manage_claims','approve_claims','reject_claims','view_reports']
  },
  {
    name: 'Support Agent',
    description: 'Provides customer support and manages support tickets',
    permissions: ['view_chat','reply_chat','assign_chat','close_chat','view_businesses','view_reviews','comment_reviews','manage_claims','view_reports']
  },
  {
    name: 'Data Analyst',
    description: 'Views analytics, generates reports, and exports data',
    permissions: ['view_analytics','export_analytics','view_reports','view_payments','view_invoices','view_subscriptions','export_payments']
  },
  {
    name: 'Technical Lead',
    description: 'Manages technical systems, logs, and integrations',
    permissions: ['view_logs','view_audit','view_system_health','manage_api_keys','manage_webhooks']
  }
];

const DEFAULT_ROLES = [
  { name: 'Super Admin', permissions: ALL_PERMISSIONS.map(p => p.key), isSystem: true },
  { name: 'Content Manager', permissions: ROLE_TEMPLATES[0].permissions, isSystem: false },
  { name: 'Moderator', permissions: ROLE_TEMPLATES[1].permissions, isSystem: false },
  { name: 'Support Agent', permissions: ROLE_TEMPLATES[2].permissions, isSystem: false },
  { name: 'Data Analyst', permissions: ROLE_TEMPLATES[3].permissions, isSystem: false },
  { name: 'Technical Lead', permissions: ROLE_TEMPLATES[4].permissions, isSystem: false },
];

export default function AdminRoles() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // role being edited
  const [creating, setCreating] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', permissions: [] });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(msg, type='success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'admin_roles'));
        if (snap.empty) {
          // Seed defaults to Firestore so they persist
          const savedRoles = [];
          for (const r of DEFAULT_ROLES) {
            const id = `role_${r.name.toLowerCase().replace(/\s+/g,'_')}`;
            await setDoc(doc(db, 'admin_roles', id), { name: r.name, permissions: r.permissions, isSystem: r.isSystem || false }).catch(()=>{});
            savedRoles.push({ ...r, id });
          }
          setRoles(savedRoles);
        } else {
          setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch(e) {
        setRoles(DEFAULT_ROLES.map((r, i) => ({ ...r, id: `default_${i}` })));
      }
      setLoading(false);
    })();
  }, []);

  async function saveRole(role) {
    setSaving(true);
    try {
      await setDoc(doc(db, 'admin_roles', role.id), { name: role.name, permissions: role.permissions, isSystem: role.isSystem || false });
      setRoles(prev => prev.map(r => r.id === role.id ? role : r));
      setEditing(null);
      await addDoc(collection(db, 'audit_logs'), { action:'role_updated', detail:`Updated role: ${role.name}`, adminEmail: user?.email, timestamp: serverTimestamp() });
    } catch(e) { console.error(e); }
    setSaving(false);
  }

  async function createRole() {
    if (!newRole.name.trim()) return;
    setSaving(true);
    try {
      const id = `role_${Date.now()}`;
      const roleData = { name: newRole.name.trim(), permissions: newRole.permissions, isSystem: false, createdAt: serverTimestamp() };
      await setDoc(doc(db, 'admin_roles', id), roleData);
      const newEntry = { id, ...roleData };
      setRoles(prev => [...prev, newEntry]);
      setCreating(false);
      setNewRole({ name: '', permissions: [] });
      showToast('Role created: ' + roleData.name);
    } catch(e) { 
      console.error('Error creating role:', e);
      showToast('Error: ' + (e.message || 'Failed to create role. Check Firestore permissions.'), 'error');
    }
    setSaving(false);
  }

  async function deleteRole(id) {
    if (!window.confirm('Delete this role?')) return;
    try {
      await deleteDoc(doc(db, 'admin_roles', id));
      setRoles(prev => prev.filter(r => r.id !== id));
    } catch(e) {}
  }

  function PermissionCheckboxGroup({ perms, onChange, disabled }) {
    const allPerms = ALL_PERMISSIONS.map(p => p.key);
    const isAllSelected = perms.length === allPerms.length && allPerms.every(p => perms.includes(p));
    const isSomeSelected = perms.length > 0 && perms.length < allPerms.length;

    return (
      <div className="ap-perm-groups">
        <div className="ap-perm-bulk-actions" style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          <button
            className="ap-btn ap-btn-secondary ap-btn-sm"
            disabled={disabled}
            onClick={() => onChange(allPerms)}
            style={{ flex: '1', padding: '8px 12px', fontSize: '0.875rem' }}
          >
            ✓ Select All
          </button>
          <button
            className="ap-btn ap-btn-secondary ap-btn-sm"
            disabled={disabled}
            onClick={() => onChange([])}
            style={{ flex: '1', padding: '8px 12px', fontSize: '0.875rem' }}
          >
            ✕ Deselect All
          </button>
        </div>

        <div style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '12px' }}>
          {perms.length} / {allPerms.length} permissions selected
        </div>

        {PERMISSION_GROUPS.map(group => {
          const groupPerms = ALL_PERMISSIONS.filter(p => p.group === group).map(p => p.key);
          const groupSelected = groupPerms.filter(p => perms.includes(p));
          const isGroupAllSelected = groupSelected.length === groupPerms.length;
          const isGroupSomeSelected = groupSelected.length > 0 && groupSelected.length < groupPerms.length;

          return (
            <div key={group} className="ap-perm-group">
              <div className="ap-perm-group-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div className="ap-perm-group-label" style={{ margin: 0 }}>{group} ({groupSelected.length}/{groupPerms.length})</div>
                <button
                  className="ap-btn ap-btn-tertiary ap-btn-xs"
                  disabled={disabled}
                  onClick={() => {
                    const newPerms = isGroupAllSelected
                      ? perms.filter(p => !groupPerms.includes(p))
                      : [...new Set([...perms, ...groupPerms])];
                    onChange(newPerms);
                  }}
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  {isGroupAllSelected ? 'Deselect' : 'Select'} Group
                </button>
              </div>
              {ALL_PERMISSIONS.filter(p => p.group === group).map(p => (
                <label key={p.key} className="ap-perm-check">
                  <input
                    type="checkbox"
                    checked={perms.includes(p.key)}
                    disabled={disabled}
                    onChange={e => {
                      if (e.target.checked) onChange([...perms, p.key]);
                      else onChange(perms.filter(k => k !== p.key));
                    }}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="ap-page-header">
        <h1 className="ap-page-title">{t('admin.roles_title')||'Roles & Permissions'}</h1>
        <button className="ap-btn ap-btn-primary" onClick={() => setCreating(true)}>
          + New Role
        </button>
      </div>

      <p style={{ color:'var(--muted)', fontSize:'0.875rem', marginBottom:'var(--sp-6)' }}>
        Define what each admin role can access and manage within the platform.
      </p>

      {loading ? <div className="ap-table-wrap" style={{ padding:'40px', textAlign:'center', color:'var(--muted)' }}>Loading…</div>
      : (
        <div className="ap-roles-grid">
          {roles.map(role => (
            <div key={role.id} className={`ap-role-card${role.isSystem ? ' system' : ''}`}>
              <div className="ap-role-header">
                <div>
                  <div className="ap-role-name">{role.name}</div>
                  {role.isSystem && <span className="ap-badge teal" style={{ marginTop:4 }}>{t('admin.system_role')||'System Role'}</span>}
                </div>
                <div className="ap-role-actions">
                  <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => setEditing({ ...role })}>
                    Edit
                  </button>
                  {!role.isSystem && (
                    <button className="ap-btn ap-btn-danger ap-btn-sm" onClick={() => deleteRole(role.id)}>Delete</button>
                  )}
                </div>
              </div>
              <div className="ap-role-perm-count">{role.permissions?.length || 0} / {ALL_PERMISSIONS.length} permissions</div>
              <div className="ap-role-perm-pills">
                {(role.permissions || []).slice(0,5).map(p => {
                  const pm = ALL_PERMISSIONS.find(x => x.key === p);
                  return pm ? <span key={p} className="ap-perm-pill">{pm.label}</span> : null;
                })}
                {(role.permissions?.length || 0) > 5 && (
                  <span className="ap-perm-pill ap-perm-more">+{role.permissions.length - 5} more</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit role modal */}
      {editing && (
        <div className="ap-modal-overlay" onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <div className="ap-modal" style={{ maxWidth:680 }}>
            <div className="ap-modal-header">
              <h3>Edit Role: {editing.name}</h3>
              <button className="ap-modal-close" onClick={() => setEditing(null)}>✕</button>
            </div>
            <div className="ap-field">
              <label>{t('admin.role_name')||'Role Name'}</label>
              <input className="ap-input" value={editing.name} disabled={editing.isSystem}
                onChange={e => setEditing(r => ({...r, name: e.target.value}))} />
            </div>
            <div className="ap-field" style={{ marginTop:'var(--sp-5)' }}>
              <label>{t('admin.permissions')||'Permissions'}</label>
              <PermissionCheckboxGroup
                perms={editing.permissions || []}
                onChange={p => setEditing(r => ({...r, permissions: p}))}
                disabled={editing.isSystem}
              />
            </div>
            <div className="ap-modal-actions">
              <button className="ap-btn ap-btn-secondary" onClick={() => setEditing(null)}>{t('admin.cancel')||'Cancel'}</button>
              {!editing.isSystem && (
                <button className="ap-btn ap-btn-primary" onClick={() => saveRole(editing)} disabled={saving}>
                  {saving ? t('admin.saving')||'Saving…' : t('admin.save_role')||'Save Role'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create role modal */}
      {creating && (
        <div className="ap-modal-overlay" onClick={e => e.target === e.currentTarget && setCreating(false)}>
          <div className="ap-modal" style={{ maxWidth:700 }}>
            <div className="ap-modal-header">
              <h3>{t('admin.create_new_role')||'Create New Role'}</h3>
              <button className="ap-modal-close" onClick={() => setCreating(false)}>✕</button>
            </div>

            <div className="ap-field">
              <label style={{ fontSize:'0.875rem', fontWeight:600, marginBottom:'8px', display:'block' }}>Use Template (Optional)</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'8px', marginBottom:'16px' }}>
                {ROLE_TEMPLATES.map((template, idx) => (
                  <button
                    key={idx}
                    className="ap-btn ap-btn-secondary"
                    style={{ textAlign:'left', padding:'12px', fontSize:'0.875rem', height:'auto', border: newRole.permissions === template.permissions ? '2px solid var(--brand)' : '1px solid var(--border)' }}
                    onClick={() => setNewRole({ name: template.name, permissions: [...template.permissions] })}
                    title={template.description}
                  >
                    <div style={{ fontWeight:600 }}>{template.name}</div>
                    <div style={{ fontSize:'0.75rem', color:'var(--muted)', marginTop:'4px' }}>{template.permissions.length} permissions</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="ap-field">
              <label>{t('admin.role_name')||'Role Name'}</label>
              <input className="ap-input" value={newRole.name} placeholder={t('admin.role_placeholder')||'e.g. Custom Role'}
                onChange={e => setNewRole(r => ({...r, name: e.target.value}))} />
            </div>
            <div className="ap-field" style={{ marginTop:'var(--sp-5)' }}>
              <label>{t('admin.permissions')||'Permissions'}</label>
              <PermissionCheckboxGroup
                perms={newRole.permissions}
                onChange={p => setNewRole(r => ({...r, permissions: p}))}
                disabled={false}
              />
            </div>
            <div className="ap-modal-actions">
              <button className="ap-btn ap-btn-secondary" onClick={() => setCreating(false)}>{t('admin.cancel')||'Cancel'}</button>
              <button className="ap-btn ap-btn-primary" onClick={createRole} disabled={saving || !newRole.name.trim()}>
                {saving ? t('admin.creating')||'Creating…' : t('admin.create_role')||'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div style={{
          position:'fixed', bottom:24, right:24, zIndex:9999,
          background: toast.type==='error' ? '#ef4444' : 'var(--brand)',
          color:'white', padding:'12px 20px', borderRadius:10,
          boxShadow:'0 4px 20px rgba(0,0,0,0.2)', fontSize:'0.875rem', fontWeight:500,
          display:'flex', alignItems:'center', gap:8
        }}>
          {toast.type==='error' ? '✗' : '✓'} {toast.msg}
        </div>
      )}
    </AdminLayout>
  );
}
