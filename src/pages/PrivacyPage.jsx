import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useThemeStore } from '../store/themeStore';

export default function PrivacyPage() {
  const { theme } = useThemeStore();
  return (
    <div data-theme={theme} style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />
      <div className="container" style={{ maxWidth: 760, padding: '60px 24px 80px' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: 8 }}>Legal</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>Privacy Policy</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>Effective January 1, 2026 · Irema Ltd, Kigali, Rwanda</p>
        </div>

        {[
          ['1. Information We Collect', 'We collect information you provide directly: name, email address, profile photo, and reviews you write. We also collect usage data such as pages visited, search queries, and device information to improve the platform.'],
          ['2. How We Use Your Information', 'We use your information to: operate and improve the Irema platform, send you notifications about your reviews and account, display your reviews publicly on business pages, communicate with you about your account or our services, and comply with legal obligations.'],
          ['3. Information Sharing', 'Your public reviews, username, and profile photo are visible to all Irema users. We do not sell your personal information to third parties. We may share information with service providers who help us operate the platform (such as Firebase/Google for hosting), subject to confidentiality agreements.'],
          ['4. Data Retention', 'We retain your account information for as long as your account is active. Reviews are retained indefinitely as part of the public record. You may request deletion of your account and associated data by contacting us at privacy@irema.rw.'],
          ['5. Your Rights (GDPR & Rwandan Law)', 'Under Rwanda\'s Law No. 058/2021 on Personal Data Protection and applicable privacy law, you have the right to: access your personal data, correct inaccurate data, request deletion of your data, object to processing of your data, and data portability. To exercise these rights, contact privacy@irema.rw.'],
          ['6. Security', 'We implement industry-standard security measures including SSL/TLS encryption, Firebase security rules, and regular security reviews. However, no system is completely secure. Please use a strong password and notify us immediately of any suspected breach.'],
          ['7. Cookies', 'Irema uses essential cookies for authentication and user preferences (such as language and theme settings). We do not use advertising cookies or sell data to advertisers. You can control cookies through your browser settings.'],
          ['8. Third-Party Services', 'Irema uses Google Firebase for authentication and database services. Your use of Irema is also subject to Google\'s Privacy Policy. We may use Google Maps for location features. We do not share your data with other third-party advertising platforms.'],
          ['9. Children\'s Privacy', 'Irema is not directed at children under 16 years of age. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us at privacy@irema.rw.'],
          ['10. Contact Us', 'For privacy questions or to exercise your rights, contact us at privacy@irema.rw or write to: Irema Ltd, Kibagabaga, Kigali, Rwanda. We will respond within 30 days.'],
        ].map(([title, text]) => (
          <div key={title} style={{ marginBottom: 28, paddingBottom: 28, borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--brand)', marginBottom: 10 }}>{title}</h2>
            <p style={{ color: 'var(--text-2)', lineHeight: 1.8, fontSize: '0.93rem', margin: 0 }}>{text}</p>
          </div>
        ))}

        <div style={{ marginTop: 40, padding: '20px 24px', background: 'var(--bg-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', margin: 0 }}>
            This policy is governed by Rwandan Law No. 058/2021. See also our <Link to="/terms" style={{ color: 'var(--brand)' }}>Terms of Service</Link>.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
