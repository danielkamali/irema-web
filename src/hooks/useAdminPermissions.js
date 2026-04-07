// src/hooks/useAdminPermissions.js
import { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let _cache = null;
let _cacheTime = 0;

export function useAdminPermissions() {
  const { user } = useAuthStore();
  const [permissions, setPermissions] = useState(_cache || []);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    if (_cache && (now - _cacheTime < CACHE_TTL_MS)) { setPermissions(_cache); setLoading(false); return; }

    (async () => {
      try {
        const adminSnap = await getDoc(doc(db, 'admin_users', user.uid));
        if (!adminSnap.exists()) { setLoading(false); return; }
        const adminData = adminSnap.data();
        const roleName = adminData.role || 'Super Admin';
        setRole(roleName);

        if (roleName === 'Super Admin') {
          _cache = ['*'];
          _cacheTime = Date.now();
          setPermissions(['*']);
          setLoading(false);
          return;
        }

        const roleSnap = await getDocs(collection(db, 'admin_roles'));
        const roleDoc = roleSnap.docs.find(d => d.data().name === roleName);
        if (roleDoc) {
          const perms = roleDoc.data().permissions || [];
          _cache = perms;
          _cacheTime = Date.now();
          setPermissions(perms);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [user?.uid]);

  function can(permission) {
    if (!permissions.length) return false;
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
  }

  return { can, permissions, role, loading };
}

export function clearPermissionsCache() { _cache = null; _cacheTime = 0; }
