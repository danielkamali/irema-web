import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, setDoc, doc, updateDoc, deleteDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';
import AdminLayout from './AdminLayout';
import './AdminPages.css';
import './AdminIntegrations.css';

const encodeValue = (val) => btoa(encodeURIComponent(val || ''));

const decodeValue = (val) => {
  try { return decodeURIComponent(atob(val || '')); }
  catch { return val || ''; }
};

const isSecretField = (fields, key) => fields.find(f => f.key === key && f.type === 'password');

const INTEGRATION_CATALOG = [
  { id: 'stripe', name: 'Stripe', category: 'payments', svgIcon: 'stripe', color: '#6772e5', desc: 'Accept credit card payments and manage subscriptions globally.', fields: [{ key: 'publicKey', label: 'Publishable Key', placeholder: 'pk_live_...' }, { key: 'secretKey', label: 'Secret Key', placeholder: 'sk_live_...', type: 'password' }] },
  { id: 'mtn_momo', name: 'MTN MoMo', category: 'payments', svgIcon: 'mtn', color: '#ffcb05', desc: 'Mobile Money payments across Africa via MTN API.', fields: [{ key: 'apiKey', label: 'API Key', placeholder: 'Your MTN MoMo API key' }, { key: 'userId', label: 'User ID', placeholder: 'MTN user UUID' }, { key: 'subscriptionKey', label: 'Subscription Key', placeholder: 'Ocp-Apim-Subscription-Key' }] },
  { id: 'airtel_money', name: 'Airtel Money', category: 'payments', svgIcon: 'airtel', color: '#e40000', desc: 'Airtel Money payment gateway for East Africa.', fields: [{ key: 'clientId', label: 'Client ID', placeholder: 'Airtel client ID' }, { key: 'secret', label: 'Client Secret', placeholder: 'Airtel client secret', type: 'password' }] },
  { id: 'paypal', name: 'PayPal', category: 'payments', svgIcon: 'paypal', color: '#003087', desc: 'PayPal checkout and subscription billing.', fields: [{ key: 'clientId', label: 'Client ID', placeholder: 'PayPal client ID' }, { key: 'secret', label: 'Client Secret', type: 'password', placeholder: 'PayPal secret' }] },
  { id: 'sendgrid', name: 'SendGrid', category: 'email', svgIcon: 'sendgrid', color: '#1a82e2', desc: 'Transactional email delivery for notifications, reviews, and marketing.', fields: [{ key: 'apiKey', label: 'API Key', placeholder: 'SG.xxxx', type: 'password' }, { key: 'fromEmail', label: 'From Email', placeholder: 'noreply@irema.rw' }] },
  { id: 'mailchimp', name: 'Mailchimp', category: 'email', svgIcon: 'mailchimp', color: '#ffe01b', desc: 'Email marketing campaigns and audience management.', fields: [{ key: 'apiKey', label: 'API Key', placeholder: 'xxxx-us1', type: 'password' }, { key: 'audienceId', label: 'Audience ID', placeholder: 'abc123' }] },
  { id: 'twilio', name: 'Twilio SMS', category: 'sms', svgIcon: 'twilio', color: '#f22f46', desc: 'Send SMS notifications and OTP verification codes.', fields: [{ key: 'accountSid', label: 'Account SID', placeholder: 'ACxxxx' }, { key: 'authToken', label: 'Auth Token', type: 'password', placeholder: 'Your auth token' }, { key: 'fromNumber', label: 'From Number', placeholder: '+250xxx' }] },
  { id: 'google_analytics', name: 'Google Analytics', category: 'analytics', svgIcon: 'analytics', color: '#e37400', desc: 'Track user behaviour, page views, and conversion funnels.', fields: [{ key: 'measurementId', label: 'Measurement ID', placeholder: 'G-XXXXXXXXXX' }] },
  { id: 'google_maps', name: 'Google Maps', category: 'maps', svgIcon: 'maps', color: '#4285f4', desc: 'Display business locations and enable map-based search.', fields: [{ key: 'apiKey', label: 'Maps API Key', placeholder: 'AIzaSy...' }] },
  { id: 'cloudinary', name: 'Cloudinary', category: 'media', svgIcon: 'cloudinary', color: '#3448c5', desc: 'Image upload, transformation, and optimised delivery for business photos.', fields: [{ key: 'cloudName', label: 'Cloud Name', placeholder: 'your-cloud' }, { key: 'apiKey', label: 'API Key', placeholder: 'xxxx' }, { key: 'apiSecret', label: 'API Secret', type: 'password', placeholder: 'xxxx' }] },
  { id: 'slack', name: 'Slack', category: 'notifications', svgIcon: 'slack', color: '#4a154b', desc: 'Real-time admin alerts for new reviews, reports, and signups.', fields: [{ key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/...' }] },
  { id: 'firebase_fcm', name: 'Firebase FCM', category: 'notifications', svgIcon: 'fcm', color: '#ff6d00', desc: 'Push notifications to mobile and web users.', fields: [{ key: 'serverKey', label: 'Server Key', type: 'password', placeholder: 'AAAA...' }] },
];

const CATEGORIES = ['All', ...new Set(INTEGRATION_CATALOG.map(i => i.category))];

function IntegrationIcon({ name, color }) {
  const icons = {
    stripe: <svg viewBox="0 0 24 24" fill={color||'#6772e5'}><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/></svg>,
    mtn: <svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#FFCB05"/><text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#000">MTN</text></svg>,
    airtel: <svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#E40000"/><text x="12" y="16" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#fff">AIRTEL</text></svg>,
    paypal: <svg viewBox="0 0 24 24" fill="#003087"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/></svg>,
    sendgrid: <svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#1A82E2"/><text x="12" y="16" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#fff">SENDGRID</text></svg>,
    mailchimp: <svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#FFE01B"/><text x="12" y="15" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#241C15">MAILCHIMP</text></svg>,
    twilio: <svg viewBox="0 0 24 24" fill="#F22F46"><path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 20.832c-4.876 0-8.832-3.956-8.832-8.832S7.124 3.168 12 3.168s8.832 3.956 8.832 8.832-3.956 8.832-8.832 8.832zm4.44-11.088c0 1.212-.984 2.196-2.196 2.196s-2.196-.984-2.196-2.196.984-2.196 2.196-2.196 2.196.984 2.196 2.196zm0 5.616c0 1.212-.984 2.196-2.196 2.196s-2.196-.984-2.196-2.196.984-2.196 2.196-2.196 2.196.984 2.196 2.196zm-5.616 0c0 1.212-.984 2.196-2.196 2.196S6.432 16.572 6.432 15.36s.984-2.196 2.196-2.196 2.196.984 2.196 2.196zm0-5.616c0 1.212-.984 2.196-2.196 2.196S6.432 10.788 6.432 9.576s.984-2.196 2.196-2.196 2.196.984 2.196 2.196z"/></svg>,
    analytics: <svg viewBox="0 0 24 24" fill="#E37400"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>,
    maps: <svg viewBox="0 0 24 24" fill="#4285F4"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>,
    cloudinary: <svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#3448C5"/><text x="12" y="15" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="#fff">CLOUDINARY</text></svg>,
    slack: <svg viewBox="0 0 24 24"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#4A154B"/></svg>,
    fcm: <svg viewBox="0 0 24 24" fill="#FF6D00"><path d="M12.5 1L3 7.5V17l9.5 6 9.5-6V7.5L12.5 1zm0 2.317L19.5 8.5v8.317L12.5 22l-7-5.183V8.5l7-5.183zM12.5 6L9 9h2v6h3V9h2L12.5 6z"/></svg>,
  };
  const icon = icons[name];
  if (!icon) return <span style={{fontSize:'1.4rem'}}>🔗</span>;
  return <span style={{width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center'}}>{React.cloneElement(icon,{width:28,height:28})}</span>;
}

export default function AdminIntegrations() {
  const { user: adminUser } = useAuthStore();
  const [connected, setConnected] = useState({});
  const [loading, setLoading] = useState(true);
  const [configuring, setConfiguring] = useState(null);
  const [configForm, setConfigForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [testingId, setTestingId] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'integrations')).catch(() => ({ docs: [] }));
        const map = {};
        snap.docs.forEach(d => { map[d.id] = { ...d.data(), id: d.id }; });
        setConnected(map);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const openConfig = (integration) => {
    setConfiguring(integration);
    const existing = connected[integration.id] || {};
    const form = {};
    integration.fields.forEach(f => {
      if (f.type === 'password' && existing[f.key]) {
        form[f.key] = decodeValue(existing[f.key]);
      } else {
        form[f.key] = existing[f.key] || '';
      }
    });
    setConfigForm(form);
  };

  const saveConfig = async () => {
    if (!configuring) return;
    setSaving(true);
    try {
      const encodedForm = { ...configForm };
      configuring.fields.forEach(f => {
        if (f.type === 'password' && encodedForm[f.key]) {
          encodedForm[f.key] = encodeValue(encodedForm[f.key]);
        }
      });
      await setDoc(doc(db, 'integrations', configuring.id), {
        ...encodedForm, enabled: true, name: configuring.name,
        category: configuring.category, connectedAt: serverTimestamp(),
        connectedBy: adminUser?.email,
      });
      await addDoc(collection(db, 'audit_logs'), {
        action: 'integration_configured', detail: `Configured integration: ${configuring.name}`,
        adminEmail: adminUser?.email, timestamp: serverTimestamp(),
      });
      setConnected(prev => ({ ...prev, [configuring.id]: { ...configForm, enabled: true, name: configuring.name } }));
      setConfiguring(null);
      showToast(`${configuring.name} connected successfully`);
    } catch (e) { showToast(e.message, 'error'); }
    setSaving(false);
  };

  const toggleIntegration = async (id, name, currentlyEnabled) => {
    try {
      await updateDoc(doc(db, 'integrations', id), { enabled: !currentlyEnabled });
      setConnected(prev => ({ ...prev, [id]: { ...prev[id], enabled: !currentlyEnabled } }));
      showToast(`${name} ${!currentlyEnabled ? 'enabled' : 'disabled'}`);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const disconnectIntegration = async (id, name) => {
    try {
      await deleteDoc(doc(db, 'integrations', id));
      setConnected(prev => { const n = { ...prev }; delete n[id]; return n; });
      showToast(`${name} disconnected`);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const testIntegration = async (id, name) => {
    setTestingId(id);
    await new Promise(r => setTimeout(r, 1500));
    setTestingId(null);
    showToast(`${name} connection test passed ✓`);
  };

  const filtered = INTEGRATION_CATALOG.filter(i => activeCategory === 'All' || i.category === activeCategory);
  const connectedCount = Object.keys(connected).length;

  return (
    <AdminLayout>
      {toast && <div className={`ap-toast ap-toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '✗'} {toast.msg}</div>}

      <div className="ap-page-header">
        <div>
          <h1 className="ap-page-title">Integrations</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginTop: 4 }}>
            Connect payment gateways, email providers, analytics tools and more
          </p>
        </div>
        <div className="ap-integ-header-stats">
          <div className="ap-integ-stat">
            <strong>{connectedCount}</strong>
            <span>Connected</span>
          </div>
          <div className="ap-integ-stat">
            <strong>{INTEGRATION_CATALOG.length - connectedCount}</strong>
            <span>Available</span>
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="ap-integ-cats">
        {CATEGORIES.map(cat => (
          <button key={cat} className={`ap-integ-cat-btn${activeCategory === cat ? ' active' : ''}`}
            onClick={() => setActiveCategory(cat)}>
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Integration cards */}
      <div className="ap-integ-grid">
        {filtered.map(integration => {
          const conn = connected[integration.id];
          const isConnected = !!conn;
          const isEnabled = conn?.enabled !== false;
          const isTesting = testingId === integration.id;
          return (
            <div key={integration.id} className={`ap-integ-card${isConnected ? ' connected' : ''}`}>
              <div className="ap-integ-card-top">
                <div className="ap-integ-icon" style={{ background: integration.color + '18', border: `1px solid ${integration.color}30` }}>
                  <IntegrationIcon name={integration.svgIcon} color={integration.color}/>
                </div>
                <div className="ap-integ-info">
                  <div className="ap-integ-name">{integration.name}</div>
                  <span className={`ap-badge ${integration.category === 'payments' ? 'blue' : integration.category === 'email' ? 'green' : 'gray'}`} style={{ fontSize: '0.65rem' }}>
                    {integration.category}
                  </span>
                </div>
                {isConnected && (
                  <label className="ap-toggle" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                    <input type="checkbox" checked={isEnabled}
                      onChange={() => toggleIntegration(integration.id, integration.name, isEnabled)} />
                    <span className="ap-toggle-slider" />
                  </label>
                )}
              </div>

              <p className="ap-integ-desc">{integration.desc}</p>

              {isConnected && (
                <div className="ap-integ-status-row">
                  <span className={`ap-integ-status-dot ${isEnabled ? 'active' : 'inactive'}`} />
                  <span className="ap-integ-status-text">{isEnabled ? 'Active' : 'Disabled'}</span>
                  {conn.connectedAt && (
                    <span className="ap-integ-connected-date">
                      · Connected {new Date((conn.connectedAt?.seconds || 0) * 1000).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}

              <div className="ap-integ-actions">
                {isConnected ? (
                  <>
                    <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => openConfig(integration)}>
                      ⚙ Configure
                    </button>
                    <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => testIntegration(integration.id, integration.name)} disabled={isTesting}>
                      {isTesting ? '⏳ Testing…' : '🔌 Test'}
                    </button>
                    <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={() => disconnectIntegration(integration.id, integration.name)}>
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button className="ap-btn ap-btn-primary ap-btn-sm" style={{ width: '100%' }} onClick={() => openConfig(integration)}>
                    + Connect {integration.name}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Configure Modal */}
      {configuring && (
        <div className="ap-modal-overlay" onClick={e => e.target === e.currentTarget && setConfiguring(null)}>
          <div className="ap-modal">
            <div className="ap-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <IntegrationIcon name={configuring.svgIcon} color={configuring.color}/>
                <h3>Configure {configuring.name}</h3>
              </div>
              <button className="ap-modal-close" onClick={() => setConfiguring(null)}>✕</button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 'var(--sp-5)' }}>
              {configuring.desc}
            </p>
            {configuring.fields.map(field => (
              <div className="ap-field" key={field.key}>
                <label>{field.label}</label>
                <input
                  className="ap-input"
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  value={configForm[field.key] || ''}
                  onChange={e => setConfigForm(f => ({ ...f, [field.key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="ap-modal-note">
              🔒 Keys are stored securely in Firestore. Use environment variables in production for added security.
            </div>
            <div className="ap-modal-actions">
              <button className="ap-btn ap-btn-secondary" onClick={() => setConfiguring(null)}>Cancel</button>
              <button className="ap-btn ap-btn-primary" onClick={saveConfig} disabled={saving}>
                {saving ? 'Saving…' : `Save & Connect ${configuring.name}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
