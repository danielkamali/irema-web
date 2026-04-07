import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import AdminTwoFactor from './AdminTwoFactor';
import { useAuthStore } from '../../store/authStore';
import { db } from '../../firebase/config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import './AdminPages.css';

const SETTINGS_TABS = [
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'features', label: 'Features', icon: '🔧' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'security', label: 'Security', icon: '🔒' },
];

export default function AdminSettings() {
  const { t } = useTranslation();
  const { user, userProfile } = useAuthStore();
  const isSuperAdmin = userProfile?.role === 'super_admin';
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // General
  const [siteName, setSiteName] = useState('Irema');
  const [siteEmail, setSiteEmail] = useState('hello@irema.rw');
  const [siteUrl, setSiteUrl] = useState('https://irema.rw');
  const [country, setCountry] = useState('Rwanda');

  // Features
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [reviewModeration, setReviewModeration] = useState(true);
  const [autoVerify, setAutoVerify] = useState(false);
  const [qrEnabled, setQrEnabled] = useState(true);
  const [publicProfiles, setPublicProfiles] = useState(true);

  // Notifications
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [reviewAlerts, setReviewAlerts] = useState(true);
  const [claimAlerts, setClaimAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Security
  const [requireEmailVerify, setRequireEmailVerify] = useState(false);
  const [maxReviewsPerDay, setMaxReviewsPerDay] = useState(5);
  const [minAccountAge, setMinAccountAge] = useState(0);

  async function handleSave() {
    setSaving(true);
    try {
      await setDoc(doc(db, 'admin_settings', 'general'), {
        siteName, siteEmail, siteUrl, country,
        updatedAt: serverTimestamp(), updatedBy: user?.uid,
      }, { merge: true });
      await setDoc(doc(db, 'admin_settings', 'features'), {
        maintenanceMode, reviewModeration, autoVerify, qrEnabled, publicProfiles,
        updatedAt: serverTimestamp(), updatedBy: user?.uid,
      }, { merge: true });
      await setDoc(doc(db, 'admin_settings', 'notifications'), {
        emailNotifs, reviewAlerts, claimAlerts, weeklyDigest,
        updatedAt: serverTimestamp(), updatedBy: user?.uid,
      }, { merge: true });
      await setDoc(doc(db, 'admin_settings', 'security'), {
        requireEmailVerify, maxReviewsPerDay, minAccountAge,
        updatedAt: serverTimestamp(), updatedBy: user?.uid,
      }, { merge: true });
      setSaved(true);
      setTimeout(() => { setSaved(false); setSaving(false); }, 2500);
    } catch(e) {
      setSaving(false);
      console.error(e);
    }
  }

  const ToggleRow = ({ label, sub, val, set }) => (
    <div className="ap-toggle-row">
      <div className="ap-toggle-info">
        <strong>{label}</strong>
        <span>{sub}</span>
      </div>
      <label className="ap-toggle">
        <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} />
        <span className="ap-toggle-slider"></span>
      </label>
    </div>
  );

  return (
    <AdminLayout>
      <div className="ap-page-header">
        <h1 className="ap-page-title">Settings</h1>
        <button className="ap-btn ap-btn-primary" onClick={handleSave} disabled={saving}>
          {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="ap-settings-layout">
        {/* Horizontal tab nav */}
        <div className="ap-settings-tabs">
          {SETTINGS_TABS.map(tab => (
            <button
              key={tab.id}
              className={`ap-settings-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="ap-settings-content">
          {activeTab === 'general' && (
            <div className="ap-settings-panel">
              <h3>General Settings</h3>
              <p className="ap-settings-desc">Configure basic platform information.</p>
              <div className="ap-field-row">
                <div className="ap-field"><label>Platform Name</label><input className="ap-input" value={siteName} onChange={e => setSiteName(e.target.value)} /></div>
                <div className="ap-field"><label>Country</label><input className="ap-input" value={country} onChange={e => setCountry(e.target.value)} /></div>
              </div>
              <div className="ap-field-row">
                <div className="ap-field"><label>Support Email</label><input className="ap-input" type="email" value={siteEmail} onChange={e => setSiteEmail(e.target.value)} /></div>
                <div className="ap-field"><label>Platform URL</label><input className="ap-input" value={siteUrl} onChange={e => setSiteUrl(e.target.value)} /></div>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="ap-settings-panel">
              <h3>Feature Toggles</h3>
              <p className="ap-settings-desc">Enable or disable platform features.</p>
              <ToggleRow label="Maintenance Mode" sub="Temporarily disable public access to the platform" val={maintenanceMode} set={setMaintenanceMode} />
              <ToggleRow label="Review Moderation" sub="Require admin approval before reviews go public" val={reviewModeration} set={setReviewModeration} />
              <ToggleRow label="Auto-Verify Businesses" sub="Automatically verify new business registrations" val={autoVerify} set={setAutoVerify} />
              <ToggleRow label="QR Code Scanning" sub="Allow users to scan QR codes to find businesses" val={qrEnabled} set={setQrEnabled} />
              <ToggleRow label="Public User Profiles" sub="Allow user profiles to be publicly visible" val={publicProfiles} set={setPublicProfiles} />
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="ap-settings-panel">
              <h3>Appearance</h3>
              <p className="ap-settings-desc">Customize the look and feel of the platform.</p>
              <div className="ap-field"><label>Primary Brand Color</label><input type="color" className="ap-input" defaultValue="#2d8f6f" style={{ height:44, cursor:'pointer' }} /></div>
              <div className="ap-field"><label>Platform Tagline</label><input className="ap-input" defaultValue="Rwanda's trusted review platform" /></div>
              <div className="ap-appearance-themes">
                <div className="ap-theme-option active"><div className="ap-theme-preview light"></div><span>Light</span></div>
                <div className="ap-theme-option"><div className="ap-theme-preview dark"></div><span>Dark</span></div>
                <div className="ap-theme-option"><div className="ap-theme-preview system"></div><span>System</span></div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="ap-settings-panel">
              <h3>Email Notifications</h3>
              <p className="ap-settings-desc">Configure automated email alerts.</p>
              <ToggleRow label="Email Notifications" sub="Send automated emails on key platform events" val={emailNotifs} set={setEmailNotifs} />
              <ToggleRow label="New Review Alerts" sub="Notify businesses when they receive a new review" val={reviewAlerts} set={setReviewAlerts} />
              <ToggleRow label="Claim Alerts" sub="Notify admins when a business claim is submitted" val={claimAlerts} set={setClaimAlerts} />
              <ToggleRow label="Weekly Digest" sub="Send weekly summary emails to active users" val={weeklyDigest} set={setWeeklyDigest} />
            </div>
          )}

          {activeTab === 'security' && (
            <div className="ap-settings-panel">
              <h3>Security Settings</h3>
              <p className="ap-settings-desc">Control access and anti-abuse settings.</p>
              <ToggleRow label="Require Email Verification" sub="Users must verify their email before writing reviews" val={requireEmailVerify} set={setRequireEmailVerify} />
              <div className="ap-field" style={{ marginTop:'var(--sp-5)' }}>
                <label>Max Reviews per User per Day</label>
                <input className="ap-input" type="number" min={1} max={50} value={maxReviewsPerDay}
                  onChange={e => setMaxReviewsPerDay(parseInt(e.target.value))} style={{ maxWidth:120 }} />
              </div>
              <div className="ap-field">
                <label>Minimum Account Age (days) to Write Reviews</label>
                <input className="ap-input" type="number" min={0} max={30} value={minAccountAge}
                  onChange={e => setMinAccountAge(parseInt(e.target.value))} style={{ maxWidth:120 }} />
              </div>
              <div style={{marginTop:24,paddingTop:24,borderTop:'1px solid var(--border)'}}>
                <AdminTwoFactor adminId={user?.uid} isSuperAdmin={isSuperAdmin} />
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
