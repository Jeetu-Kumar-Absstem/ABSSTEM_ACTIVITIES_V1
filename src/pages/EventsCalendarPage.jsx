// src/pages/EventsCalendarPage.jsx
// Activity Planner ▸ Events ▸ Events Calendar
// Renders a top tab bar (Events Calendar / Tournaments / Leaderboard) plus
// a full month calendar, an Upcoming Events list and a Past Events table.
import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import EventsTopBar from '../components/events/EventsTopBar';
import useViewport from '../hooks/useViewport';
import MobileTable from '../components/common/MobileTable';
import BottomSheet from '../components/common/BottomSheet';

const lufgaFontStyle = `
  @font-face {
    font-family: 'Lufga';
    src: url('/fonts/Lufga-Regular.otf') format('opentype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Lufga';
    src: url('/fonts/Lufga-SemiBold.otf') format('opentype');
    font-weight: 600;
    font-style: normal;
    font-display: swap;
  }
`;

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const EVENT_TYPE_STYLE = {
  company:     { background: 'rgba(111,156,255,0.14)', color: 'var(--accent)' },
  tournament:  { background: 'rgba(106,27,154,0.16)', color: '#d8a4ff' },
  outstation:  { background: 'rgba(46,125,50,0.16)', color: 'var(--success)' },
  celebration: { background: 'rgba(249,168,37,0.16)', color: 'var(--warning)' },
};

const STATUS_BADGE = {
  scheduled: { label: 'Scheduled', bg: 'rgba(111,156,255,0.14)', color: 'var(--accent)' },
  ongoing:   { label: 'Ongoing',   bg: 'rgba(249,168,37,0.16)', color: 'var(--warning)' },
  completed: { label: 'Completed', bg: 'rgba(46,125,50,0.16)', color: 'var(--success)' },
  cancelled: { label: 'Cancelled', bg: 'rgba(229,57,53,0.16)', color: 'var(--danger)' },
  postponed: { label: 'Postponed', bg: 'rgba(106,27,154,0.16)', color: '#d8a4ff' },
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
  const { isMobile } = useViewport();

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

  // Inject Lufga font into document head
  useEffect(() => {
    const styleId = 'lufga-font-style';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = lufgaFontStyle;
      document.head.appendChild(styleEl);
    }
  }, []);

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
    <div className="events-calendar-page" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400, fontSize: 13, color: 'var(--text)' }}>
      <EventsTopBar active="eventsCalendar" />

      {/* Stats row */}
      <div className="events-stats-grid" style={styles.statsRow}>
        {[
          { label: 'Total Events',  val: totalEvents,      color: 'var(--accent)', sub: 'This year' },
          { label: 'Upcoming',      val: upcomingCount,   color: '#f9a825', sub: 'Future' },
          { label: 'Completed',     val: pastCount,       color: '#00897b', sub: 'This year' },
          { label: 'Tournaments',   val: tournamentCount, color: '#6a1b9a', sub: 'All time' },
          { label: 'Outstation',    val: outstationCount, color: '#388e3c', sub: 'All time' },
          { label: 'Celebrations',  val: celebrationCount, color: '#e65100', sub: 'All time' },
        ].map((s, i) => (
          <div
            key={i}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              ...styles.statCard,
              padding: '12px 16px',
              background: hoveredIndex === i ? s.color : 'var(--bg-surface-strong)',
              borderTop: `3px solid ${s.color}`,
              borderRight: `2px solid ${hoveredIndex === i ? s.color : 'rgba(200,210,230,0.3)'}`,
              borderBottom: `2px solid ${hoveredIndex === i ? s.color : 'rgba(200,210,230,0.3)'}`,
              borderLeft: `2px solid ${hoveredIndex === i ? s.color : 'rgba(200,210,230,0.3)'}`,
              transform: hoveredIndex === i ? 'translateY(-5px) scale(1.03)' : 'translateY(0) scale(1)',
              boxShadow: hoveredIndex === i ? `0 8px 24px ${s.color}66` : '6px 6px 14px rgba(0,0,0,0.06), -6px -6px 14px rgba(255,255,255,0.5)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'default',
            }}
          >
            <div style={{ ...styles.statLabel, color: hoveredIndex === i ? 'rgba(255,255,255,0.85)' : 'var(--muted)' }}>{s.label}</div>
            <div style={{ ...styles.statVal, color: hoveredIndex === i ? '#fff' : s.color }}>{s.val}</div>
            <div style={{ ...styles.statSub, color: hoveredIndex === i ? 'rgba(255,255,255,0.8)' : 'var(--muted)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ ...styles.gridLayout, gridTemplateColumns: isMobile ? '1fr' : '1fr 320px' }}>
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
                    ...(isMobile ? { minHeight: 56, padding: '0.2rem' } : {}),
                    background: cell.other ? 'var(--bg-surface-strong)' : cell.isToday ? 'rgba(var(--accent-rgb),0.12)' : cell.evs.length ? 'rgba(249,168,37,0.08)' : 'var(--bg-surface-strong)',
                    cursor: cell.other ? 'default' : 'pointer',
                  }}
                >
                  {cell.isToday ? (
                    <div style={styles.todayBadge}>{cell.day}</div>
                  ) : (
                    <div style={{ ...styles.cellDay, color: cell.other ? 'var(--muted)' : 'var(--text)' }}>{cell.day}</div>
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
                      background: isPending ? 'rgba(229,57,53,0.08)' : 'transparent',
                      borderLeft: isPending ? '3px solid var(--danger)' : '3px solid transparent',
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
                              background: isPending ? 'var(--danger)' : 'transparent',
                              color: isPending ? 'var(--text-strong)' : 'var(--danger)',
                              border: `1px solid ${isPending ? 'var(--danger)' : 'rgba(229,57,53,0.24)'}`,
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
        <div style={{ ...styles.calendarNav, borderBottom: '1px solid var(--border)' }}>
          <div style={{ ...styles.calendarTitle, textAlign: 'left', minWidth: 0 }}>🕓 Past Events</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{pastCount} event(s)</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <MobileTable
            columns={[
              {
                key: 'title',
                label: 'Event',
                hideOnCard: true,
                render: (ev) => (
                  <>
                    <div style={{ fontWeight: 600, fontFamily: "'Lufga', sans-serif" }}>{ev.title}</div>
                    {ev.organizer && <div style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>by {ev.organizer}</div>}
                  </>
                ),
              },
              { key: 'date', label: 'Date', render: (ev) => formatDateRange(ev) },
              {
                key: 'event_type',
                label: 'Type',
                render: (ev) => {
                  const type = EVENT_TYPE_STYLE[ev.event_type] || EVENT_TYPE_STYLE.company;
                  return <span style={{ ...type, ...styles.tableChip }}>{ev.event_type}</span>;
                },
              },
              { key: 'venue', label: 'Venue', render: (ev) => ev.venue || '—' },
              {
                key: 'event_status',
                label: 'Status',
                render: (ev) => {
                  const status = STATUS_BADGE[ev.event_status] || STATUS_BADGE.completed;
                  return <span style={{ ...status, ...styles.tableChip }}>{status.label}</span>;
                },
              },
            ]}
            rows={pastEvents}
            rowKey={(ev) => ev.id}
            emptyMessage="No past events recorded yet."
            cardTitle={(ev) => ev.title}
            cardSubtitle={(ev) => (
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                📅 {formatDateRange(ev)} {ev.organizer ? `· by ${ev.organizer}` : ''}
              </div>
            )}
          />
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (() => {
        const formBody = (
          <>
            <div style={{ padding: '1rem' }}>
              <div style={{ ...styles.formGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                <div style={{ ...styles.formRow, gridColumn: isMobile ? 'auto' : 'span 2' }}>
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
                <div style={{ ...styles.formRow, gridColumn: isMobile ? 'auto' : 'span 2' }}>
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
                <div style={{ ...styles.formRow, gridColumn: isMobile ? 'auto' : 'span 2' }}>
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
          </>
        );

        if (isMobile) {
          return (
            <BottomSheet open onClose={() => setShowAddModal(false)} title="Add New Event" icon="📅">
              {formBody}
            </BottomSheet>
          );
        }

        return createPortal(
          <div onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
               style={styles.modalBackdrop}>
            <div style={styles.modalCard}>
              <div style={styles.modalHeader}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, fontFamily: "'Lufga', sans-serif" }}>Add New Event</h3>
                <button onClick={() => setShowAddModal(false)} style={styles.modalClose}>✕</button>
              </div>
              {formBody}
            </div>
          </div>,
          document.body
        );
      })()}

      {/* Event details modal */}
      {selectedEvent && (() => {
        const detailsBody = (
          <>
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
          </>
        );

        if (isMobile) {
          return (
            <BottomSheet
              open
              onClose={() => setSelectedEvent(null)}
              title={selectedEvent.title}
              icon="📅"
            >
              {detailsBody}
            </BottomSheet>
          );
        }

        return createPortal(
          <div onClick={(e) => { if (e.target === e.currentTarget) setSelectedEvent(null); }}
               style={styles.modalBackdrop}>
            <div style={{ ...styles.modalCard, maxWidth: 520 }}>
              <div style={styles.modalHeader}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, fontFamily: "'Lufga', sans-serif" }}>
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
              {detailsBody}
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
};

const DetailRow = ({ label, value }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.6rem', padding: '0.3rem 0', borderBottom: '1px solid var(--border)' }}>
    <div style={{ color: 'var(--muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>{label}</div>
    <div style={{ color: 'var(--text)', fontFamily: "'Lufga', sans-serif", fontWeight: 500 }}>{value}</div>
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
    borderRadius: 16,
    padding: '0.7rem 0.9rem',
  },
  statLabel: { fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem', fontFamily: "'Lufga', sans-serif", fontWeight: 600 },
  statVal:   { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1, fontFamily: "'Lufga', sans-serif" },
  statSub:   { fontSize: '0.6rem', color: 'var(--muted)', marginTop: '0.18rem', fontFamily: "'Lufga', sans-serif", fontWeight: 500 },

  gridLayout: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '0.8rem' },

  calendarCard: {
    background: 'var(--bg-surface-strong)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: 'var(--surface-shadow-soft)',
  },
  calendarNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.6rem 0.9rem',
    borderBottom: '1px solid var(--border)',
    flexWrap: 'wrap',
  },
  calendarTitle: { fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-strong)', minWidth: 150, textAlign: 'center', fontFamily: "'Lufga', sans-serif" },
  navBtn: {
    background: 'var(--bg-muted)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    width: 28, height: 28,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text)',
  },
  outlineBtn: {
    background: 'var(--bg-muted)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4,
    padding: '0.22rem 0.7rem', fontSize: '0.7rem', fontWeight: 400, cursor: 'pointer', fontFamily: "'Lufga', sans-serif",
  },
  navyBtn: {
    background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 4,
    padding: '0.22rem 0.7rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Lufga', sans-serif",
  },
  dangerBtn: {
    background: 'var(--danger)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 4,
    padding: '0.32rem 0.85rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Lufga', sans-serif",
  },

  weekHeader: {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
    background: 'var(--bg-muted)', borderBottom: '1px solid var(--border)',
  },
  weekHeaderCell: {
    textAlign: 'center', fontSize: '0.62rem', fontWeight: 700, color: 'var(--muted)',
    padding: '0.4rem 0', textTransform: 'uppercase', fontFamily: "'Lufga', sans-serif",
  },
  calendarGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' },
  calendarCell: {
    minHeight: 88,
    borderRight: '1px solid var(--border)',
    borderBottom: '1px solid var(--border)',
    padding: '0.3rem 0.35rem',
  },
  todayBadge: {
    width: 22, height: 22, background: 'var(--accent)', color: 'var(--accent-contrast)',
    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.2rem', fontFamily: "'Lufga', sans-serif",
  },
  cellDay: { fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.2rem', fontFamily: "'Lufga', sans-serif" },
  eventChip: {
    fontSize: '0.6rem', padding: '0.08rem 0.3rem', borderRadius: 3,
    marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden',
    textOverflow: 'ellipsis', cursor: 'pointer', fontWeight: 400, fontFamily: "'Lufga', sans-serif",
  },
  moreChip: { fontSize: '0.58rem', color: 'var(--muted)', padding: '0.05rem 0.25rem', fontFamily: "'Lufga', sans-serif", fontWeight: 500 },

  legend: { display: 'flex', gap: '1rem', padding: '0.6rem 0.2rem', flexWrap: 'wrap' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.66rem', color: 'var(--text-soft)' },
  legendSwatch: { display: 'inline-block', width: 12, height: 12, borderRadius: 3 },

  sideCard: {
    background: 'var(--bg-surface-strong)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
    boxShadow: 'var(--surface-shadow-soft)',
  },
  sideHeader: {
    background: 'var(--accent)', color: 'var(--accent-contrast)', padding: '0.5rem 0.85rem',
    fontSize: '0.78rem', fontWeight: 600, fontFamily: "'Lufga', sans-serif",
  },
  sideEmpty: { padding: '0.8rem', fontSize: '0.75rem', color: 'var(--muted)', fontFamily: "'Lufga', sans-serif", fontWeight: 500 },
  sideItem: { borderBottom: '1px solid var(--border)', padding: '0.7rem 0.85rem', cursor: 'pointer', transition: 'background 0.15s', fontFamily: "'Lufga', sans-serif" },
  sideItemTitle: { fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.2rem', fontFamily: "'Lufga', sans-serif" },
  sideItemMeta: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.66rem', color: 'var(--text-soft)', marginTop: '0.2rem', fontFamily: "'Lufga', sans-serif", fontWeight: 500 },
  miniChip: { padding: '0.1rem 0.45rem', borderRadius: 10, fontSize: '0.6rem', fontWeight: 400, textTransform: 'capitalize', fontFamily: "'Lufga', sans-serif" },
  statusChip: { padding: '0.1rem 0.45rem', borderRadius: 10, fontSize: '0.6rem', fontWeight: 600, fontFamily: "'Lufga', sans-serif" },
  tableChip: { padding: '0.1rem 0.5rem', borderRadius: 4, fontSize: '0.66rem', fontWeight: 400, textTransform: 'capitalize', fontFamily: "'Lufga', sans-serif" },

  th: { padding: '0.5rem 0.6rem', textAlign: 'left', fontSize: '0.65rem', color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'Lufga', sans-serif", fontWeight: 700 },
  td: { padding: '0.5rem 0.6rem', verticalAlign: 'top', fontFamily: "'Lufga', sans-serif", fontWeight: 400 },

  modalBackdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 300,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 70,
  },
  modalCard: {
    background: 'var(--bg-surface-strong)', borderRadius: 8, width: 540, maxWidth: '96vw',
    maxHeight: '85vh', overflowY: 'auto', boxShadow: 'var(--surface-shadow)',
  },
  modalHeader: {
    background: 'var(--accent)', color: 'var(--accent-contrast)', padding: '0.7rem 1rem',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '8px 8px 0 0',
    fontFamily: "'Lufga', sans-serif",
  },
  modalClose: { background: 'none', border: 'none', color: 'var(--accent-contrast)', fontSize: '1rem', cursor: 'pointer', fontFamily: "'Lufga', sans-serif" },
  modalFooter: {
    padding: '0.7rem 1rem', borderTop: '1px solid var(--border)', display: 'flex',
    justifyContent: 'flex-end', gap: '0.4rem', background: 'var(--bg-muted)', borderRadius: '0 0 8px 8px',
    fontFamily: "'Lufga', sans-serif",
  },

  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem 0.85rem' },
  formRow: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  formLabel: { fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-soft)', fontFamily: "'Lufga', sans-serif" },
  formInput: {
    padding: '0.32rem 0.55rem', border: '1px solid var(--border)', borderRadius: 4,
    fontSize: '0.75rem', fontFamily: "'Lufga', sans-serif", fontWeight: 500, color: 'var(--text)', width: '100%',
  },
};

export default EventsCalendarPage;