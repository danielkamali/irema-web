import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useThemeStore } from '../store/themeStore';

export default function BlogPage() {
  const { theme } = useThemeStore();
  return (
    <div data-theme={theme} style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />
      <div className="container" style={{ maxWidth: 760, padding: '60px 24px 80px' }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: 8 }}>Irema Blog</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 16 }}>Latest from Irema</h1>
          <p style={{ color: 'var(--text-2)', lineHeight: 1.8, fontSize: '1.05rem' }}>
            News, tips, and stories from Rwanda's trusted business review platform.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {[
            { title: 'How Irema is Helping Rwandan Businesses Build Trust', date: 'March 2026', excerpt: 'Discover how verified reviews are transforming the way consumers and businesses interact in Rwanda.', tag: 'Business' },
            { title: '5 Tips for Writing Helpful Reviews', date: 'February 2026', excerpt: 'Make your reviews count. Here\'s how to write feedback that genuinely helps other consumers.', tag: 'Tips' },
            { title: 'Irema Now in 4 Languages', date: 'January 2026', excerpt: 'Read and write reviews in English, French, Kinyarwanda, and Swahili — right from your phone.', tag: 'Product' },
          ].map(post => (
            <div key={post.title} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: 'var(--brand-xlight)', color: 'var(--brand)', fontSize: '0.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{post.tag}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>{post.date}</span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.4 }}>{post.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', lineHeight: 1.6, flex: 1 }}>{post.excerpt}</p>
              <Link to="/" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand)', textDecoration: 'none' }}>Read more →</Link>
            </div>
          ))}
        </div>

        <div style={{ background: 'linear-gradient(135deg, #1a5c3e, #0f3d2e)', borderRadius: 16, padding: '32px 28px', color: 'white', marginTop: 48 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>Subscribe to Updates</h2>
          <p style={{ opacity: 0.85, lineHeight: 1.7, marginBottom: 16 }}>Get the latest news and tips from Irema delivered to your inbox.</p>
          <Link to="/newsletter" style={{ background: 'white', color: '#1a5c3e', padding: '8px 20px', borderRadius: 99, fontSize: '0.88rem', textDecoration: 'none', fontWeight: 700 }}>Newsletter →</Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
