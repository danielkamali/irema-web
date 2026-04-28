import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, collection, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from '../../firebase/config';
import { writeBatch } from 'firebase/firestore';
import AdminLayout from './AdminLayout';
import Breadcrumb from '../../components/Breadcrumb';
import EmptyState from '../../components/EmptyState';
import { SkeletonTable } from '../../components/Skeleton';
import Pagination from '../../components/Pagination';
import BulkActions from '../../components/BulkActions';
import { exportToCSV, exportToJSON } from '../../utils/export';
import './AdminPages.css';

export default function AdminNewsletter() {
  const navigate = useNavigate();
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // all, subscribed, unsubscribed
  const pageSize = 10;

  const filteredSubscribers = useMemo(() => {
    let result = subscribers;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(sub =>
        sub.email.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(sub =>
        statusFilter === 'subscribed' ? !sub.unsubscribed : sub.unsubscribed
      );
    }

    return result;
  }, [subscribers, searchQuery, statusFilter]);

  const paginatedSubscribers = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredSubscribers.slice(startIdx, startIdx + pageSize);
  }, [filteredSubscribers, currentPage]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadSubscribers();
  }, []);

  async function loadSubscribers() {
    try {
      const snap = await getDocs(
        query(collection(db, 'newsletter_subscribers'), orderBy('subscribedAt', 'desc'))
      );
      setSubscribers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Failed to load subscribers:', e);
      showToast('Failed to load subscribers', 'error');
    } finally {
      setLoading(false);
    }
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
    setSelectedIds(new Set(subscribers.map(s => s.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function bulkToggleSubscription(shouldUnsubscribe) {
    const action = shouldUnsubscribe ? 'unsubscribe' : 'resubscribe';
    const count = selectedIds.size;
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${count} subscriber${count !== 1 ? 's' : ''}?`)) return;

    setBulkUpdating(true);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.update(doc(db, 'newsletter_subscribers', id), {
          unsubscribed: shouldUnsubscribe,
          ...(shouldUnsubscribe ? { unsubscribedAt: serverTimestamp() } : { resubscribedAt: serverTimestamp() })
        });
      });
      await batch.commit();
      showToast(`${count} subscriber${count !== 1 ? 's' : ''} ${action}d successfully`);
      loadSubscribers();
      setSelectedIds(new Set());
    } catch (e) {
      showToast(`Error updating subscribers: ${e.message}`, 'error');
    } finally {
      setBulkUpdating(false);
    }
  }

  async function bulkDelete() {
    const count = selectedIds.size;
    if (!window.confirm(`Delete ${count} subscriber${count !== 1 ? 's' : ''}? This cannot be undone.`)) return;

    setBulkUpdating(true);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.delete(doc(db, 'newsletter_subscribers', id));
      });
      await batch.commit();
      showToast(`${count} subscriber${count !== 1 ? 's' : ''} deleted`);
      loadSubscribers();
      setSelectedIds(new Set());
    } catch (e) {
      showToast(`Error deleting subscribers: ${e.message}`, 'error');
    } finally {
      setBulkUpdating(false);
    }
  }

  function bulkExport() {
    const toExport = subscribers.filter(s => selectedIds.has(s.id));
    exportToJSON(
      toExport.map(({ id, subscribedAt, unsubscribedAt, resubscribedAt, ...rest }) => ({
        ...rest,
        subscribedDate: new Date(subscribedAt?.seconds * 1000).toLocaleDateString(),
        unsubscribedDate: unsubscribedAt ? new Date(unsubscribedAt.seconds * 1000).toLocaleDateString() : 'N/A',
        resubscribedDate: resubscribedAt ? new Date(resubscribedAt.seconds * 1000).toLocaleDateString() : 'N/A'
      })),
      `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.json`
    );
    showToast(`Exported ${selectedIds.size} subscriber${selectedIds.size !== 1 ? 's' : ''}`);
  }

  async function toggleSubscription(id, currentStatus) {
    try {
      await updateDoc(doc(db, 'newsletter_subscribers', id), {
        unsubscribed: !currentStatus,
        ...(currentStatus ? { resubscribedAt: serverTimestamp() } : { unsubscribedAt: serverTimestamp() })
      });
      loadSubscribers();
      showToast(`Subscriber ${currentStatus ? 'resubscribed' : 'unsubscribed'} successfully`);
    } catch (e) {
      showToast(`Error updating subscriber: ${e.message}`, 'error');
    }
  }

  async function deleteSubscriber(id) {
    if (!window.confirm('Delete this subscriber? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'newsletter_subscribers', id));
      loadSubscribers();
      showToast('Subscriber deleted successfully');
    } catch (e) {
      showToast(`Error deleting subscriber: ${e.message}`, 'error');
    }
  }

  if (loading) return <AdminLayout><div className="ap-loading">Loading...</div></AdminLayout>;

  const subscribedCount = subscribers.filter(s => !s.unsubscribed).length;
  const unsubscribedCount = subscribers.filter(s => s.unsubscribed).length;

  return (
    <AdminLayout>
      {toast && <div className={`ap-toast ap-toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '✗'} {toast.msg}</div>}
      <div className="ap-page">
        <Breadcrumb
          items={[
            { label: 'Admin', href: '/admin' },
            { label: 'Newsletter Management' }
          ]}
        />
        <div className="ap-header">
          <h1>Newsletter Management</h1>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {subscribers.length > 0 && (
              <>
                <button
                  className="ap-btn ap-btn-outline"
                  onClick={() => exportToCSV(
                    subscribers.map(({ id, subscribedAt, unsubscribedAt, resubscribedAt, ...rest }) => ({
                      ...rest,
                      subscribedDate: new Date(subscribedAt?.seconds * 1000).toLocaleDateString(),
                      unsubscribedDate: unsubscribedAt ? new Date(unsubscribedAt.seconds * 1000).toLocaleDateString() : 'N/A'
                    })),
                    `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`
                  )}
                  title="Download all subscribers as CSV"
                >
                  📥 Export CSV
                </button>
                <button
                  className="ap-btn ap-btn-outline"
                  onClick={() => exportToJSON(subscribers, `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.json`)}
                  title="Download all subscribers as JSON"
                >
                  📥 Export JSON
                </button>
              </>
            )}
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div style={{
            background: 'var(--brand-xlight)',
            border: '1px solid var(--brand-light)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
              <input
                type="checkbox"
                checked={selectedIds.size === subscribers.length && subscribers.length > 0}
                indeterminate={selectedIds.size > 0 && selectedIds.size < subscribers.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    selectAll();
                  } else {
                    clearSelection();
                  }
                }}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                title={selectedIds.size === subscribers.length ? 'Deselect all' : 'Select all'}
              />
              <span style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--brand-dark)'
              }}>
                {selectedIds.size} subscriber{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => bulkToggleSubscription(false)}
                disabled={bulkUpdating}
                style={{
                  padding: '6px 12px',
                  background: 'var(--bg)',
                  color: 'var(--brand)',
                  border: '1px solid var(--brand-light)',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: bulkUpdating ? 'not-allowed' : 'pointer',
                  opacity: bulkUpdating ? 0.5 : 1,
                  transition: 'all 0.2s',
                  fontFamily: 'inherit'
                }}
              >
                ✓ Resubscribe
              </button>

              <button
                onClick={() => bulkToggleSubscription(true)}
                disabled={bulkUpdating}
                style={{
                  padding: '6px 12px',
                  background: '#fee',
                  color: '#c00',
                  border: '1px solid #fcc',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: bulkUpdating ? 'not-allowed' : 'pointer',
                  opacity: bulkUpdating ? 0.5 : 1,
                  transition: 'all 0.2s',
                  fontFamily: 'inherit'
                }}
              >
                🚫 Unsubscribe
              </button>

              <button
                onClick={bulkExport}
                disabled={bulkUpdating}
                style={{
                  padding: '6px 12px',
                  background: 'var(--bg)',
                  color: 'var(--brand)',
                  border: '1px solid var(--brand-light)',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: bulkUpdating ? 'not-allowed' : 'pointer',
                  opacity: bulkUpdating ? 0.5 : 1,
                  transition: 'all 0.2s',
                  fontFamily: 'inherit'
                }}
              >
                📥 Export
              </button>

              <button
                onClick={bulkDelete}
                disabled={bulkUpdating}
                style={{
                  padding: '6px 12px',
                  background: '#fee',
                  color: '#c00',
                  border: '1px solid #fcc',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: bulkUpdating ? 'not-allowed' : 'pointer',
                  opacity: bulkUpdating ? 0.5 : 1,
                  transition: 'all 0.2s',
                  fontFamily: 'inherit'
                }}
              >
                🗑️ Delete
              </button>

              <button
                onClick={clearSelection}
                disabled={bulkUpdating}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  color: 'var(--text-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit'
                }}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input
              type="text"
              placeholder="🔍 Search by email..."
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

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-1)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Subscribers</option>
              <option value="subscribed">Subscribed</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
          </div>
        </div>

        <div className="ap-table-container">
          {loading ? (
            <div style={{ padding: '24px' }}>
              <SkeletonTable rows={5} columnCount={4} />
            </div>
          ) : filteredSubscribers.length === 0 && (searchQuery || statusFilter !== 'all') ? (
            <EmptyState
              icon="🔍"
              title="No results found"
              message="No subscribers match your search or filter."
              compact={true}
            />
          ) : subscribers.length === 0 ? (
            <EmptyState
              icon="📧"
              title="No subscribers yet"
              message="Newsletter subscribers will appear here once they sign up."
              compact={true}
            />
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div style={{ background: 'var(--brand-xlight)', border: '1px solid var(--brand-light)', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 4 }}>Total Subscribers</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--brand)' }}>{subscribers.length}</div>
                </div>
                <div style={{ background: '#eef8ee', border: '1px solid #cfe8cf', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 4 }}>Subscribed</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2d8b2d' }}>{subscribedCount}</div>
                </div>
                <div style={{ background: '#fee', border: '1px solid #fcc', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 4 }}>Unsubscribed</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#c00' }}>{unsubscribedCount}</div>
                </div>
              </div>

              <table className="ap-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.size === subscribers.length && subscribers.length > 0}
                        indeterminate={selectedIds.size > 0 && selectedIds.size < subscribers.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAll();
                          } else {
                            clearSelection();
                          }
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Subscribed Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSubscribers.map(subscriber => (
                    <tr key={subscriber.id} style={{ background: selectedIds.has(subscriber.id) ? 'var(--brand-xlight)' : '' }}>
                      <td style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(subscriber.id)}
                          onChange={() => toggleSelectId(subscriber.id)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                      </td>
                      <td className="ap-td-bold">{subscriber.email}</td>
                      <td>
                        <span className={`ap-badge ${subscriber.unsubscribed ? 'gray' : 'green'}`}>
                          {subscriber.unsubscribed ? 'Unsubscribed' : 'Subscribed'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                        {subscriber.subscribedAt?.seconds ? new Date(subscriber.subscribedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="ap-btn ap-btn-sm ap-btn-outline"
                          onClick={() => toggleSubscription(subscriber.id, subscriber.unsubscribed)}
                        >
                          {subscriber.unsubscribed ? 'Resubscribe' : 'Unsubscribe'}
                        </button>
                        <button
                          className="ap-btn ap-btn-sm ap-btn-danger"
                          onClick={() => deleteSubscriber(subscriber.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSubscribers.length > pageSize && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredSubscribers.length / pageSize)}
                  pageSize={pageSize}
                  totalItems={filteredSubscribers.length}
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
