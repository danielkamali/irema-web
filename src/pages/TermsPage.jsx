import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useThemeStore } from '../store/themeStore';

export default function TermsPage() {
  const { theme } = useThemeStore();
  return (
    <div data-theme={theme} style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />
      <div className="container" style={{ maxWidth: 760, padding: '60px 24px 80px' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: 8 }}>Legal</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>Terms of Service</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>Effective January 1, 2026 · Irema Ltd, Kigali, Rwanda</p>
        </div>

        {[
          ['1. Acceptance of Terms', 'By accessing or using Irema (irema.rw), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform. Irema is Rwanda\'s trusted business review platform connecting consumers with service providers across East Africa.'],
          ['2. User Accounts', 'You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials. You must be at least 16 years of age to use this platform. Irema reserves the right to suspend or terminate accounts that violate these terms.'],
          ['3. Review Policy', 'Reviews must be based on genuine personal experiences. You may not post false, misleading, defamatory, or fraudulent reviews. Businesses may not incentivize, solicit, or purchase reviews. Irema reserves the right to remove reviews that violate our content policy without notice.'],
          ['4. Content Standards', 'All content you post must be respectful and lawful. You may not post content that is harmful, offensive, discriminatory, or violates the rights of others. Irema may remove any content that violates these standards at its sole discretion.'],
          ['5. Intellectual Property', 'All content on the Irema platform, including logos, design, and code, is owned by Irema Ltd. You retain ownership of reviews and content you post, but grant Irema a non-exclusive license to display, distribute, and promote that content on our platform.'],
          ['6. Privacy', 'Your use of Irema is also governed by our Privacy Policy. By using Irema, you consent to the collection and use of your information as described in our Privacy Policy.'],
          ['7. Limitation of Liability', 'Irema provides the platform "as is" without warranties of any kind. We are not responsible for the accuracy of business listings or reviews posted by users. Our maximum liability to you is limited to fees you have paid in the preceding three months.'],
          ['8. Dispute Resolution', 'Any disputes arising from these terms shall be governed by the laws of Rwanda and resolved in courts located in Kigali, Rwanda.'],
          ['9. Changes to Terms', 'Irema may update these Terms of Service at any time. We will notify users of significant changes via email or a notice on the platform. Continued use of the platform after changes constitutes acceptance of the updated terms.'],
          ['10. Contact Us', 'For questions about these Terms of Service, contact us at legal@irema.rw or write to: Irema Ltd, Kibagabaga, Kigali, Rwanda.'],
        ].map(([title, text]) => (
          <div key={title} style={{ marginBottom: 28, paddingBottom: 28, borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--brand)', marginBottom: 10 }}>{title}</h2>
            <p style={{ color: 'var(--text-2)', lineHeight: 1.8, fontSize: '0.93rem', margin: 0 }}>{text}</p>
          </div>
        ))}

        <div style={{ marginTop: 40, padding: '20px 24px', background: 'var(--bg-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', margin: 0 }}>
            For business-specific terms, see our <Link to="/businesses" style={{ color: 'var(--brand)' }}>Business Terms</Link>. For privacy information, see our <Link to="/privacy" style={{ color: 'var(--brand)' }}>Privacy Policy</Link>.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
