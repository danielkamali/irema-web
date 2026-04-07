import { useThemeStore } from './store/themeStore';
// irema-v20 — Production Ready
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthInit } from './hooks/useAuth';
import { useAuthStore } from './store/authStore';
import { db, doc, getDoc, collection, query, where, getDocs } from './firebase/config';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import AuthModal from './components/AuthModal';
import LiveChat from './components/LiveChat';

const HomePage = lazy(() => import('./pages/HomePage'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const CompanyPage = lazy(() => import('./pages/CompanyPage'));
const BusinessesPage = lazy(() => import('./pages/BusinessesPage'));
const TopRatedPage = lazy(() => import('./pages/TopRatedPage'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const CompanyDashboard = lazy(() => import('./pages/CompanyDashboard'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminBusinesses = lazy(() => import('./pages/admin/AdminBusinesses'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminClaims = lazy(() => import('./pages/admin/AdminClaims'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminRoles = lazy(() => import('./pages/admin/AdminRoles'));
const AdminAudit = lazy(() => import('./pages/admin/AdminAudit'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminAdministrators = lazy(() => import('./pages/admin/AdminAdministrators'));
const AdminSubscriptions = lazy(() => import('./pages/admin/AdminSubscriptions'));
const AdminStories = lazy(() => import('./pages/admin/AdminStories'));
const AdminIntegrations = lazy(() => import('./pages/admin/AdminIntegrations'));
const AdminFeatures = lazy(() => import('./pages/admin/AdminFeatures'));
const AdminEnterprise = lazy(() => import('./pages/admin/AdminEnterprise'));
const AdminTranslations = lazy(() => import('./pages/admin/AdminTranslations'));
const QRScanPage = lazy(() => import('./pages/QRScanPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const NewsletterPage = lazy(() => import('./pages/NewsletterPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));

function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuthStore();
  const [status, setStatus] = useState('pending'); // pending | ok | no | business

  useEffect(() => {
    if (loading) return;
    if (!user) { setStatus('no'); return; }
    if (requireAdmin) {
      // Check admin_users collection
      getDoc(doc(db, 'admin_users', user.uid))
        .then(snap => setStatus(snap.exists() && snap.data()?.isActive !== false ? 'ok' : 'no'))
        .catch(() => setStatus('no'));
    } else {
      // For user dashboard — redirect business-only accounts to their dashboard
      getDocs(query(collection(db, 'companies'), where('adminUserId', '==', user.uid)))
        .then(snap => setStatus(snap.empty ? 'ok' : 'business'))
        .catch(() => setStatus('ok')); // on error, allow through
    }
  }, [user, loading, requireAdmin]);

  if (loading || status === 'pending') return <LoadingSpinner fullPage />;
  if (!user) return <Navigate to={requireAdmin ? '/admin/login' : '/'} replace />;
  if (status === 'no') return <Navigate to={requireAdmin ? '/admin/login' : '/'} replace />;
  if (status === 'business') return <Navigate to="/company-dashboard" replace />;
  return children;
}

function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', paddingTop: '68px' }}>
        {children}
      </main>
      <Footer />
      <AuthModal />
    </>
  );
}

function AdminLayout({ children }) {
  return <>{children}</>;
}

export default function App() {
  // Subscribe to theme store — ensures React re-renders all components on theme toggle
  useThemeStore(s => s.theme);
  useAuthInit();

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<LoadingSpinner fullPage />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
          <Route path="/search" element={<PublicLayout><SearchResults /></PublicLayout>} />
          <Route path="/company/:id" element={<PublicLayout><CompanyPage /></PublicLayout>} />
          <Route path="/businesses" element={<BusinessesPage />} />
          <Route path="/top-rated" element={<PublicLayout><TopRatedPage /></PublicLayout>} />
          <Route path="/scan" element={<PublicLayout><QRScanPage /></PublicLayout>} />
          <Route path="/blog" element={<PublicLayout><BlogPage /></PublicLayout>} />
          <Route path="/newsletter" element={<PublicLayout><NewsletterPage /></PublicLayout>} />

          {/* Protected user routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute><PublicLayout><UserDashboard /></PublicLayout></ProtectedRoute>
          } />
          <Route path="/company-dashboard" element={<CompanyDashboard />} />

          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/businesses" element={<ProtectedRoute requireAdmin><AdminBusinesses /></ProtectedRoute>} />
          <Route path="/admin/reviews" element={<ProtectedRoute requireAdmin><AdminReviews /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute requireAdmin><AdminReports /></ProtectedRoute>} />
          <Route path="/admin/claims" element={<ProtectedRoute requireAdmin><AdminClaims /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />
          <Route path="/admin/roles" element={<ProtectedRoute requireAdmin><AdminRoles /></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute requireAdmin><AdminAudit /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute requireAdmin><AdminAnalytics /></ProtectedRoute>} />
          <Route path="/admin/administrators" element={<ProtectedRoute requireAdmin><AdminAdministrators /></ProtectedRoute>} />
          <Route path="/admin/subscriptions" element={<ProtectedRoute requireAdmin><AdminSubscriptions /></ProtectedRoute>} />
          <Route path="/admin/stories" element={<ProtectedRoute requireAdmin><AdminStories /></ProtectedRoute>} />
          <Route path="/admin/integrations" element={<ProtectedRoute requireAdmin><AdminIntegrations /></ProtectedRoute>} />
          <Route path="/admin/features" element={<ProtectedRoute requireAdmin><AdminFeatures /></ProtectedRoute>} />
          <Route path="/admin/enterprise" element={<ProtectedRoute requireAdmin><AdminEnterprise /></ProtectedRoute>} />
          <Route path="/admin/translations" element={<ProtectedRoute requireAdmin><AdminTranslations /></ProtectedRoute>} />

          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <LiveChat />
    </BrowserRouter>
  );
}
