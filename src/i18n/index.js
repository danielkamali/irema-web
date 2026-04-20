import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

import en from './en.json';
import fr from './fr.json';
import rw from './rw.json';
import sw from './sw.json';

const SUPPORTED_LANGS = ['en', 'fr', 'rw', 'sw'];
const OVERRIDE_CACHE_KEY = 'irema_i18n_overrides_v1';

const savedLang = localStorage.getItem('irema_lang') || 'en';

/**
 * Read cached overrides (written by the async Firestore fetch below) so
 * that on subsequent visits the admin-edited copy is applied synchronously,
 * BEFORE React mounts — no more flash where the default en.json value
 * ("Write a Review") briefly appears instead of the overridden text
 * ("Share your experience").
 */
function readCachedOverrides() {
  try {
    const raw = localStorage.getItem(OVERRIDE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch {
    return {};
  }
}

// Build initial resources by deep-merging cached overrides on top of the
// static JSON bundles. Merging has to happen BEFORE i18n.init so consumers
// receive the overridden values on their very first render.
function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      target[k] = deepMerge({ ...(target[k] || {}) }, v);
    } else {
      target[k] = v;
    }
  }
  return target;
}

const cached = readCachedOverrides();
const initialResources = {
  en: { translation: deepMerge({ ...en }, cached.en || {}) },
  fr: { translation: deepMerge({ ...fr }, cached.fr || {}) },
  rw: { translation: deepMerge({ ...rw }, cached.rw || {}) },
  sw: { translation: deepMerge({ ...sw }, cached.sw || {}) },
};

i18n
  .use(initReactI18next)
  .init({
    resources: initialResources,
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

/**
 * Convert flat dot-path keys (as saved by the AdminTranslations page)
 * into a nested object that i18next understands.
 *   { "nav.home": "Murugo" }  →  { nav: { home: "Murugo" } }
 * Meta keys beginning with "_" (e.g. _updatedAt, _updatedBy) are skipped.
 */
function unflatten(flat) {
  const out = {};
  for (const [path, value] of Object.entries(flat || {})) {
    if (!path || path.startsWith('_')) continue;
    const parts = path.split('.');
    let cursor = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      if (!cursor[seg] || typeof cursor[seg] !== 'object') cursor[seg] = {};
      cursor = cursor[seg];
    }
    cursor[parts[parts.length - 1]] = value;
  }
  return out;
}

/**
 * Fetch admin-edited translation overrides from Firestore and deep-merge
 * them into the live i18n resources. Safe to call at boot and immediately
 * after an admin saves. Failures are swallowed so the app continues to
 * render using the static JSON if Firestore is unreachable.
 */
export async function loadTranslationOverrides() {
  try {
    const snaps = await Promise.all(
      SUPPORTED_LANGS.map(lang =>
        getDoc(doc(db, 'admin_settings', `translations_${lang}`))
          .catch(() => null)
      )
    );
    let appliedAny = false;
    const cachePayload = {};
    SUPPORTED_LANGS.forEach((lang, idx) => {
      const snap = snaps[idx];
      if (!snap || !snap.exists()) return;
      const overrides = unflatten(snap.data());
      if (Object.keys(overrides).length === 0) return;
      // args: (lng, ns, resources, deep, overwrite)
      i18n.addResourceBundle(lang, 'translation', overrides, true, true);
      cachePayload[lang] = overrides;
      appliedAny = true;
    });
    if (appliedAny) {
      // Persist for synchronous application on next page load — kills the
      // "Write a Review" → "Share your experience" flash on refresh.
      try {
        localStorage.setItem(OVERRIDE_CACHE_KEY, JSON.stringify(cachePayload));
      } catch {}
      // Nudge react-i18next consumers to re-render with the merged values.
      i18n.changeLanguage(i18n.language);
    }
    return appliedAny;
  } catch (err) {
    console.warn('[i18n] Could not load translation overrides:', err);
    return false;
  }
}

// Kick off the initial load — non-blocking so the app boots instantly on
// static JSON and upgrades to override-included copy as soon as Firestore
// responds (usually a few hundred ms).
loadTranslationOverrides();

export default i18n;
