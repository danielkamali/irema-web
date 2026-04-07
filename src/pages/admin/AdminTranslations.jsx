import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';
import AdminLayout from './AdminLayout';
import './AdminPages.css';
import './AdminTranslations.css';

import rwSource from '../../i18n/rw.json';
import frSource from '../../i18n/fr.json';
import swSource from '../../i18n/sw.json';
import enSource from '../../i18n/en.json';

const LANG_TABS = [
  { code: 'rw', label: 'Kinyarwanda', flag: '🇷🇼' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'sw', label: 'Kiswahili', flag: '🇹🇿' },
];

const SECTIONS = [
  { key: 'nav',          label: 'Navbar & Navigation',  group: 'user' },
  { key: 'time',         label: 'Time & Dates',          group: 'user' },
  { key: 'home',         label: 'Homepage',              group: 'user' },
  { key: 'categories',   label: 'Categories',            group: 'user' },
  { key: 'review',       label: 'Reviews',               group: 'user' },
  { key: 'auth',         label: 'Login / Sign Up',       group: 'user' },
  { key: 'company',      label: 'Company Page',           group: 'user' },
  { key: 'profile',      label: 'User Profile',           group: 'user' },
  { key: 'search',       label: 'Search Results',         group: 'user' },
  { key: 'biz',          label: 'Business Portal',       group: 'business' },
  { key: 'cd',           label: 'Company Dashboard',     group: 'business' },
  { key: 'admin',        label: 'Admin Panel',           group: 'admin' },
  { key: 'admin_login',  label: 'Admin Login',           group: 'admin' },
  { key: 'common',       label: 'Common / Shared',       group: 'shared' },
];

function flattenObj(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(acc, flattenObj(v, key));
    }
    return acc;
  }, {});
}

export default function AdminTranslations() {
  const { user } = useAuthStore();
  const [activeLang, setActiveLang] = useState('rw');
  const [activeSection, setActiveSection] = useState('nav');
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedKeys, setSavedKeys] = useState(new Set());
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [diffOnly, setDiffOnly] = useState(false);
  const searchRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const sourceMap = { rw: rwSource, fr: frSource, sw: swSource };
  const activeSource = sourceMap[activeLang];

  useEffect(() => {
    (async () => {
      try {
        const [rwSnap, frSnap, swSnap] = await Promise.all([
          getDoc(doc(db, 'admin_settings', 'translations_rw')).catch(() => ({ exists: () => false, data: () => ({}) })),
          getDoc(doc(db, 'admin_settings', 'translations_fr')).catch(() => ({ exists: () => false, data: () => ({}) })),
          getDoc(doc(db, 'admin_settings', 'translations_sw')).catch(() => ({ exists: () => false, data: () => ({}) })),
        ]);
        const allEdits = {};
        if (rwSnap.exists()) {
          const data = rwSnap.data();
          Object.keys(data).forEach(k => { if (!k.startsWith('_')) allEdits[`rw:${k}`] = data[k]; });
        }
        if (frSnap.exists()) {
          const data = frSnap.data();
          Object.keys(data).forEach(k => { if (!k.startsWith('_')) allEdits[`fr:${k}`] = data[k]; });
        }
        if (swSnap.exists()) {
          const data = swSnap.data();
          Object.keys(data).forEach(k => { if (!k.startsWith('_')) allEdits[`sw:${k}`] = data[k]; });
        }
        setEdits(allEdits);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  function getSectionKeys(sectionKey) {
    const section = activeSource[sectionKey];
    if (!section) return [];
    const flat = flattenObj(typeof section === 'object' ? section : { [sectionKey]: section }, '');
    return Object.entries(flat);
  }

  function getEntries() {
    const raw = getSectionKeys(activeSection);
    return raw.filter(([key, val]) => {
      if (!search) return true;
      const editKey = `${activeLang}:${key}`;
      const hasEdit = edits[editKey] !== undefined;
      const enVal = flattenObj(enSource[activeSection] || {})[key] || '';
      const match = k => k.toLowerCase().includes(search.toLowerCase());
      if (match(key)) return true;
      if (match(String(val))) return true;
      if (hasEdit && match(String(edits[editKey]))) return true;
      if (diffOnly && !hasEdit) return false;
      if (match(String(enVal))) return true;
      return false;
    });
  }

  function handleEdit(key, value) {
    const editKey = `${activeLang}:${key}`;
    setEdits(prev => ({ ...prev, [editKey]: value }));
    setSavedKeys(prev => { const n = new Set(n); n.delete(editKey); return n; });
  }

  function resetKey(key) {
    const editKey = `${activeLang}:${key}`;
    setEdits(prev => { const n = { ...prev }; delete n[editKey]; return n; });
    setSavedKeys(prev => { const n = new Set(n); delete n[deleteSymbol(key)]; return n; });
  }

  function deleteSymbol(k) { return k; }

  async function saveSection() {
    setSaving(true);
    try {
      const entries = getEntries();
      const sectionEdits = {};
      entries.forEach(([key]) => {
        const editKey = `${activeLang}:${key}`;
        if (edits[editKey] !== undefined) {
          sectionEdits[key] = edits[editKey];
        }
      });
      await setDoc(doc(db, 'admin_settings', `translations_${activeLang}`), {
        ...sectionEdits,
        _updatedAt: serverTimestamp(),
        _updatedBy: user?.email,
      }, { merge: true });
      const newSaved = new Set(savedKeys);
      entries.forEach(([key]) => newSaved.add(`${activeLang}:${key}`));
      setSavedKeys(newSaved);
      showToast(`✓ Saved ${Object.keys(sectionEdits).length} keys in "${SECTIONS.find(s => s.key === activeSection)?.label}" (${activeLang.toUpperCase()})`);
    } catch (e) { showToast(e.message, 'error'); }
    setSaving(false);
  }

  async function saveAll() {
    setSaving(true);
    try {
      const langEdits = {};
      Object.entries(edits).forEach(([k, v]) => {
        if (k.startsWith(`${activeLang}:`)) langEdits[k] = v;
      });
      await setDoc(doc(db, 'admin_settings', `translations_${activeLang}`), {
        ...langEdits,
        _updatedAt: serverTimestamp(),
        _updatedBy: user?.email,
      }, { merge: true });
      const newSaved = new Set(savedKeys);
      Object.keys(langEdits).forEach(k => newSaved.add(k));
      setSavedKeys(newSaved);
      showToast(`✓ Saved all ${Object.keys(langEdits).length} edits for ${activeLang.toUpperCase()}`);
    } catch (e) { showToast(e.message, 'error'); }
    setSaving(false);
  }

  async function resetSection() {
    if (!window.confirm(`Reset all edits in "${SECTIONS.find(s => s.key === activeSection)?.label}" for ${activeLang.toUpperCase()}?`)) return;
    const entries = getEntries();
    setEdits(prev => {
      const next = { ...prev };
      entries.forEach(([key]) => delete next[`${activeLang}:${key}`]);
      return next;
    });
    setSavedKeys(prev => {
      const next = new Set(prev);
      entries.forEach(([key]) => next.delete(`${activeLang}:${key}`));
      return next;
    });
    showToast('Section reset to original values');
  }

  const entries = getEntries();
  const totalEdits = Object.keys(edits).filter(k => k.startsWith(`${activeLang}:`)).length;
  const sectionEdits = entries.filter(([k]) => edits[`${activeLang}:${k}`] !== undefined).length;

  const groupedSections = {
    user: SECTIONS.filter(s => s.group === 'user'),
    business: SECTIONS.filter(s => s.group === 'business'),
    admin: SECTIONS.filter(s => s.group === 'admin'),
    shared: SECTIONS.filter(s => s.group === 'shared'),
  };

  return (
    <AdminLayout>
      {toast && (
        <div className={`ap-toast ap-toast-${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      <div className="ap-page-header">
        <div>
          <h1 className="ap-page-title">Platform Translations</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginTop: 4 }}>
            Edit all visible text across user, business, and admin pages. Changes apply to the selected language.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="ap-btn ap-btn-ghost" onClick={resetSection} disabled={saving || sectionEdits === 0}>
            Reset Section
          </button>
          <button className="ap-btn ap-btn-primary" onClick={saveSection} disabled={saving}>
            {saving ? 'Saving…' : `Save "${SECTIONS.find(s => s.key === activeSection)?.label}"`}
          </button>
        </div>
      </div>

      <div className="tx-lang-tabs">
        {LANG_TABS.map(tab => {
          const tabEdits = Object.keys(edits).filter(k => k.startsWith(`${tab.code}:`)).length;
          return (
            <button
              key={tab.code}
              className={`tx-lang-tab${activeLang === tab.code ? ' active' : ''}`}
              onClick={() => { setActiveLang(tab.code); setActiveSection('nav'); setSearch(''); }}
            >
              <span>{tab.flag}</span>
              <span>{tab.label}</span>
              {tabEdits > 0 && <span className="tx-lang-badge">{tabEdits}</span>}
            </button>
          );
        })}
        <div className="tx-lang-sep" />
        <button
          className="ap-btn ap-btn-ghost tx-save-all-btn"
          onClick={saveAll}
          disabled={saving || totalEdits === 0}
          style={{ fontSize: '0.8rem', padding: '6px 14px' }}
        >
          {saving ? 'Saving…' : `Save All ${activeLang.toUpperCase()} (${totalEdits})`}
        </button>
      </div>

      <div className="tx-layout">
        <div className="tx-sidebar">
          {Object.entries(groupedSections).map(([group, sections]) => (
            <div key={group} className="tx-group">
              <div className="tx-group-label">{group.toUpperCase()}</div>
              {sections.map(sec => {
                const sectionKeys = flattenObj(activeSource[sec.key] || {});
                const edited = Object.keys(sectionKeys).filter(k => edits[`${activeLang}:${k}`] !== undefined).length;
                return (
                  <button
                    key={sec.key}
                    className={`tx-section-btn${activeSection === sec.key ? ' active' : ''}`}
                    onClick={() => { setActiveSection(sec.key); setSearch(''); }}
                  >
                    <span className="tx-section-label">{sec.label}</span>
                    {edited > 0 && <span className="tx-section-badge">{edited}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="tx-content">
          <div className="tx-toolbar">
            <div className="tx-search-wrap">
              <svg className="tx-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search keys or values…"
                className="tx-search-input"
              />
              {search && (
                <button onClick={() => setSearch('')} className="tx-search-clear">✕</button>
              )}
            </div>
            <label className="tx-diff-toggle">
              <input type="checkbox" checked={diffOnly} onChange={e => setDiffOnly(e.target.checked)} />
              <span>Show edited only</span>
            </label>
            <span className="tx-count">
              {entries.length} key{entries.length !== 1 ? 's' : ''}
              {sectionEdits > 0 && <span style={{ color: 'var(--brand)', fontWeight: 700 }}> · {sectionEdits} edited</span>}
            </span>
          </div>

          {loading ? (
            <div className="tx-loading"><div className="ap-spinner" /></div>
          ) : entries.length === 0 ? (
            <div className="tx-empty">
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
              <p>No keys found{search ? ` matching "${search}"` : ''}.</p>
              {diffOnly && <p style={{ color: 'var(--text-3)', marginTop: 4 }}>All keys in this section match the source.</p>}
            </div>
          ) : (
            <div className="tx-entries">
              {entries.map(([key, sourceValue]) => {
                const editKey = `${activeLang}:${key}`;
                const editedValue = edits[editKey];
                const hasEdit = editedValue !== undefined;
                const isSaved = savedKeys.has(editKey);
                const enRef = flattenObj(enSource[activeSection] || {})[key] || '';

                const displayValue = hasEdit ? editedValue : String(sourceValue);
                const needsTextarea = displayValue.length > 80;
                const wordCount = displayValue.split(/\s+/).filter(Boolean).length;

                return (
                  <div key={key} className={`tx-entry${hasEdit ? ' tx-entry--edited' : ''}`}>
                    <div className="tx-entry-header">
                      <code className="tx-entry-key">{key}</code>
                      <div className="tx-entry-actions">
                        {hasEdit && (
                          <button className="tx-btn tx-btn-ghost tx-btn-sm" onClick={() => resetKey(key)} title="Reset to original">
                            Reset
                          </button>
                        )}
                        {isSaved && <span className="tx-saved-badge">✓ Saved</span>}
                      </div>
                    </div>

                    <div className="tx-entry-body">
                      <div className="tx-entry-ref">
                        <span className="tx-ref-label">EN ref:</span>
                        <span className="tx-ref-value">{enRef || <em style={{ color: 'var(--text-4)' }}>not in EN</em>}</span>
                      </div>

                      {hasEdit && (
                        <div className="tx-entry-original">
                          <span className="tx-ref-label">Original:</span>
                          <span className="tx-ref-value" style={{ fontStyle: 'italic', color: 'var(--text-3)' }}>{String(sourceValue)}</span>
                        </div>
                      )}

                      {needsTextarea ? (
                        <textarea
                          className="tx-textarea"
                          value={displayValue}
                          onChange={e => handleEdit(key, e.target.value)}
                          rows={Math.max(3, Math.min(10, Math.ceil(displayValue.length / 60)))}
                        />
                      ) : (
                        <input
                          type="text"
                          className="tx-input"
                          value={displayValue}
                          onChange={e => handleEdit(key, e.target.value)}
                        />
                      )}
                      <div className="tx-entry-meta">
                        <span>{wordCount} word{wordCount !== 1 ? 's' : ''} · {displayValue.length} chars</span>
                        {hasEdit && <span className="tx-edited-indicator">● edited</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
