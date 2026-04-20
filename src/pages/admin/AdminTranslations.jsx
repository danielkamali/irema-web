import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';
import { loadTranslationOverrides } from '../../i18n';
import AdminLayout from './AdminLayout';
import './AdminPages.css';
import './AdminTranslations.css';

import rwSource from '../../i18n/rw.json';
import frSource from '../../i18n/fr.json';
import swSource from '../../i18n/sw.json';
import enSource from '../../i18n/en.json';

const LANG_TABS = [
  { code: 'en', label: 'English',     flag: 'EN' },
  { code: 'rw', label: 'Kinyarwanda', flag: 'RW' },
  { code: 'fr', label: 'Français',    flag: 'FR' },
  { code: 'sw', label: 'Kiswahili',   flag: 'SW' },
];

const SECTIONS = [
  { key: 'nav',          label: 'Top navigation bar',         group: 'user' },
  { key: 'time',         label: 'Dates & time labels',         group: 'user' },
  { key: 'home',         label: 'Home page (hero, sections)',  group: 'user' },
  { key: 'categories',   label: 'Business categories',         group: 'user' },
  { key: 'review',       label: 'Review form & cards',         group: 'user' },
  { key: 'auth',         label: 'Login & sign-up modal',       group: 'user' },
  { key: 'company',      label: 'Business detail page',         group: 'user' },
  { key: 'profile',      label: 'User profile / dashboard',     group: 'user' },
  { key: 'search',       label: 'Search results page',          group: 'user' },
  { key: 'biz',          label: 'Business owner portal',       group: 'business' },
  { key: 'cd',           label: 'Company dashboard',            group: 'business' },
  { key: 'admin',        label: 'Admin sidebar & dashboard',    group: 'admin' },
  { key: 'admin_login',  label: 'Admin login page',             group: 'admin' },
  { key: 'common',       label: 'Buttons, errors, shared text', group: 'shared' },
];

function flattenObj(obj, prefix = '') {
  return Object.entries(obj || {}).reduce((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      // Nested object — recurse so child keys get dot-path names.
      Object.assign(acc, flattenObj(v, key));
    } else {
      // Leaf value (string, number, boolean, or array) — this is the editable entry.
      acc[key] = v;
    }
    return acc;
  }, {});
}

export default function AdminTranslations() {
  const { user } = useAuthStore();
  const [activeLang, setActiveLang] = useState('en');
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

  const sourceMap = { en: enSource, rw: rwSource, fr: frSource, sw: swSource };
  const activeSource = sourceMap[activeLang];

  useEffect(() => {
    (async () => {
      try {
        const langs = ['en', 'rw', 'fr', 'sw'];
        const snaps = await Promise.all(
          langs.map(l =>
            getDoc(doc(db, 'admin_settings', `translations_${l}`))
              .catch(() => ({ exists: () => false, data: () => ({}) }))
          )
        );
        const allEdits = {};
        langs.forEach((l, idx) => {
          const snap = snaps[idx];
          if (snap && snap.exists()) {
            const data = snap.data();
            Object.keys(data).forEach(k => {
              if (!k.startsWith('_')) allEdits[`${l}:${k}`] = data[k];
            });
          }
        });
        setEdits(allEdits);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  function getSectionKeys(sectionKey) {
    const section = activeSource[sectionKey];
    if (!section) return [];
    // Prefix with the section name so keys are stored as full dot-paths
    // (e.g. "nav.write_review") — matching how the app calls t() and how
    // the Firestore loader unflattens back into i18n resources.
    const flat = flattenObj(
      typeof section === 'object' ? section : { [sectionKey]: section },
      sectionKey
    );
    return Object.entries(flat);
  }

  function getEntries() {
    const raw = getSectionKeys(activeSection);
    return raw.filter(([key, val]) => {
      if (!search) return true;
      const editKey = `${activeLang}:${key}`;
      const hasEdit = edits[editKey] !== undefined;
      const enVal = flattenObj(enSource[activeSection] || {}, activeSection)[key] || '';
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
    // Clear the "✓ Saved" badge on this key — it's now dirty again.
    setSavedKeys(prev => {
      const next = new Set(prev);
      next.delete(editKey);
      return next;
    });
  }

  function resetKey(key) {
    const editKey = `${activeLang}:${key}`;
    setEdits(prev => {
      const next = { ...prev };
      delete next[editKey];
      return next;
    });
    setSavedKeys(prev => {
      const next = new Set(prev);
      next.delete(editKey);
      return next;
    });
  }

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
      // Pull the just-saved overrides back into the live app so every open tab
      // (admin + user-facing) updates without a browser reload.
      await loadTranslationOverrides();
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
      await loadTranslationOverrides();
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
          <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginTop: 4, maxWidth: 720 }}>
            Edit any text that appears on the live site. <strong>Step 1:</strong> pick a language tab.
            {' '}<strong>Step 2:</strong> pick a section on the left that matches the part of the site you want to change
            (e.g. "Home page" or "Top navigation bar"). <strong>Step 3:</strong> edit the value next to each phrase
            and click Save. Tip: use the search box below to find a specific phrase by typing what you see on the site.
          </p>
        </div>
        <div className="tx-header-actions">
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
                const sectionKeys = flattenObj(activeSource[sec.key] || {}, sec.key);
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
                placeholder='Type what you see on the site — e.g. "Top Rated" or "Welcome"'
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

                const displayValue = hasEdit ? editedValue : String(sourceValue);
                const needsTextarea = displayValue.length > 80;
                const wordCount = displayValue.split(/\s+/).filter(Boolean).length;

                return (
                  <div key={key} className={`tx-entry${hasEdit ? ' tx-entry--edited' : ''}`}>
                    <div className="tx-entry-header" style={{ alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Big label shows the phrase in the CURRENT language — matches what the admin is editing below */}
                        <div style={{
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          color: 'var(--ink-2, #1a1a1a)',
                          lineHeight: 1.35,
                          wordBreak: 'break-word',
                        }}>
                          {displayValue || <em style={{ color: 'var(--text-4)' }}>(empty)</em>}
                        </div>
                        {/* Small key badge underneath — for developers who need to know the technical id */}
                        <code style={{
                          display: 'inline-block',
                          marginTop: 4,
                          fontSize: '0.7rem',
                          color: 'var(--text-4, #9ca3af)',
                          background: 'var(--bg, #f9fafb)',
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}>{key}</code>
                      </div>
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
