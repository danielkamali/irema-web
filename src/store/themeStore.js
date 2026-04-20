import { create } from 'zustand';

// Default to light mode on first visit regardless of OS preference.
// Only switch to dark if the user explicitly chose it and we stored that
// choice in localStorage — otherwise we start light and let them toggle.
const saved = localStorage.getItem('irema_theme') === 'dark' ? 'dark' : 'light';

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
