import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useThemeStore } from '../store/themeStore';

export default function ContactPage() {
  const { theme } = useThemeStore();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    window.location.href = `mailto:hello@irema.rw?subject=${encodeURIComponent(form.subject || 'Contact from Irema')}&body=${encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`)}`;
    setSent(true);
  }

  const inputStyle = { width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.92rem', color: 'var(--text-1)', background: 'var(--bg)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 14 };

  return (
    <div data-theme={theme} style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />
      <div className="container" style={{ maxWidth: 700, padding: '60px 24px 80px' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: 8 }}>Get in Touch</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>Contact Us</h1>
          <p style={{ color: 'var(--text-3)' }}>We're here to help. Reach out and we'll respond within 24 hours.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 40 }}>
          {[
            ['📧', 'General', 'hello@irema.rw'],
            ['🛟', 'Support', 'support@irema.rw'],
            ['🏢', 'Business', 'business@irema.rw'],
            ['⚖️', 'Legal', 'legal@irema.rw'],
          ].map(([icon, label, email]) => (
            <a key={label} href={`mailto:${email}`} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', textDecoration: 'none', transition: 'border-color 0.15s' }}>
              <span style={{ fontSize: '1.3rem' }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-1)' }}>{label}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--brand)' }}>{email}</div>
              </div>
            </a>
          ))}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 28px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: 20 }}>Send a Message</h2>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
              <h3 style={{ color: 'var(--brand)', marginBottom: 8 }}>Message Ready!</h3>
              <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>Your email client should open. If not, email us at hello@irema.rw</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <input style={inputStyle} placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                <input style={inputStyle} type="email" placeholder="Your email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <input style={inputStyle} placeholder="Subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required />
              <textarea style={{ ...inputStyle, resize: 'vertical', marginBottom: 20 }} rows={5} placeholder="How can we help you?" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} required />
              <button type="submit" style={{ background: 'var(--brand)', color: 'white', border: 'none', borderRadius: 10, padding: '12px 28px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
                Send Message
              </button>
            </form>
          )}
        </div>

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-4)', fontSize: '0.85rem' }}>📍 Kibagabaga, Kigali, Rwanda &nbsp;·&nbsp; Mon–Fri 8am–6pm CAT</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
