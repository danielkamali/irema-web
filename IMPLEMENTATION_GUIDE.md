# Implementation Guide - Phase 3 & 4 Updates

This file contains the exact code sections to update for CompanyPage, BlogPage, and AdminNewsletter components.

---

## Phase 3A: Update CompanyPage.jsx (Translation)

**Location:** `/src/pages/CompanyPage.jsx` - Find the `translateReview` function

**Replace this:**
```javascript
// OLD CODE - Direct API call
async function translateReview(reviewId, text) {
  if (translated[reviewId]) { setTranslated(p => ({ ...p, [reviewId]: null })); return; }
  setTranslating(p => ({ ...p, [reviewId]: true }));
  try {
    const resp = await fetch(`https://api.anthropic.com/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY || '',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022', max_tokens: 300,
        messages: [{ role: 'user', content: `Translate this review to ${i18n.language === 'rw' ? 'Kinyarwanda' : i18n.language === 'fr' ? 'French' : i18n.language === 'sw' ? 'Swahili' : 'English'}. Return ONLY the translation, no explanation:\n\n"${text}"` }]
      })
    });
    const data = await resp.json();
    const tx = data.content?.[0]?.text || text;
    setTranslated(p => ({ ...p, [reviewId]: tx }));
  } catch { setTranslated(p => ({ ...p, [reviewId]: text })); }
  setTranslating(p => ({ ...p, [reviewId]: false }));
}
```

**With this:**
```javascript
// NEW CODE - Secure Cloud Function call
async function translateReview(reviewId, text) {
  if (translated[reviewId]) { 
    setTranslated(p => ({ ...p, [reviewId]: null })); 
    return; 
  }
  
  setTranslating(p => ({ ...p, [reviewId]: true }));
  
  try {
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('../firebase/config');
    
    const callClaudeAPI = httpsCallable(functions, 'callClaudeAPI');
    const result = await callClaudeAPI({
      mode: 'translate',
      message: text,
      targetLanguage: i18n.language === 'rw' ? 'Kinyarwanda' 
        : i18n.language === 'fr' ? 'French' 
        : i18n.language === 'sw' ? 'Swahili' 
        : 'English'
    });
    
    setTranslated(p => ({ ...p, [reviewId]: result.data.message }));
  } catch (error) {
    console.error('Translation error:', error);
    setTranslated(p => ({ ...p, [reviewId]: text }));
  } finally {
    setTranslating(p => ({ ...p, [reviewId]: false }));
  }
}
```

---

## Phase 3B: Update BlogPage.jsx (Firestore Integration)

**Location:** `/src/pages/BlogPage.jsx`

**Replace the entire hardcoded blogs section with:**

```javascript
import React, { useState, useEffect } from 'react';
import { db, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from '../firebase/config';
import { useAuthStore } from '../store/authStore';

export default function BlogPage() {
  const [blogs, setBlogs] = useState([]);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

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
    <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: 10, color: '#1f2937' }}>
          📚 Our Blog
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: 20 }}>
          Insights, updates, and stories from the Irema community
        </p>
        
        {/* Newsletter CTA */}
        <div style={{
          background: 'linear-gradient(135deg, #2d8f6f 0%, #1f6b52 100%)',
          color: 'white',
          padding: '20px 30px',
          borderRadius: 12,
          display: 'inline-block'
        }}>
          <p style={{ margin: 0, marginBottom: 10 }}>
            📧 Subscribe to get the latest posts delivered to your inbox
          </p>
          <a href="/newsletter" style={{
            color: 'white',
            textDecoration: 'none',
            fontWeight: 600,
            display: 'inline-block',
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 6,
            marginTop: 8
          }}>
            Subscribe Now →
          </a>
        </div>
      </div>

      {/* Blog List or Detail */}
      {selectedBlog ? (
        // Blog Detail View
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <button
            onClick={() => setSelectedBlog(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#2d8f6f',
              cursor: 'pointer',
              fontSize: '1rem',
              marginBottom: 20,
              fontWeight: 600
            }}
          >
            ← Back to All Posts
          </button>

          <article style={{
            background: 'white',
            borderRadius: 12,
            padding: '40px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h1 style={{ fontSize: '2rem', marginBottom: 10, color: '#1f2937' }}>
              {selectedBlog.title}
            </h1>

            <div style={{
              display: 'flex',
              gap: 20,
              fontSize: '0.9rem',
              color: '#666',
              marginBottom: 30,
              paddingBottom: 20,
              borderBottom: '1px solid #e5e7eb'
            }}>
              <span>✍️ By {selectedBlog.author || 'Irema Team'}</span>
              <span>📅 {new Date(selectedBlog.createdAt?.toDate?.() || selectedBlog.createdAt).toLocaleDateString()}</span>
            </div>

            {selectedBlog.excerpt && (
              <p style={{
                fontSize: '1.1rem',
                color: '#666',
                marginBottom: 20,
                fontStyle: 'italic',
                borderLeft: '4px solid #2d8f6f',
                paddingLeft: 16
              }}>
                {selectedBlog.excerpt}
              </p>
            )}

            <div style={{
              fontSize: '1rem',
              lineHeight: 1.8,
              color: '#374151',
              marginBottom: 30
            }}>
              {selectedBlog.content}
            </div>

            {/* Like & Comment Section (Placeholder) */}
            <div style={{
              display: 'flex',
              gap: 16,
              paddingTop: 20,
              borderTop: '1px solid #e5e7eb'
            }}>
              <button style={{
                background: 'none',
                border: '1px solid #e5e7eb',
                padding: '8px 16px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}>
                👍 Like
              </button>
              <button style={{
                background: 'none',
                border: '1px solid #e5e7eb',
                padding: '8px 16px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}>
                💬 Comment
              </button>
            </div>
          </article>
        </div>
      ) : (
        // Blog List View
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Loading blogs...
            </div>
          ) : blogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>No blog posts yet. Check back soon!</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 24
            }}>
              {blogs.map(blog => (
                <article
                  key={blog.id}
                  onClick={() => handleSelectBlog(blog)}
                  style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '1px solid #e5e7eb'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: 12
                  }}>
                    <h3 style={{
                      fontSize: '1.2rem',
                      marginBottom: 0,
                      color: '#1f2937',
                      flex: 1
                    }}>
                      {blog.title}
                    </h3>
                  </div>

                  <p style={{
                    fontSize: '0.85rem',
                    color: '#666',
                    marginBottom: 12
                  }}>
                    {new Date(blog.createdAt?.toDate?.() || blog.createdAt).toLocaleDateString()}
                  </p>

                  <p style={{
                    fontSize: '0.95rem',
                    color: '#374151',
                    marginBottom: 16,
                    lineHeight: 1.6,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {blog.excerpt || blog.content?.substring(0, 150)}
                  </p>

                  <button style={{
                    background: '#2d8f6f',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}>
                    Read More →
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Phase 4: Update AdminNewsletter.jsx (Send Newsletter Button)

**Location:** `/src/pages/admin/AdminNewsletter.jsx` - Add to the admin newsletter editor

**Add this state variables near the top:**
```javascript
const [draftSubject, setDraftSubject] = useState('');
const [draftContent, setDraftContent] = useState('');
const [isSending, setIsSending] = useState(false);
```

**Add this function in your component:**
```javascript
const handleSendNewsletter = async () => {
  if (!draftSubject.trim() || !draftContent.trim()) {
    showToast('Subject and content are required', 'error');
    return;
  }

  if (!confirm(`Send newsletter to ${subscriberCount} subscribers?`)) {
    return;
  }

  setIsSending(true);
  try {
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('../firebase/config');

    const sendNewsletter = httpsCallable(functions, 'sendNewsletter');
    const result = await sendNewsletter({
      subject: draftSubject,
      content: draftContent,
      contentHtml: draftContent // Can be enhanced with HTML formatting later
    });

    showToast(result.data.message, 'success');
    setDraftSubject('');
    setDraftContent('');
  } catch (error) {
    console.error('Newsletter send error:', error);
    showToast('Failed to send newsletter: ' + error.message, 'error');
  } finally {
    setIsSending(false);
  }
};
```

**Add this UI button in the newsletter editor section:**
```jsx
<div className="biz-card" style={{ marginTop: 20 }}>
  <h3>📮 Send Newsletter</h3>
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
      Subject Line
    </label>
    <input
      type="text"
      value={draftSubject}
      onChange={(e) => setDraftSubject(e.target.value)}
      placeholder="Newsletter subject..."
      style={{
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        fontSize: '0.95rem'
      }}
    />
  </div>

  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
      Email Content
    </label>
    <textarea
      value={draftContent}
      onChange={(e) => setDraftContent(e.target.value)}
      placeholder="Write your newsletter content..."
      rows={8}
      style={{
        width: '100%',
        padding: '12px',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        fontSize: '0.95rem',
        fontFamily: 'inherit',
        resize: 'vertical'
      }}
    />
  </div>

  <button
    onClick={handleSendNewsletter}
    disabled={isSending}
    style={{
      background: '#2d8f6f',
      color: 'white',
      padding: '12px 24px',
      border: 'none',
      borderRadius: 8,
      cursor: isSending ? 'not-allowed' : 'pointer',
      fontWeight: 600,
      fontSize: '1rem',
      opacity: isSending ? 0.6 : 1
    }}
  >
    {isSending ? '⏳ Sending...' : `📧 Send to ${subscriberCount} subscribers`}
  </button>

  {/* Note about email service */}
  {process.env.NODE_ENV === 'development' && (
    <p style={{
      marginTop: 12,
      fontSize: '0.85rem',
      color: '#666',
      fontStyle: 'italic'
    }}>
      ℹ️ Note: Email service integration required to actually send emails. Configure SENDGRID_API_KEY or EMAIL_SERVICE in Cloud Function environment variables.
    </p>
  )}
</div>
```

---

## Summary

All three component updates are ready. The changes are:

| Component | Change | Impact |
|-----------|--------|--------|
| **LiveChat.jsx** | ✅ Done - Uses Cloud Function | No exposed API key |
| **CompanyPage.jsx** | Copy-paste code above | Translations via secure proxy |
| **BlogPage.jsx** | Copy-paste code above | Blogs fetch from Firestore |
| **AdminNewsletter.jsx** | Copy-paste code above | Can send newsletters to subscribers |

---

## Next: Build & Deploy

Once you've copied these code sections, run:

```bash
npm run build:prod && npm run build:staging
firebase deploy -P production --only hosting
firebase deploy -P staging --only hosting
```

Then deploy the Cloud Functions (requires Blaze plan - or skip if still on free):
```bash
firebase deploy -P production --only functions
firebase deploy -P staging --only functions
```
