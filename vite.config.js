import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': '/src' } },
  server: { historyApiFallback: true },
  preview: { historyApiFallback: true },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk — React + Router
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Firebase core
          'vendor-firebase-app': ['firebase/app'],
          'vendor-firebase-auth': ['firebase/auth'],
          'vendor-firebase-firestore': ['firebase/firestore'],
          'vendor-firebase-storage': ['firebase/storage'],
          // i18n
          'vendor-i18n': ['i18next', 'react-i18next'],
          // State
          'vendor-state': ['zustand'],
          // Admin pages bundle
          'admin': [
            './src/pages/admin/AdminDashboard.jsx',
            './src/pages/admin/AdminUsers.jsx',
            './src/pages/admin/AdminBusinesses.jsx',
            './src/pages/admin/AdminReviews.jsx',
            './src/pages/admin/AdminClaims.jsx',
            './src/pages/admin/AdminAudit.jsx',
            './src/pages/admin/AdminAnalytics.jsx',
            './src/pages/admin/AdminSettings.jsx',
            './src/pages/admin/AdminRoles.jsx',
            './src/pages/admin/AdminReports.jsx',
            './src/pages/admin/AdminAdministrators.jsx',
            './src/pages/admin/AdminSubscriptions.jsx',
            './src/pages/admin/AdminIntegrations.jsx',
            './src/pages/admin/AdminTwoFactor.jsx',
          ],
        },
      },
    },
  },
})
