// src/store/authStore.js
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  userProfile: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  setUserProfile: (userProfile) => set({ userProfile }),
  setLoading: (loading) => set({ loading }),
  clear: () => set({ user: null, userProfile: null, loading: false }),
}));
