import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useThemeStore } from '../store/themeStore';

export default function NewsletterPage() {
  const { theme } = useThemeStore();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
    }
  };

  return (
    <div data-theme={theme} style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />
      <div className="container" style={{ maxWidth: 600, padding: '60px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: 8 }}>Stay Connected</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 16 }}>Irema Newsletter</h1>
          <p style={{ color: 'var(--text-2)', lineHeight: 1.8, fontSize: '1.05rem' }}>
            Get the latest business news, review platform updates, and tips for making the most of Irema — delivered to your inbox.
          </p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 28px', marginBottom: 32 }}>
          {subscribed ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>✓</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>You're subscribed!</h3>
              <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>Thank you for subscribing. We'll keep you updated with the latest from Irema.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p style={{ color: 'var(--text-3)', fontSize: '0.9rem', marginBottom: 20, textAlign: 'center' }}>
                Join thousands of Rwandan business owners and consumers who stay informed with Irema.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{ flex: 1, minWidth: 200, padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '0.88rem', fontFamily: 'inherit', color: 'var(--text-1)', background: 'var(--bg)', outline: 'none' }}
                />
                <button
                  type="submit"
                  style={{ background: 'var(--brand)', color: 'white', border: 'none', padding: '11px 24px', borderRadius: 8, fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Subscribe
                </button>
              </div>
            </form>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, textAlign: 'center', marginBottom: 48 }}>
          {[
            { label: 'New Features', desc: 'Platform updates & releases' },
            { label: 'Business Tips', desc: 'Grow your online presence' },
            { label: 'Community News', desc: 'Stories from Rwanda' },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{item.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link to="/" style={{ color: 'var(--brand)', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none' }}>← Back to Irema</Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
