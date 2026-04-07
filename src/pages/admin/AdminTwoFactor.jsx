import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';
import './AdminPages.css';

const TOTP_KEY = 'Irema2FA_v1'; // In production, use Firebase config or env var

function base32ToBytes(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of base32.toUpperCase()) {
    const val = alphabet.indexOf(c);
    if (val < 0) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

async function encryptSecret(plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(TOTP_KEY));
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, new TextEncoder().encode(plaintext));
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptSecret(ciphertext) {
  try {
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const keyBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(TOTP_KEY));
    const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, data);
    return new TextDecoder().decode(decrypted);
  } catch { return null; }
}

function generateTOTPSecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let s = '';
  const arr = crypto.getRandomValues(new Uint8Array(20));
  arr.forEach(b => { s += chars[b % 32]; });
  return s;
}

async function getTOTPCode(secret, timestampMs) {
  const period = 30;
  const counter = Math.floor((timestampMs || Date.now()) / 1000 / period);
  const msgBytes = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) { msgBytes[i] = c & 0xff; c = Math.floor(c / 256); }
  const keyBytes = base32ToBytes(secret);
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const hmacBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgBytes);
  const hmacArray = new Uint8Array(hmacBuffer);
  const offset = hmacArray[hmacArray.length - 1] & 0xf;
  const binary = ((hmacArray[offset] & 0x7f) << 24) | ((hmacArray[offset + 1] & 0xff) << 16) | ((hmacArray[offset + 2] & 0xff) << 8) | (hmacArray[offset + 3] & 0xff);
  const otp = binary % 1000000;
  return String(otp).padStart(6, '0');
}

async function verifyTOTP(secret, code) {
  const now = Date.now();
  for (let i = -1; i <= 1; i++) {
    const expected = await getTOTPCode(secret, now + i * 30000);
    if (expected === code.trim()) return true;
  }
  return false;
}

export default function AdminTwoFactor({ adminId, isSuperAdmin }) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [twoFAStatus, setTwoFAStatus] = useState(null); // null=loading
  const [secret, setSecret] = useState('');
  const [qrUri, setQrUri] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState('check'); // check | setup | verify | enabled
  const [admins, setAdmins] = useState([]);
  const [enforced, setEnforced] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    (async () => {
      if (!user) return;
      const snap = await getDoc(doc(db, 'admin_2fa', user.uid)).catch(()=>null);
      if (snap?.exists()) {
        const data = snap.data();
        if (data.enabled) { setTwoFAStatus('enabled'); setStep('enabled'); }
        else { setTwoFAStatus('disabled'); setStep('setup'); }
        if (data.secret) {
          const decrypted = await decryptSecret(data.secret);
          if (decrypted) setSecret(decrypted);
        }
      } else {
        setTwoFAStatus('disabled'); setStep('setup');
      }
      // Load enforced setting
      const settingsSnap = await getDoc(doc(db, 'admin_settings', 'security')).catch(()=>null);
      if (settingsSnap?.exists()) setEnforced(settingsSnap.data().require2FA || false);
      // Load all admins (for super admin view)
      if (isSuperAdmin) {
        const aSnap = await getDocs(collection(db, 'admin_users')).catch(()=>({docs:[]}));
        const a2faSnap = await getDocs(collection(db, 'admin_2fa')).catch(()=>({docs:[]}));
        const a2faMap = {};
        a2faSnap.docs.forEach(d => { a2faMap[d.id] = d.data(); });
        setAdmins(aSnap.docs.map(d => ({ id:d.id, ...d.data(), twoFA: a2faMap[d.id] || null })));
      }
    })();
  }, [user, isSuperAdmin]);

  async function startSetup() {
    const s = generateTOTPSecret();
    setSecret(s);
    const uri = `otpauth://totp/Irema%20Admin:${encodeURIComponent(user?.email||'')}?secret=${s}&issuer=Irema&algorithm=SHA1&digits=6&period=30`;
    setQrUri(uri);
    setStep('setup');
  }

  async function verifyAndEnable() {
    if (!verifyCode.trim() || verifyCode.length !== 6) { setVerifyError('Enter the 6-digit code from your authenticator app.'); return; }
    setSaving(true);
    try {
      const valid = await verifyTOTP(secret, verifyCode);
      if (!valid) { setVerifyError('Invalid code. Make sure your device time is correct and try again.'); setSaving(false); return; }
      const encryptedSecret = await encryptSecret(secret);
      await setDoc(doc(db, 'admin_2fa', user.uid), {
        enabled: true, secret: encryptedSecret, verifiedAt: serverTimestamp(), email: user.email
      });
      await updateDoc(doc(db, 'admin_users', user.uid), { twoFAEnabled: true }).catch(()=>{});
      setStep('enabled'); setTwoFAStatus('enabled');
      showToast('Two-factor authentication enabled!');
    } catch(e) { setVerifyError(e.message); }
    setSaving(false);
  }

  async function disable2FA() {
    if (!window.confirm('Disable two-factor authentication? This will make your account less secure.')) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'admin_2fa', user.uid), { enabled: false, disabledAt: serverTimestamp() });
      await updateDoc(doc(db, 'admin_users', user.uid), { twoFAEnabled: false }).catch(()=>{});
      setStep('setup'); setTwoFAStatus('disabled');
      showToast('2FA disabled.');
    } catch(e) { showToast(e.message, 'error'); }
    setSaving(false);
  }

  async function toggleEnforce(val) {
    setSaving(true);
    try {
      await setDoc(doc(db, 'admin_settings', 'security'), { require2FA: val, updatedAt: serverTimestamp(), updatedBy: user?.email }, { merge: true });
      setEnforced(val);
      showToast(val ? '2FA requirement enforced for all admins.' : '2FA requirement removed.');
    } catch(e) { showToast(e.message, 'error'); }
    setSaving(false);
  }

  if (twoFAStatus === null) return <div className="ap-spinner" />;

  return (
    <div className="tfa-container">
      {toast && <div className={`ap-toast ap-toast-${toast.type}`}>{toast.msg}</div>}

      <div className="tfa-card">
        <div className="tfa-header">
          <div className="tfa-icon">🔐</div>
          <div>
            <h3 className="tfa-title">Two-Factor Authentication</h3>
            <p className="tfa-sub">Add an extra layer of security to your admin account</p>
          </div>
          <span className={`ap-badge ${step==='enabled'?'green':'yellow'}`}>
            {step==='enabled' ? '✓ Enabled' : 'Not enabled'}
          </span>
        </div>

        {step === 'enabled' ? (
          <div className="tfa-enabled-view">
            <div className="tfa-success">
              <div style={{fontSize:'2.5rem',marginBottom:8}}>✅</div>
              <p>Your account is protected with two-factor authentication.</p>
              <p style={{fontSize:'0.75rem',color:'var(--text-4)',marginTop:6}}>
                You'll need your authenticator app whenever you log in.
              </p>
            </div>
            <button className="ap-btn ap-btn-danger" onClick={disable2FA} disabled={saving}>
              Disable 2FA
            </button>
          </div>
        ) : (
          <div className="tfa-setup-view">
            <div className="tfa-step-block">
              <div className="tfa-step-num">1</div>
              <div className="tfa-step-body">
                <strong>Install an authenticator app</strong>
                <p>Google Authenticator, Authy, or Microsoft Authenticator</p>
              </div>
            </div>
            <div className="tfa-step-block">
              <div className="tfa-step-num">2</div>
              <div className="tfa-step-body">
                <strong>Scan the QR code or enter the key manually</strong>
                {!secret ? (
                  <button className="ap-btn ap-btn-primary" style={{marginTop:10}} onClick={startSetup}>
                    Generate Setup Code
                  </button>
                ) : (
                  <div style={{marginTop:12}}>
                    <div className="tfa-qr-wrap">
                      {/* QR code via qrserver.com API */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrUri)}`}
                        alt="2FA QR Code" className="tfa-qr-img"
                      />
                    </div>
                    <div className="tfa-secret-key">
                      <span className="tfa-secret-label">Manual key:</span>
                      <code className="tfa-secret">{secret}</code>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="tfa-step-block">
              <div className="tfa-step-num">3</div>
              <div className="tfa-step-body">
                <strong>Enter the 6-digit verification code</strong>
                {verifyError && <div style={{color:'var(--error)',fontSize:'0.8rem',marginTop:4}}>{verifyError}</div>}
                <div style={{display:'flex',gap:8,marginTop:10}}>
                  <input
                    className="ap-input" maxLength={6} placeholder="000000" style={{maxWidth:140,letterSpacing:'0.15em',fontSize:'1.1rem'}}
                    value={verifyCode} onChange={e=>setVerifyCode(e.target.value.replace(/\D/g,''))}
                  />
                  <button className="ap-btn ap-btn-primary" onClick={verifyAndEnable} disabled={saving||!secret}>
                    {saving?'Verifying…':'Enable 2FA'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Super admin: enforce 2FA for all */}
      {isSuperAdmin && (
        <div className="tfa-card" style={{marginTop:16}}>
          <div className="tfa-header">
            <div className="tfa-icon">🛡️</div>
            <div>
              <h3 className="tfa-title">Organization-wide 2FA Policy</h3>
              <p className="tfa-sub">Require all administrators to enable 2FA before accessing the panel</p>
            </div>
          </div>
          <div className="ap-toggle-row">
            <div className="ap-toggle-info">
              <strong>Require 2FA for all admins</strong>
              <span>Admins without 2FA will be prompted to enable it on login</span>
            </div>
            <label className="ap-toggle">
              <input type="checkbox" checked={enforced} onChange={e=>toggleEnforce(e.target.checked)} />
              <span className="ap-toggle-slider"/>
            </label>
          </div>

          {/* Admin 2FA status table */}
          <div style={{marginTop:20}}>
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead>
                  <tr><th>Administrator</th><th>Email</th><th>2FA Status</th></tr>
                </thead>
                <tbody>
                  {admins.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div className="ap-table-user">
                          <div className="ap-table-avatar">{(a.displayName||a.email||'A')[0].toUpperCase()}</div>
                          <span className="ap-table-name">{a.displayName||'—'}</span>
                        </div>
                      </td>
                      <td style={{fontSize:'0.82rem',color:'var(--text-3)'}}>{a.email}</td>
                      <td>
                        <span className={`ap-badge ${a.twoFA?.enabled ? 'green' : 'red'}`}>
                          {a.twoFA?.enabled ? '✓ Enabled' : '✗ Not enabled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {admins.length === 0 && (
                    <tr><td colSpan={3} style={{textAlign:'center',color:'var(--text-4)',padding:'20px'}}>No administrators found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
