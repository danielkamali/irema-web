import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where } from '../../firebase/config';
import { writeBatch } from 'firebase/firestore';
import AdminLayout from './AdminLayout';
import Breadcrumb from '../../components/Breadcrumb';
import EmptyState from '../../components/EmptyState';
import { SkeletonTable } from '../../components/Skeleton';
import Tooltip from '../../components/Tooltip';
import Pagination from '../../components/Pagination';
import BulkActions from '../../components/BulkActions';
import { debounce } from '../../utils/debounce';
import { exportToCSV, exportToJSON } from '../../utils/export';
import './AdminPages.css';

export default function AdminBlog() {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', excerpt: '', content: '', author: '', published: false });
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all', // all, published, draft
    author: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showMetrics, setShowMetrics] = useState(null); // Show metrics for specific blog ID
  const [currentMetrics, setCurrentMetrics] = useState({ viewCount: 0, likeCount: 0, commentCount: 0 });
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const pageSize = 10;

  const filteredBlogs = useMemo(() => {
    let result = blogs;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(blog =>
        blog.title.toLowerCase().includes(query) ||
        blog.content.toLowerCase().includes(query) ||
        blog.excerpt.toLowerCase().includes(query) ||
        (blog.author && blog.author.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      result = result.filter(blog =>
        filters.status === 'published' ? blog.published : !blog.published
      );
    }

    // Apply author filter
    if (filters.author.trim()) {
      const authorQuery = filters.author.toLowerCase();
      result = result.filter(blog =>
        blog.author && blog.author.toLowerCase().includes(authorQuery)
      );
    }

    // Apply date range filter
    if (filters.dateFrom || filters.dateTo) {
      result = result.filter(blog => {
        if (!blog.createdAt?.seconds) return false;
        const blogDate = new Date(blog.createdAt.seconds * 1000);

        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (blogDate < fromDate) return false;
        }

        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (blogDate > toDate) return false;
        }

        return true;
      });
    }

    return result;
  }, [blogs, searchQuery, filters]);

  const paginatedBlogs = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredBlogs.slice(startIdx, startIdx + pageSize);
  }, [filteredBlogs, currentPage]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadBlogMetrics = async (blogId) => {
    try {
      // Get view count
      const viewsSnap = await getDocs(
        query(collection(db, 'blog_views'), where('blogId', '==', blogId))
      );
      const viewCount = viewsSnap.size;

      // Get likes count
      const likesSnap = await getDocs(
        query(collection(db, 'blog_likes'), where('blogId', '==', blogId))
      );
      const likeCount = likesSnap.size;

      // Get comments count
      const commentsSnap = await getDocs(
        query(collection(db, 'blog_comments'), where('blogId', '==', blogId))
      );
      const commentCount = commentsSnap.size;

      return { viewCount, likeCount, commentCount };
    } catch (e) {
      console.error('Failed to load metrics:', e);
      return { viewCount: 0, likeCount: 0, commentCount: 0 };
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  useEffect(() => {
    if (showMetrics) {
      setLoadingMetrics(true);
      loadBlogMetrics(showMetrics).then(metrics => {
        setCurrentMetrics(metrics);
        setLoadingMetrics(false);
      });
    }
  }, [showMetrics]);

  async function loadBlogs() {
    try {
      // Fetch without orderBy to avoid requiring Firestore index
      const snap = await getDocs(collection(db, 'blogs'));
      const blogsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort by createdAt in JavaScript (desc)
      blogsList.sort((a, b) => {
        const aTime = a.createdAt?.seconds || a.createdAt || 0;
        const bTime = b.createdAt?.seconds || b.createdAt || 0;
        return bTime - aTime;
      });
      setBlogs(blogsList);
    } catch (e) {
      console.error('Failed to load blogs:', e);
      showToast('Failed to load blogs', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.content.trim()) newErrors.content = 'Content is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      if (editingId) {
        await updateDoc(doc(db, 'blogs', editingId), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        showToast('Blog post updated successfully');
      } else {
        await addDoc(collection(db, 'blogs'), {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        showToast('Blog post created successfully');
      }
      loadBlogs();
      setShowForm(false);
      setEditingId(null);
      setFormData({ title: '', excerpt: '', content: '', author: '', published: false });
    } catch (e) {
      showToast('Error saving blog: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this blog post?')) return;
    try {
      await deleteDoc(doc(db, 'blogs', id));
      loadBlogs();
      showToast('Blog post deleted successfully');
    } catch (e) {
      showToast('Error deleting blog: ' + e.message, 'error');
    }
  }

  function handleEdit(blog) {
    setEditingId(blog.id);
    setFormData({
      title: blog.title,
      excerpt: blog.excerpt,
      content: blog.content,
      author: blog.author,
      published: blog.published
    });
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setFormData({ title: '', excerpt: '', content: '', author: '', published: false });
    setErrors({});
  }

  function toggleSelectId(id) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }

  function selectAll() {
    setSelectedIds(new Set(blogs.map(b => b.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function bulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} blog post${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;

    setBulkDeleting(true);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.delete(doc(db, 'blogs', id));
      });
      await batch.commit();
      showToast(`${selectedIds.size} blog post${selectedIds.size !== 1 ? 's' : ''} deleted`);
      loadBlogs();
      setSelectedIds(new Set());
    } catch (e) {
      showToast('Error deleting blogs: ' + e.message, 'error');
    } finally {
      setBulkDeleting(false);
    }
  }

  function bulkExport() {
    const toExport = blogs.filter(b => selectedIds.has(b.id));
    exportToJSON(
      toExport.map(({ id, createdAt, updatedAt, ...rest }) => ({
        ...rest,
        createdDate: new Date(createdAt?.seconds * 1000).toLocaleDateString(),
        updatedDate: new Date(updatedAt?.seconds * 1000).toLocaleDateString()
      })),
      `blogs-export-${new Date().toISOString().split('T')[0]}.json`
    );
    showToast(`Exported ${selectedIds.size} blog post${selectedIds.size !== 1 ? 's' : ''}`);
  }

  if (loading) return <AdminLayout><div className="ap-loading">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      {toast && <div className={`ap-toast ap-toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '✗'} {toast.msg}</div>}
      <div className="ap-page">
        <Breadcrumb
          items={[
            { label: 'Admin', href: '/admin' },
            { label: 'Blog Management' }
          ]}
        />
        <div className="ap-header">
          <h1>Blog Management</h1>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {blogs.length > 0 && (
              <>
                <button
                  className="ap-btn ap-btn-outline"
                  onClick={() => exportToCSV(
                    blogs.map(({ id, createdAt, updatedAt, ...rest }) => ({
                      ...rest,
                      createdDate: new Date(createdAt?.seconds * 1000).toLocaleDateString(),
                      updatedDate: new Date(updatedAt?.seconds * 1000).toLocaleDateString()
                    })),
                    `blogs-${new Date().toISOString().split('T')[0]}.csv`
                  )}
                  title="Download as CSV"
                >
                  📥 Export CSV
                </button>
                <button
                  className="ap-btn ap-btn-outline"
                  onClick={() => exportToJSON(blogs, `blogs-${new Date().toISOString().split('T')[0]}.json`)}
                  title="Download as JSON"
                >
                  📥 Export JSON
                </button>
                <button
                  className={`ap-btn ${showFilters ? 'ap-btn-primary' : 'ap-btn-outline'}`}
                  onClick={() => setShowFilters(!showFilters)}
                  title="Toggle advanced filters"
                >
                  🔍 {showFilters ? 'Hide' : 'Show'} Filters
                </button>
              </>
            )}
            <button className="ap-btn ap-btn-primary" onClick={() => setShowForm(true)}>+ New Blog Post</button>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <BulkActions
            selectedCount={selectedIds.size}
            totalCount={blogs.length}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onDelete={bulkDelete}
            onExport={bulkExport}
            isLoading={bulkDeleting}
          />
        )}

        {showFilters && blogs.length > 0 && (
          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-1)' }}>
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => {
                  setFilters(f => ({ ...f, status: e.target.value }));
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text-1)',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-1)' }}>
                Author
              </label>
              <input
                type="text"
                placeholder="Filter by author name"
                value={filters.author}
                onChange={(e) => {
                  setFilters(f => ({ ...f, author: e.target.value }));
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text-1)',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-1)' }}>
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => {
                  setFilters(f => ({ ...f, dateFrom: e.target.value }));
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text-1)',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  cursor: 'pointer'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-1)' }}>
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => {
                  setFilters(f => ({ ...f, dateTo: e.target.value }));
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text-1)',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  cursor: 'pointer'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={() => {
                  setFilters({ status: 'all', author: '', dateFrom: '', dateTo: '' });
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: 'var(--border)',
                  color: 'var(--text-1)',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => e.target.style.background = 'var(--text-4)'}
                onMouseLeave={(e) => e.target.style.background = 'var(--border)'}
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {showMetrics && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}>
            <div style={{
              background: 'var(--surface)',
              borderRadius: 12,
              border: '1px solid var(--border)',
              padding: 24,
              maxWidth: 500,
              width: '100%',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
            }}>
              <h2 style={{ margin: '0 0 16px 0', color: 'var(--text-1)' }}>
                Blog Post Metrics
              </h2>
              <p style={{ color: 'var(--text-2)', marginBottom: 24 }}>
                {blogs.find(b => b.id === showMetrics)?.title}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                <div style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 16,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 8 }}>Views</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--brand)' }}>
                    {loadingMetrics ? 'Loading...' : currentMetrics.viewCount.toLocaleString()}
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 16,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 8 }}>Likes</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2d8b2d' }}>
                    {loadingMetrics ? 'Loading...' : currentMetrics.likeCount.toLocaleString()}
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 16,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 8 }}>Comments</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#9333ea' }}>
                    {loadingMetrics ? 'Loading...' : currentMetrics.commentCount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowMetrics(null)}
                  className="ap-btn ap-btn-outline"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <div className="ap-form-container">
            <h2>{editingId ? 'Edit Blog Post' : 'New Blog Post'}</h2>
            <div className="ap-form">
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  Title *
                  <Tooltip text="Catchy titles increase readership" position="right">
                    <span style={{ cursor: 'help', color: 'var(--brand)', fontWeight: 'bold' }}>?</span>
                  </Tooltip>
                </label>
                <input
                  type="text"
                  placeholder="Blog post title"
                  value={formData.title}
                  onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: errors.title ? '1px solid #c00' : '1px solid var(--border)', marginBottom: 12 }}
                />
                {errors.title && <p style={{ color: '#c00', fontSize: '0.8rem', margin: '-8px 0 8px 0' }}>{errors.title}</p>}
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  Excerpt
                  <Tooltip text="Brief summary shown in lists (optional)" position="right">
                    <span style={{ cursor: 'help', color: 'var(--brand)', fontWeight: 'bold' }}>?</span>
                  </Tooltip>
                </label>
                <textarea
                  placeholder="Short preview of the blog post"
                  value={formData.excerpt}
                  onChange={e => setFormData(p => ({ ...p, excerpt: e.target.value }))}
                  rows="2"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12, fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  Content *
                  <Tooltip text="Full blog post text. Use line breaks for readability" position="right">
                    <span style={{ cursor: 'help', color: 'var(--brand)', fontWeight: 'bold' }}>?</span>
                  </Tooltip>
                </label>
                <textarea
                  placeholder="Full blog post content"
                  value={formData.content}
                  onChange={e => setFormData(p => ({ ...p, content: e.target.value }))}
                  rows="8"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: errors.content ? '1px solid #c00' : '1px solid var(--border)', marginBottom: 12, fontFamily: 'inherit' }}
                />
                {errors.content && <p style={{ color: '#c00', fontSize: '0.8rem', margin: '-8px 0 8px 0' }}>{errors.content}</p>}
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  Author
                  <Tooltip text="Name of the author (optional)" position="right">
                    <span style={{ cursor: 'help', color: 'var(--brand)', fontWeight: 'bold' }}>?</span>
                  </Tooltip>
                </label>
                <input
                  type="text"
                  placeholder="Author name"
                  value={formData.author}
                  onChange={e => setFormData(p => ({ ...p, author: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12 }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <input
                  type="checkbox"
                  id="published"
                  checked={formData.published}
                  onChange={e => setFormData(p => ({ ...p, published: e.target.checked }))}
                />
                <label htmlFor="published">Publish immediately</label>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="ap-btn ap-btn-primary" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving...' : 'Save Blog Post'}
                </button>
                <button className="ap-btn ap-btn-outline" onClick={handleCancel} disabled={saving}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="🔍 Search blogs by title, content, author..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              background: 'var(--bg)',
              color: 'var(--text-1)',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
          />
        </div>

        <div className="ap-table-container">
          {loading ? (
            <div style={{ padding: '24px' }}>
              <SkeletonTable rows={5} columnCount={5} />
            </div>
          ) : filteredBlogs.length === 0 && searchQuery ? (
            <EmptyState
              icon="🔍"
              title="No results found"
              message={`No blog posts match "${searchQuery}"`}
              compact={true}
            />
          ) : blogs.length === 0 ? (
            <EmptyState
              icon="📝"
              title="No blog posts yet"
              message="Start sharing stories and updates with your audience."
              action={{
                label: 'Create First Post',
                onClick: () => setShowForm(true)
              }}
            />
          ) : (
            <>
              <table className="ap-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.size === blogs.length && blogs.length > 0}
                        indeterminate={selectedIds.size > 0 && selectedIds.size < blogs.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAll();
                          } else {
                            clearSelection();
                          }
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        title={selectedIds.size === blogs.length ? 'Deselect all' : 'Select all'}
                      />
                    </th>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBlogs.map(blog => (
                    <tr key={blog.id} style={{ background: selectedIds.has(blog.id) ? 'var(--brand-xlight)' : '' }}>
                      <td style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(blog.id)}
                          onChange={() => toggleSelectId(blog.id)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                      </td>
                      <td className="ap-td-bold">{blog.title}</td>
                      <td>{blog.author || 'N/A'}</td>
                      <td><span className={`ap-badge ${blog.published ? 'green' : 'gray'}`}>{blog.published ? 'Published' : 'Draft'}</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                        {blog.createdAt?.seconds ? new Date(blog.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ display: 'flex', gap: 8 }}>
                        <button className="ap-btn ap-btn-sm ap-btn-outline" onClick={() => setShowMetrics(blog.id)} title="View blog metrics">📊</button>
                        <button className="ap-btn ap-btn-sm ap-btn-outline" onClick={() => handleEdit(blog)}>Edit</button>
                        <button className="ap-btn ap-btn-sm ap-btn-danger" onClick={() => handleDelete(blog.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredBlogs.length > pageSize && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredBlogs.length / pageSize)}
                  pageSize={pageSize}
                  totalItems={filteredBlogs.length}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
