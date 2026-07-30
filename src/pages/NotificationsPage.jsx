import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Trash2, Bell, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const NotificationsPage = () => {
  const { notifications, loadNotifications, markNotificationAsRead, deleteNotificationLog } = useApp();
  const { showToast } = useToast();

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleDelete = async (id) => {
    const res = await deleteNotificationLog(id);
    if (res.success) {
      showToast('Notification removed', 'success');
    } else {
      showToast(res.error, 'error');
    }
  };

  const handleRead = async (id) => {
    await markNotificationAsRead(id);
  };

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div
        className="clay-card"
        style={{
          padding: '24px',
          borderRadius: '32px',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
          color: 'var(--accent-contrast)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Notifications</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', opacity: 0.9 }}>
            Stay updated with latest activities
          </p>
        </div>
        <Bell size={32} opacity={0.3} />
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {notifications.length === 0 ? (
          <div className="clay" style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
            <Bell size={48} style={{ marginBottom: '16px', opacity: 0.2, margin: '0 auto' }} />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className="clay"
              onClick={() => handleRead(notif.id)}
              style={{
                padding: '16px',
                borderRadius: '20px',
                background: notif.notification_logs?.[0]?.status === 'sent' ? 'var(--accent-soft)' : 'var(--bg-surface)',
                border: '1px solid var(--border)',
                position: 'relative',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: notif.notification_logs?.[0]?.status === 'sent' ? 'var(--accent-strong)' : 'var(--text-strong)'
                }}>
                  {notif.title}
                </h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                  {format(new Date(notif.created_at), 'MMM d, h:mm a')}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5 }}>
                {notif.body}
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(notif.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 500
                  }}
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>

              {notif.notification_logs?.[0]?.status === 'sent' && (
                <div style={{
                  position: 'absolute',
                  left: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '4px',
                  height: '60%',
                  background: 'var(--accent)',
                  borderRadius: '2px'
                }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
