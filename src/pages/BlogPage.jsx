import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useThemeStore } from '../store/themeStore';
import { db, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from '../firebase/config';
import { useAuthStore } from '../store/authStore';

export default function BlogPage() {
  const { theme } = useThemeStore();
  const { user } = useAuthStore();
  const [blogs, setBlogs] = useState([]);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load published blogs from Firestore
  useEffect(() => {
    const q = query(
      collection(db, 'blogs'),
      where('published', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const blogDocs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBlogs(blogDocs);
      setLoading(false);
    }, (error) => {
      console.error('Error loading blogs:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Track blog view
  const trackBlogView = async (blogId) => {
    try {
      await addDoc(collection(db, 'blog_views'), {
        blogId,
        userId: user?.uid || 'anonymous',
        viewedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  // Handle blog selection
  const handleSelectBlog = (blog) => {
    setSelectedBlog(blog);
    trackBlogView(blog.id);
  };

  return (
    <div data-theme={theme} style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />
      <div className="container" style={{ maxWidth: 960, padding: '60px 24px 80px' }}>
        {selectedBlog ? (
          // Blog Detail View
          <div>
            <button
              onClick={() => setSelectedBlog(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--brand)',
                cursor: 'pointer',
                fontSize: '1rem',
                marginBottom: 24,
                fontWeight: 600
              }}
            >
              ← Back to All Posts
            </button>

            <article style={{
              background: 'var(--surface)',
              borderRadius: 14,
              padding: '40px',
              border: '1px solid var(--border)'
            }}>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.2rem',
                fontWeight: 800,
                marginBottom: 16,
                color: 'var(--text-1)'
              }}>
                {selectedBlog.title}
              </h1>

              <div style={{
                display: 'flex',
                gap: 20,
                fontSize: '0.85rem',
                color: 'var(--text-3)',
                marginBottom: 32,
                paddingBottom: 24,
                borderBottom: '1px solid var(--border)'
              }}>
                <span>✍️ By {selectedBlog.author || 'Irema Team'}</span>
                <span>📅 {new Date(selectedBlog.createdAt?.toDate?.() || selectedBlog.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>

              {selectedBlog.excerpt && (
                <p style={{
                  fontSize: '1.1rem',
                  color: 'var(--text-2)',
                  marginBottom: 24,
                  fontStyle: 'italic',
                  borderLeft: '4px solid var(--brand)',
                  paddingLeft: 16,
                  lineHeight: 1.8
                }}>
                  {selectedBlog.excerpt}
                </p>
              )}

              <div style={{
                fontSize: '1rem',
                lineHeight: 1.8,
                color: 'var(--text-2)',
                marginBottom: 32,
                whiteSpace: 'pre-wrap'
              }}>
                {selectedBlog.content}
              </div>

              {/* Action buttons */}
              <div style={{
                display: 'flex',
                gap: 12,
                paddingTop: 24,
                borderTop: '1px solid var(--border)'
              }}>
                <button style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  padding: '10px 16px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-1)',
                  transition: 'all 0.2s'
                }} onMouseEnter={(e) => e.target.style.background = 'var(--brand-xlight)'} onMouseLeave={(e) => e.target.style.background = 'var(--bg)'}>
                  👍 Like
                </button>
                <button style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  padding: '10px 16px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-1)',
                  transition: 'all 0.2s'
                }} onMouseEnter={(e) => e.target.style.background = 'var(--brand-xlight)'} onMouseLeave={(e) => e.target.style.background = 'var(--bg)'}>
                  💬 Comment
                </button>
              </div>
            </article>
          </div>
        ) : (
          // Blog List View
          <>
            <div style={{ marginBottom: 48 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: 8 }}>Irema Blog</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 16 }}>Latest from Irema</h1>
              <p style={{ color: 'var(--text-2)', lineHeight: 1.8, fontSize: '1.05rem' }}>
                News, tips, and stories from Rwanda's trusted business review platform.
              </p>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
                Loading blogs...
              </div>
            ) : blogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
                <p>No blog posts yet. Check back soon!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                {blogs.map(blog => (
                  <div
                    key={blog.id}
                    onClick={() => handleSelectBlog(blog)}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 14,
                      padding: 24,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = 'var(--brand)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        background: 'var(--brand-xlight)',
                        color: 'var(--brand)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 10px',
                        borderRadius: 99,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Blog</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>
                        {new Date(blog.createdAt?.toDate?.() || blog.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                      </span>
                    </div>
                    <h3 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--text-1)',
                      lineHeight: 1.4
                    }}>
                      {blog.title}
                    </h3>
                    <p style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-3)',
                      lineHeight: 1.6,
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {blog.excerpt || blog.content?.substring(0, 100)}
                    </p>
                    <button style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: 'var(--brand)',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 0
                    }}>
                      Read more →
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{
              background: 'linear-gradient(135deg, #1a5c3e, #0f3d2e)',
              borderRadius: 16,
              padding: '32px 28px',
              color: 'white',
              marginTop: 48
            }}>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.2rem',
                fontWeight: 700,
                marginBottom: 12
              }}>Subscribe to Updates</h2>
              <p style={{ opacity: 0.85, lineHeight: 1.7, marginBottom: 16 }}>Get the latest news and tips from Irema delivered to your inbox.</p>
              <Link to="/newsletter" style={{
                background: 'white',
                color: '#1a5c3e',
                padding: '8px 20px',
                borderRadius: 99,
                fontSize: '0.88rem',
                textDecoration: 'none',
                fontWeight: 700,
                display: 'inline-block'
              }}>Newsletter →</Link>
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
