// src/hooks/useAuth.js
import { useEffect } from 'react';
import { auth, db, doc, getDoc, onAuthStateChanged } from '../firebase/config';
import { useAuthStore } from '../store/authStore';
import { clearPermissionsCache } from './useAdminPermissions';

export function useAuthInit() {
  const { setUser, setUserProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          setUserProfile(userDoc.exists() ? userDoc.data() : null);
        } catch {
          setUserProfile(null);
        }
      } else {
        clearPermissionsCache();
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);
}
