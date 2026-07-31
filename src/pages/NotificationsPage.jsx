import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Trash2, Bell, MessageSquare, ArrowLeft, Check, CheckSquare, Square, X } from 'lucide-react';
import { format } from 'date-fns';

const NotificationsPage = () => {
  const { notifications, loadNotifications, markNotificationAsRead, deleteNotificationLog, deleteMultipleNotificationLogs, setActiveTab } = useApp();
  const { showToast } = useToast();
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Swipe detection refs
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    loadNotifications();
  }, []);

  // Selection Logic
  const toggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleLongPress = (notif) => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectedIds([notif.id]);
    }
  };

  const handleSelect = async (notif) => {
    if (selectionMode) {
      toggleSelection(notif.id);
      return;
    }
    setSelectedNotif(notif);
    if (notif.notification_logs?.[0]?.status === 'sent') {
      await markNotificationAsRead(notif.id);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map(n => n.id));
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  // Deletion Logic
  const handleDelete = async (e, id) => {
    if (e) e.stopPropagation();
    const res = await deleteNotificationLog(id);
    if (res.success) {
      showToast('Notification removed', 'success');
      if (selectedNotif?.id === id) setSelectedNotif(null);
    } else {
      showToast(res.error, 'error');
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    const res = await deleteMultipleNotificationLogs(selectedIds);
    if (res.success) {
      showToast(`${selectedIds.length} notifications removed`, 'success');
      exitSelectionMode();
    } else {
      showToast(res.error, 'error');
    }
  };

  // Swipe logic
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (selectedNotif) return; // Disable swipe when detail is open
    if (touchStartX.current - touchEndX.current < -100) {
      // Swiped Right (minimum 100px)
      setActiveTab('dashboard');
    }
  };

  // Long press helper hook-like logic
  const [timer, setTimer] = useState(null);
  const startTimer = (notif) => {
    const t = setTimeout(() => handleLongPress(notif), 600);
    setTimer(t);
  };
  const stopTimer = () => {
    if (timer) clearTimeout(timer);
  };

  if (selectedNotif) {
    return (
      <div style={{ display: 'grid', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setSelectedNotif(null)}
            className="clay-button"
            style={{ padding: '8px', borderRadius: '12px', background: 'var(--bg-surface)', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Notification Details</h2>
        </div>

        <div className="clay-card" style={{ padding: '24px', borderRadius: '28px', background: 'var(--bg-surface-strong)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.3 }}>
                {selectedNotif.title}
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>
                {format(new Date(selectedNotif.created_at), 'PPPP, h:mm a')}
              </div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'var(--accent-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-strong)',
              marginLeft: '12px'
            }}>
              <MessageSquare size={24} />
            </div>
          </div>

          <div style={{
            padding: '20px',
            borderRadius: '20px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            fontSize: '0.95rem',
            lineHeight: 1.6,
            color: 'var(--text)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {selectedNotif.body}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button
              onClick={(e) => handleDelete(e, selectedNotif.id)}
              style={{
                padding: '10px 20px',
                borderRadius: '14px',
                background: 'var(--bg-surface-strong)',
                border: 'none',
                color: 'var(--danger)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              <Trash2 size={16} /> Remove Notification
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ display: 'grid', gap: '24px' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header - Styled to match user image */}
      <div
        className="clay-card"
        style={{
          padding: '28px 24px',
          borderRadius: '32px',
          background: selectionMode ? 'var(--bg-surface-strong)' : 'linear-gradient(135deg, #0f172a, #1e293b)', // Dark Navy
          color: selectionMode ? 'var(--text)' : 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.3s ease',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {selectionMode ? (
            <button
              onClick={exitSelectionMode}
              style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: '4px' }}
            >
              <X size={24} />
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: '4px' }}
              title="Back to Dashboard"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              {selectionMode ? `${selectedIds.length} Selected` : 'Notifications'}
            </h2>
            {!selectionMode && (
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', opacity: 0.8, fontWeight: 500 }}>
                Stay updated with latest activities
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          {selectionMode ? (
            <>
              <button
                onClick={handleSelectAll}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}
                title="Select All"
              >
                <CheckSquare size={26} />
              </button>
              <button
                onClick={handleDeleteSelected}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                title="Delete Selected"
              >
                <Trash2 size={26} />
              </button>
            </>
          ) : (
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <Bell size={28} strokeWidth={2} />
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {notifications.length === 0 ? (
          <div className="clay" style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--muted)' }}>
            <Bell size={64} style={{ marginBottom: '20px', opacity: 0.1, margin: '0 auto' }} />
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const isUnread = notif.notification_logs?.[0]?.status === 'sent';
            const isSelected = selectedIds.includes(notif.id);

            return (
              <div
                key={notif.id}
                className="clay"
                onMouseDown={() => startTimer(notif)}
                onMouseUp={stopTimer}
                onMouseLeave={stopTimer}
                onTouchStart={(e) => { handleTouchStart(e); startTimer(notif); }}
                onTouchEnd={(e) => { stopTimer(); }}
                onClick={() => handleSelect(notif)}
                style={{
                  padding: '20px',
                  borderRadius: '28px',
                  background: isSelected ? 'var(--accent-soft)' : 'white',
                  border: '1px solid',
                  borderColor: isSelected ? 'var(--accent)' : 'rgba(0,0,0,0.06)',
                  boxShadow: '0 8px 20px -4px rgba(0,0,0,0.05)',
                  position: 'relative',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  {selectionMode ? (
                    <div style={{ color: isSelected ? 'var(--accent)' : '#cbd5e1', flexShrink: 0 }}>
                      {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
                    </div>
                  ) : (
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '16px',
                      background: isUnread ? 'var(--accent-soft)' : '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isUnread ? 'var(--accent-strong)' : '#64748b',
                      flexShrink: 0,
                      border: '1px solid rgba(0,0,0,0.02)'
                    }}>
                      <MessageSquare size={24} />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        color: isUnread || isSelected ? 'var(--accent-strong)' : '#1e293b',
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.2
                      }}>
                        {notif.title}
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', flexShrink: 0, fontWeight: 500, marginTop: '2px' }}>
                        {format(new Date(notif.created_at), 'MMM d')}
                      </span>
                    </div>
                    <p style={{
                      margin: '4px 0 0',
                      fontSize: '0.85rem',
                      color: '#64748b',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.4,
                      fontWeight: 400
                    }}>
                      {notif.body}
                    </p>
                  </div>

                  {!selectionMode && (
                    <button
                      onClick={(e) => handleDelete(e, notif.id)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: 'none',
                        color: '#ef4444',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        flexShrink: 0
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}

                  {isUnread && !selectionMode && (
                    <div style={{
                      position: 'absolute',
                      right: '12px',
                      top: '12px',
                      width: '8px',
                      height: '8px',
                      background: 'var(--accent)',
                      borderRadius: '50%',
                      boxShadow: '0 0 0 2px white'
                    }} />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
