import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, query, orderBy, updateDoc, doc, serverTimestamp, onSnapshot } from '../../firebase/config';
import AdminLayout from './AdminLayout';
import './AdminPages.css';

export default function AdminSupport() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [responseText, setResponseText] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Set up real-time listener
    const q = query(collection(db, 'support_chats'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      let chatsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (filterStatus !== 'all') {
        chatsData = chatsData.filter(c => c.status === filterStatus);
      }

      // Calculate unread counts
      const newUnreadCounts = {};
      snap.docs.forEach(doc => {
        const chatData = doc.data();
        const unreadCount = (chatData.messages || []).filter(msg => msg.role === 'user' && !msg.readByAdmin).length;
        newUnreadCounts[doc.id] = unreadCount;
      });
      setUnreadCounts(newUnreadCounts);

      // Check for new messages and send notifications
      snap.docs.forEach(doc => {
        const chatData = doc.data();
        const hasUnreadMessages = (chatData.messages || []).some(msg => msg.role === 'user' && !msg.readByAdmin);
        if (hasUnreadMessages && 'Notification' in window && Notification.permission === 'granted') {
          const lastMessage = chatData.messages?.[chatData.messages.length - 1];
          if (lastMessage?.role === 'user') {
            new Notification('New Support Message', {
              body: `${chatData.userEmail}: ${lastMessage.content.substring(0, 50)}...`,
              icon: '💬'
            });
          }
        }
      });

      setChats(chatsData);
      setLoading(false);
    }, (error) => {
      console.error('Failed to load chats:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filterStatus]);

  async function handleAddAdminResponse() {
    if (!responseText.trim() || !selectedChat) return;

    setSending(true);
    try {
      // Mark all user messages as read
      const updatedMessages = selectedChat.messages.map(msg =>
        msg.role === 'user' ? { ...msg, readByAdmin: true } : msg
      );

      // Add admin response
      updatedMessages.push({
        role: 'admin',
        content: responseText,
        timestamp: new Date().toISOString()
      });

      await updateDoc(doc(db, 'support_chats', selectedChat.id), {
        messages: updatedMessages,
        updatedAt: serverTimestamp(),
        status: 'resolved'
      });

      setResponseText('');
      const updatedChat = { ...selectedChat, messages: updatedMessages, status: 'resolved' };
      setSelectedChat(updatedChat);
      setChats(prev => prev.map(c => c.id === selectedChat.id ? updatedChat : c));
      setUnreadCounts(prev => ({ ...prev, [selectedChat.id]: 0 }));
      showToast('Response sent and chat marked as resolved');
    } catch (e) {
      showToast('Error sending response: ' + e.message, 'error');
    } finally {
      setSending(false);
    }
  }

  async function markMessagesAsRead(chatId) {
    try {
      const chat = chats.find(c => c.id === chatId);
      if (!chat) return;

      const updatedMessages = chat.messages.map(msg =>
        msg.role === 'user' ? { ...msg, readByAdmin: true } : msg
      );

      await updateDoc(doc(db, 'support_chats', chatId), {
        messages: updatedMessages
      });

      setUnreadCounts(prev => ({ ...prev, [chatId]: 0 }));
    } catch (e) {
      console.error('Error marking messages as read:', e);
    }
  }

  async function handleChangeStatus(chatId, newStatus) {
    try {
      await updateDoc(doc(db, 'support_chats', chatId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, status: newStatus } : c));
      if (selectedChat?.id === chatId) {
        setSelectedChat({ ...selectedChat, status: newStatus });
      }
      showToast(`Chat marked as ${newStatus}`);
    } catch (e) {
      showToast('Error updating status: ' + e.message, 'error');
    }
  }

  if (loading) return <AdminLayout><div className="ap-loading">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      {toast && <div className={`ap-toast ap-toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '✗'} {toast.msg}</div>}
      <div className="ap-page">
        <div className="ap-header">
          <h1>Customer Support</h1>
          <div style={{ display: 'flex', gap: 10 }}>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-1)',
                fontSize: '0.9rem'
              }}
            >
              <option value="all">All Conversations</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, minHeight: '60vh' }}>
          {/* Chat List */}
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
              <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '0.85rem' }}>
                {chats.length} conversation{chats.length !== 1 ? 's' : ''} {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && `(${Object.values(unreadCounts).reduce((a, b) => a + b, 0)} unread)`}
              </p>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {chats.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)' }}>
                  <p>No conversations yet</p>
                </div>
              ) : (
                chats.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => {
                      setSelectedChat(chat);
                      markMessagesAsRead(chat.id);
                    }}
                    style={{
                      width: '100%',
                      padding: 12,
                      borderBottom: '1px solid var(--border)',
                      background: selectedChat?.id === chat.id ? 'var(--brand-light)' : unreadCounts[chat.id] > 0 ? 'var(--bg)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: unreadCounts[chat.id] > 0 ? 700 : 600, color: 'var(--text-1)' }}>
                        {chat.userEmail}
                      </div>
                      {unreadCounts[chat.id] > 0 && (
                        <span style={{
                          background: 'var(--brand)',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: 10,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          minWidth: 20,
                          textAlign: 'center'
                        }}>
                          {unreadCounts[chat.id]}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 6 }}>
                      {chat.messages?.[chat.messages.length - 1]?.content.substring(0, 40)}...
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                      <span className={`ap-badge ${chat.status === 'resolved' ? 'green' : 'gray'}`}>
                        {chat.status}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                        {new Date(chat.updatedAt?.seconds * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Detail */}
          {selectedChat ? (
            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-1)' }}>{selectedChat.userEmail}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-3)' }}>
                  Started {new Date(selectedChat.createdAt?.seconds * 1000).toLocaleDateString()}
                </p>
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <select
                    value={selectedChat.status}
                    onChange={e => handleChangeStatus(selectedChat.id, e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 4,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text-1)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {selectedChat.messages?.map((msg, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div
                      style={{
                        maxWidth: '75%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        background:
                          msg.role === 'user'
                            ? 'var(--brand)'
                            : msg.role === 'admin'
                            ? 'var(--success)'
                            : 'var(--bg)',
                        color: (msg.role === 'user' || msg.role === 'admin') ? 'white' : 'var(--text-1)',
                        fontSize: '0.9rem',
                        wordWrap: 'break-word'
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              {selectedChat.status === 'open' && (
                <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
                  <textarea
                    value={responseText}
                    onChange={e => setResponseText(e.target.value)}
                    placeholder="Type admin response..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text-1)',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem',
                      marginBottom: 10,
                      resize: 'vertical',
                      minHeight: 60
                    }}
                  />
                  <button
                    onClick={handleAddAdminResponse}
                    disabled={!responseText.trim() || sending}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: 'var(--success)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: !responseText.trim() || sending ? 0.5 : 1
                    }}
                  >
                    {sending ? 'Sending...' : 'Send Admin Response'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: 'var(--text-3)' }}>Select a conversation to view details</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
