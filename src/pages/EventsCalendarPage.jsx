// src/pages/EventsCalendarPage.jsx
// Activity Planner ▸ Events ▸ Events Calendar
// Renders a top tab bar (Events Calendar / Tournaments / Leaderboard) plus
// a full month calendar, an Upcoming Events list and a Past Events table.
import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import EventsTopBar from '../components/events/EventsTopBar';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const EVENT_TYPE_STYLE = {
  company:     { background: '#e3f2fd', color: '#1565c0' },
  tournament:  { background: '#fce4ec', color: '#880e4f' },
  outstation:  { background: '#e8f5e9', color: '#2e7d32' },
  celebration: { background: '#fff3e0', color: '#e65100' },
};

const STATUS_BADGE = {
  scheduled: { label: 'Scheduled', bg: '#e3f2fd', color: '#1565c0' },
  ongoing:   { label: 'Ongoing',   bg: '#fff3e0', color: '#e65100' },
  completed: { label: 'Completed', bg: '#e8f5e9', color: '#2e7d32' },
  cancelled: { label: 'Cancelled', bg: '#ffebee', color: '#c62828' },
  postponed: { label: 'Postponed', bg: '#f3e5f5', color: '#6a1b9a' },
};

const pad2 = n => String(n).padStart(2, '0');
const fmtDate = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

const formatDateRange = (event) => {
  if (!event.start_date) return '';
  const start = new Date(event.start_date);
  if (event.end_date && event.end_date !== event.start_date) {
    const end = new Date(event.end_date);
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    if (sameMonth) {
      return `${start.getDate()} – ${end.getDate()} ${MONTHS[start.getMonth()].slice(0,3)} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${MONTHS[start.getMonth()].slice(0,3)} – ${end.getDate()} ${MONTHS[end.getMonth()].slice(0,3)} ${start.getFullYear()}`;
  }
  return `${start.getDate()} ${MONTHS[start.getMonth()].slice(0,3)} ${start.getFullYear()}`;
};

const formatTimeRange = (event) => {
  if (!event.start_time) return '';
  const t = (s) => {
    if (!s) return '';
    const [h, m] = String(s).split(':');
    const hr = parseInt(h, 10);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const hr12 = ((hr + 11) % 12) + 1;
    return `${hr12}:${m} ${ampm}`;
  };
  if (event.end_time) return `${t(event.start_time)} – ${t(event.end_time)}`;
  return t(event.start_time);
};

const EventsCalendarPage = () => {
  const {
    events,
    getUpcomingEvents,
    getPastEvents,
    addEvent,
    deleteEvent,
    isAdmin,
    currentUser,
  } = useApp();
  const { showToast } = useToast();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    event_type: 'company',
    start_date: fmtDate(year, month, today.getDate()),
    end_date: '',
    start_time: '',
    end_time: '',
    venue: '',
    location: '',
    organizer: '',
    description: '',
    max_participants: '',
  });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Initial load happens in AppProvider; this page just reads `events` from
  // context. After addEvent/deleteEvent, AppContext already refreshes the list.

  const upcomingEvents = useMemo(() => getUpcomingEvents(), [getUpcomingEvents, events]);
  const pastEvents = useMemo(() => getPastEvents(), [getPastEvents, events]);

  const eventsByDate = useMemo(() => {
    const map = {};
    for (const ev of events) {
      if (!ev.start_date) continue;
      const key = String(ev.start_date).slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  // Stats for the top row
  const totalEvents = events.length;
  const upcomingCount = upcomingEvents.length;
  const pastCount = pastEvents.length;
  const tournamentCount = events.filter(e => e.event_type === 'tournament').length;
  const outstationCount = events.filter(e => e.event_type === 'outstation').length;
  const celebrationCount = events.filter(e => e.event_type === 'celebration').length;

  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMon = new Date(year, month + 1, 0).getDate();
    const prevMonLen = new Date(year, month, 0).getDate();
    const arr = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      arr.push({ day: prevMonLen - i, other: true, evs: [] });
    }
    for (let d = 1; d <= daysInMon; d++) {
      const ds = fmtDate(year, month, d);
      const evs = eventsByDate[ds] || [];
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === d;
      arr.push({ day: d, ds, evs, isToday, other: false });
    }
    const remaining = (7 - (firstDay + daysInMon) % 7) % 7;
    for (let i = 1; i <= remaining; i++) {
      arr.push({ day: i, other: true, evs: [] });
    }
    return arr;
  }, [year, month, eventsByDate]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const openAddModal = (presetDate = null) => {
    setForm(f => ({
      ...f,
      start_date: presetDate || fmtDate(year, month, today.getDate()),
    }));
    setShowAddModal(true);
  };

  const saveEvent = async () => {
    if (!form.title.trim() || !form.start_date) {
      showToast('Title and start date are required', 'error');
      return;
    }
    const submitter =
      currentUser?.user_metadata?.name ||
      currentUser?.email?.split('@')[0] ||
      'Admin';
    const result = await addEvent({
      ...form,
      max_participants: form.max_participants ? parseInt(form.max_participants, 10) : null,
      organizer: form.organizer || submitter,
    });
    if (result.success) {
      showToast(`Event added: ${form.title}`);
      setShowAddModal(false);
      setForm({
        title: '', event_type: 'company',
        start_date: fmtDate(year, month, today.getDate()),
        end_date: '', start_time: '', end_time: '',
        venue: '', location: '', organizer: '',
        description: '', max_participants: '',
      });
    } else {
      showToast(result.error || 'Failed to add event', 'error');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!isAdmin()) {
      showToast('Only admins can delete events', 'error');
      return;
    }
    const result = await deleteEvent(eventId);
    if (result.success) {
      showToast('Event deleted');
      setSelectedEvent(null);
      setEventToDelete(null);
    } else {
      showToast(result.error || 'Failed to delete event', 'error');
    }
  };

  // Two-step delete from the upcoming-events card: first click sets the
  // pending target (the card flips into a confirm state), second click commits.
  const [eventToDelete, setEventToDelete] = useState(null);
  const requestDeleteFromCard = (e, ev) => {
    e.stopPropagation(); // don't open the details modal
    if (!isAdmin()) return;
    if (eventToDelete?.id === ev.id) {
      // Second click on the same card's delete — commit the delete.
      handleDeleteEvent(ev.id);
    } else {
      setEventToDelete(ev);
    }
  };

  return (
    <div style={{ fontFamily: "'Roboto', Arial, sans-serif", fontSize: 13, color: '#212121' }}>
      <EventsTopBar active="eventsCalendar" />

      {/* Stats row */}
      <div style={styles.statsRow}>
        {[
          { label: 'Total Events',  val: totalEvents,      color: '#1a3c6e', sub: 'This year' },
          { label: 'Upcoming',      val: upcomingCount,   color: '#f9a825', sub: 'Future' },
          { label: 'Completed',     val: pastCount,       color: '#00897b', sub: 'This year' },
          { label: 'Tournaments',   val: tournamentCount, color: '#6a1b9a', sub: 'All time' },
          { label: 'Outstation',    val: outstationCount, color: '#388e3c', sub: 'All time' },
          { label: 'Celebrations',  val: celebrationCount, color: '#e65100', sub: 'All time' },
        ].map((s, i) => (
          <div
            key={i}
            className="clay-card"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              ...styles.statCard,
              padding: '12px 16px',
              borderTop: `3px solid ${s.color}`,
              borderRight: `2px solid ${hoveredIndex === i ? s.color : 'transparent'}`,
              borderBottom: `2px solid ${hoveredIndex === i ? s.color : 'transparent'}`,
              borderLeft: `2px solid ${hoveredIndex === i ? s.color : 'transparent'}`,
              transform: hoveredIndex === i ? 'translateY(-5px) scale(1.03)' : 'translateY(0) scale(1)',
              boxShadow: hoveredIndex === i ? `0 8px 20px ${s.color}33` : 'none',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
              cursor: 'default',
            }}
          >
            <div style={styles.statLabel}>{s.label}</div>
            <div style={{ ...styles.statVal, color: s.color }}>{s.val}</div>
            <div style={styles.statSub}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={styles.gridLayout}>
        {/* Calendar */}
        <div>
          <div style={styles.calendarCard}>
            <div style={styles.calendarNav}>
              <button onClick={prevMonth} style={styles.navBtn}>◀</button>
              <div style={styles.calendarTitle}>{MONTHS[month]} {year}</div>
              <button onClick={nextMonth} style={styles.navBtn}>▶</button>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
                <button onClick={goToday} style={styles.outlineBtn}>Today</button>
                {isAdmin() && (
                  <button onClick={() => openAddModal()} style={styles.navyBtn}>+ Add Event</button>
                )}
              </div>
            </div>

            <div style={styles.weekHeader}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} style={styles.weekHeaderCell}>{d}</div>
              ))}
            </div>

            <div style={styles.calendarGrid}>
              {cells.map((cell, i) => (
                <div
                  key={i}
                  onClick={() => {
                    if (cell.other) return;
                    if (isAdmin()) {
                      openAddModal(cell.ds);
                    } else if (cell.evs.length === 1) {
                      setSelectedEvent(cell.evs[0]);
                    }
                  }}
                  style={{
                    ...styles.calendarCell,
                    background: cell.other ? '#fafafa' : cell.isToday ? '#e8f0fe' : cell.evs.length ? '#fff8f0' : '#fff',
                    cursor: cell.other ? 'default' : 'pointer',
                  }}
                >
                  {cell.isToday ? (
                    <div style={styles.todayBadge}>{cell.day}</div>
                  ) : (
                    <div style={{ ...styles.cellDay, color: cell.other ? '#ccc' : '#212121' }}>{cell.day}</div>
                  )}
                  {!cell.other && cell.evs.slice(0, 3).map((ev, j) => (
                    <div
                      key={j}
                      onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                      style={{
                        ...EVENT_TYPE_STYLE[ev.event_type] || EVENT_TYPE_STYLE.company,
                        ...styles.eventChip,
                      }}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {!cell.other && cell.evs.length > 3 && (
                    <div style={styles.moreChip}>+{cell.evs.length - 3} more</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={styles.legend}>
            {Object.entries(EVENT_TYPE_STYLE).map(([type, style]) => (
              <div key={type} style={styles.legendItem}>
                <span style={{ ...style, ...styles.legendSwatch }} />
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: Upcoming + Past */}
        <div>
          <div style={styles.sideCard}>
            <div style={styles.sideHeader}>📅 Upcoming Events</div>
            {upcomingEvents.length === 0 ? (
              <div style={styles.sideEmpty}>No upcoming events scheduled.</div>
            ) : (
              upcomingEvents.slice(0, 6).map((ev) => {
                const status = STATUS_BADGE[ev.event_status] || STATUS_BADGE.scheduled;
                const type = EVENT_TYPE_STYLE[ev.event_type] || EVENT_TYPE_STYLE.company;
                const isPending = eventToDelete?.id === ev.id;
                return (
                  <div
                    key={ev.id}
                    style={{
                      ...styles.sideItem,
                      background: isPending ? '#ffebee' : 'transparent',
                      borderLeft: isPending ? '3px solid #c62828' : '3px solid transparent',
                    }}
                    onClick={() => {
                      if (isPending) {
                        // Clicking the card body while in confirm state cancels.
                        setEventToDelete(null);
                      } else {
                        setSelectedEvent(ev);
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem' }}>
                      <div style={styles.sideItemTitle}>{ev.title}</div>
                      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ ...type, ...styles.miniChip }}>{ev.event_type}</span>
                        {isAdmin() && (
                          <button
                            onClick={(e) => requestDeleteFromCard(e, ev)}
                            title={isPending ? 'Click again to confirm delete' : 'Delete this event'}
                            style={{
                              background: isPending ? '#c62828' : 'transparent',
                              color: isPending ? 'white' : '#c62828',
                              border: `1px solid ${isPending ? '#c62828' : '#ffcdd2'}`,
                              borderRadius: 4,
                              padding: '0.1rem 0.35rem',
                              fontSize: '0.66rem',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontFamily: 'inherit',
                              whiteSpace: 'nowrap',
                            }}
                          >{isPending ? '✓ Confirm' : '🗑'}</button>
                        )}
                      </div>
                    </div>
                    <div style={styles.sideItemMeta}>
                      <span>📅 {formatDateRange(ev)}</span>
                      {formatTimeRange(ev) && <span>⏰ {formatTimeRange(ev)}</span>}
                    </div>
                    <div style={styles.sideItemMeta}>
                      <span style={{ ...status, ...styles.statusChip }}>{status.label}</span>
                      {ev.venue && <span>📍 {ev.venue}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Past events table */}
      <div style={{ ...styles.calendarCard, marginTop: '1rem' }}>
        <div style={{ ...styles.calendarNav, borderBottom: '1px solid #d0d0d0' }}>
          <div style={{ ...styles.calendarTitle, textAlign: 'left', minWidth: 0 }}>🕓 Past Events</div>
          <div style={{ fontSize: '0.7rem', color: '#888' }}>{pastCount} event(s)</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
            <thead>
              <tr style={{ background: 'rgba(26,60,110,0.05)' }}>
                <th style={styles.th}>Event</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Venue</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {pastEvents.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ ...styles.td, textAlign: 'center', color: '#888' }}>
                    No past events recorded yet.
                  </td>
                </tr>
              ) : pastEvents.map((ev) => {
                const status = STATUS_BADGE[ev.event_status] || STATUS_BADGE.completed;
                const type = EVENT_TYPE_STYLE[ev.event_type] || EVENT_TYPE_STYLE.company;
                return (
                  <tr key={ev.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600 }}>{ev.title}</div>
                      {ev.organizer && <div style={{ fontSize: '0.6rem', color: '#888' }}>by {ev.organizer}</div>}
                    </td>
                    <td style={styles.td}>{formatDateRange(ev)}</td>
                    <td style={styles.td}><span style={{ ...type, ...styles.tableChip }}>{ev.event_type}</span></td>
                    <td style={styles.td}>{ev.venue || '—'}</td>
                    <td style={styles.td}><span style={{ ...status, ...styles.tableChip }}>{status.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
             style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Add New Event</h3>
              <button onClick={() => setShowAddModal(false)} style={styles.modalClose}>✕</button>
            </div>
            <div style={{ padding: '1rem' }}>
              <div style={styles.formGrid}>
                <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                  <label style={styles.formLabel}>Event Title <span style={{ color: '#e53935' }}>*</span></label>
                  <input style={styles.formInput} value={form.title}
                         onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                         placeholder="e.g. Annual Sports Day" />
                </div>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Start Date <span style={{ color: '#e53935' }}>*</span></label>
                  <input style={styles.formInput} type="date" value={form.start_date}
                         onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>End Date</label>
                  <input style={styles.formInput} type="date" value={form.end_date}
                         onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Start Time</label>
                  <input style={styles.formInput} type="time" value={form.start_time}
                         onChange={(e) => setForm(f => ({ ...f, start_time: e.target.value }))} />
                </div>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>End Time</label>
                  <input style={styles.formInput} type="time" value={form.end_time}
                         onChange={(e) => setForm(f => ({ ...f, end_time: e.target.value }))} />
                </div>
                <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                  <label style={styles.formLabel}>Event Type <span style={{ color: '#e53935' }}>*</span></label>
                  <select style={styles.formInput} value={form.event_type}
                          onChange={(e) => setForm(f => ({ ...f, event_type: e.target.value }))}>
                    <option value="company">Company Event</option>
                    <option value="tournament">Tournament</option>
                    <option value="outstation">Outstation</option>
                    <option value="celebration">Celebration</option>
                  </select>
                </div>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Venue</label>
                  <input style={styles.formInput} value={form.venue}
                         onChange={(e) => setForm(f => ({ ...f, venue: e.target.value }))}
                         placeholder="e.g. Recreation Room" />
                </div>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Location</label>
                  <input style={styles.formInput} value={form.location}
                         onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                         placeholder="e.g. Rishikesh" />
                </div>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Organizer</label>
                  <input style={styles.formInput} value={form.organizer}
                         onChange={(e) => setForm(f => ({ ...f, organizer: e.target.value }))} />
                </div>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Max Participants</label>
                  <input style={styles.formInput} type="number" min="1" value={form.max_participants}
                         onChange={(e) => setForm(f => ({ ...f, max_participants: e.target.value }))} />
                </div>
                <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                  <label style={styles.formLabel}>Description</label>
                  <textarea style={{ ...styles.formInput, minHeight: 60, resize: 'vertical' }}
                            value={form.description}
                            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowAddModal(false)} style={styles.outlineBtn}>Cancel</button>
              <button onClick={saveEvent} style={styles.navyBtn}>Save Event</button>
            </div>
          </div>
        </div>
      )}

      {/* Event details modal */}
      {selectedEvent && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setSelectedEvent(null); }}
             style={styles.modalBackdrop}>
          <div style={{ ...styles.modalCard, maxWidth: 520 }}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                {EVENT_TYPE_STYLE[selectedEvent.event_type] && (
                  <span style={{
                    ...EVENT_TYPE_STYLE[selectedEvent.event_type],
                    padding: '0.18rem 0.5rem',
                    borderRadius: 4,
                    marginRight: 8,
                    fontSize: '0.65rem',
                    textTransform: 'uppercase',
                    verticalAlign: 'middle',
                  }}>
                    {selectedEvent.event_type}
                  </span>
                )}
                {selectedEvent.title}
              </h3>
              <button onClick={() => setSelectedEvent(null)} style={styles.modalClose}>✕</button>
            </div>
            <div style={{ padding: '1rem', fontSize: '0.78rem' }}>
              <DetailRow label="Date" value={formatDateRange(selectedEvent)} />
              {formatTimeRange(selectedEvent) && <DetailRow label="Time" value={formatTimeRange(selectedEvent)} />}
              {selectedEvent.venue && <DetailRow label="Venue" value={selectedEvent.venue} />}
              {selectedEvent.location && <DetailRow label="Location" value={selectedEvent.location} />}
              {selectedEvent.organizer && <DetailRow label="Organizer" value={selectedEvent.organizer} />}
              {selectedEvent.max_participants && <DetailRow label="Max Participants" value={String(selectedEvent.max_participants)} />}
              {selectedEvent.description && <DetailRow label="Description" value={selectedEvent.description} />}
              <DetailRow label="Status" value={
                <span style={{ ...(STATUS_BADGE[selectedEvent.event_status] || STATUS_BADGE.scheduled), ...styles.tableChip }}>
                  {(STATUS_BADGE[selectedEvent.event_status] || STATUS_BADGE.scheduled).label}
                </span>
              } />
              {isAdmin() && (
                <div style={{ marginTop: 12, textAlign: 'right' }}>
                  <button onClick={() => handleDeleteEvent(selectedEvent.id)} style={styles.dangerBtn}>
                    🗑 Delete Event
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailRow = ({ label, value }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.6rem', padding: '0.3rem 0', borderBottom: '1px solid #f0f0f0' }}>
    <div style={{ color: '#888', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    <div style={{ color: '#212121' }}>{value}</div>
  </div>
);

const styles = {
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '0.7rem',
    marginBottom: '1rem',
  },
  statCard: {
    background: 'white',
    border: '1px solid #d0d0d0',
    borderRadius: 8,
    padding: '0.7rem 0.9rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  statLabel: { fontSize: '0.6rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' },
  statVal:   { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 },
  statSub:   { fontSize: '0.6rem', color: '#888', marginTop: '0.18rem' },

  gridLayout: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '0.8rem' },

  calendarCard: {
    background: 'white',
    border: '1px solid #d0d0d0',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  calendarNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.6rem 0.9rem',
    borderBottom: '1px solid #d0d0d0',
    flexWrap: 'wrap',
  },
  calendarTitle: { fontSize: '0.95rem', fontWeight: 600, color: '#1a3c6e', minWidth: 150, textAlign: 'center' },
  navBtn: {
    background: 'white',
    border: '1px solid #d0d0d0',
    borderRadius: 4,
    width: 28, height: 28,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontSize: '0.75rem', color: '#1a3c6e',
  },
  outlineBtn: {
    background: 'white', color: '#1a3c6e', border: '1px solid #d0d0d0', borderRadius: 4,
    padding: '0.22rem 0.7rem', fontSize: '0.7rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
  },
  navyBtn: {
    background: '#1a3c6e', color: 'white', border: 'none', borderRadius: 4,
    padding: '0.22rem 0.7rem', fontSize: '0.7rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
  },
  dangerBtn: {
    background: '#c62828', color: 'white', border: 'none', borderRadius: 4,
    padding: '0.32rem 0.85rem', fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
  },

  weekHeader: {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
    background: '#f5f5f5', borderBottom: '1px solid #d0d0d0',
  },
  weekHeaderCell: {
    textAlign: 'center', fontSize: '0.62rem', fontWeight: 700, color: '#888',
    padding: '0.4rem 0', textTransform: 'uppercase',
  },
  calendarGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' },
  calendarCell: {
    minHeight: 88,
    borderRight: '1px solid #eee',
    borderBottom: '1px solid #eee',
    padding: '0.3rem 0.35rem',
  },
  todayBadge: {
    width: 22, height: 22, background: '#1a3c6e', color: 'white',
    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.2rem',
  },
  cellDay: { fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.2rem' },
  eventChip: {
    fontSize: '0.6rem', padding: '0.08rem 0.3rem', borderRadius: 3,
    marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden',
    textOverflow: 'ellipsis', cursor: 'pointer', fontWeight: 500,
  },
  moreChip: { fontSize: '0.58rem', color: '#888', padding: '0.05rem 0.25rem' },

  legend: { display: 'flex', gap: '1rem', padding: '0.6rem 0.2rem', flexWrap: 'wrap' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.66rem', color: '#666' },
  legendSwatch: { display: 'inline-block', width: 12, height: 12, borderRadius: 3 },

  sideCard: {
    background: 'white', border: '1px solid #d0d0d0', borderRadius: 8, overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  sideHeader: {
    background: '#1a3c6e', color: 'white', padding: '0.5rem 0.85rem',
    fontSize: '0.78rem', fontWeight: 600,
  },
  sideEmpty: { padding: '0.8rem', fontSize: '0.75rem', color: '#888' },
  sideItem: { borderBottom: '1px solid #eee', padding: '0.7rem 0.85rem', cursor: 'pointer', transition: 'background 0.15s' },
  sideItemTitle: { fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.2rem' },
  sideItemMeta: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.66rem', color: '#666', marginTop: '0.2rem' },
  miniChip: { padding: '0.1rem 0.45rem', borderRadius: 10, fontSize: '0.6rem', fontWeight: 500, textTransform: 'capitalize' },
  statusChip: { padding: '0.1rem 0.45rem', borderRadius: 10, fontSize: '0.6rem', fontWeight: 600 },
  tableChip: { padding: '0.1rem 0.5rem', borderRadius: 4, fontSize: '0.66rem', fontWeight: 500, textTransform: 'capitalize' },

  th: { padding: '0.5rem 0.6rem', textAlign: 'left', fontSize: '0.65rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.04em' },
  td: { padding: '0.5rem 0.6rem', verticalAlign: 'top' },

  modalBackdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 70,
  },
  modalCard: {
    background: 'white', borderRadius: 8, width: 540, maxWidth: '96vw',
    maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
  },
  modalHeader: {
    background: '#1a3c6e', color: 'white', padding: '0.7rem 1rem',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '8px 8px 0 0',
  },
  modalClose: { background: 'none', border: 'none', color: 'white', fontSize: '1rem', cursor: 'pointer' },
  modalFooter: {
    padding: '0.7rem 1rem', borderTop: '1px solid #d0d0d0', display: 'flex',
    justifyContent: 'flex-end', gap: '0.4rem', background: '#fafafa', borderRadius: '0 0 8px 8px',
  },

  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem 0.85rem' },
  formRow: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  formLabel: { fontSize: '0.7rem', fontWeight: 500, color: '#555' },
  formInput: {
    padding: '0.32rem 0.55rem', border: '1px solid #d0d0d0', borderRadius: 4,
    fontSize: '0.75rem', fontFamily: 'inherit', color: '#212121', width: '100%',
  },
};

export default EventsCalendarPage;