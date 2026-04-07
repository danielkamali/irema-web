import { create } from 'zustand';

const saved = localStorage.getItem('irema_theme') || 
  (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

export const useThemeStore = create((set) => ({
  theme: saved,
  toggle: () => set((state) => {
    const next = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('irema_theme', next);
    document.documentElement.setAttribute('data-theme', next);
    return { theme: next };
  }),
  init: () => {
    document.documentElement.setAttribute('data-theme', saved);
  },
}));
