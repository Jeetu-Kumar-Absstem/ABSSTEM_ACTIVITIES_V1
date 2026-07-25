// src/components/common/MobileTable.jsx
// A small, opinionated table/card switcher:
//  - On mobile: renders rows as stacked "clay-soft" cards with label/value pairs.
//  - On desktop: renders the standard <table> with the supplied columns.
//
// Props:
//   columns:    [{ key, label, render?: (row) => node, align?: 'left'|'center'|'right' }]
//   rows:       array of row objects
//   rowKey:     (row) => unique string|number
//   onRowClick: optional — when set, the mobile card is tappable
//   emptyMessage: shown when rows is empty
//   cardRender: optional — if provided, fully custom mobile card instead of label/value list
//   cardTitle:  optional — function (row) => string; used as the card's bold title
//   cardSubtitle: optional — function (row) => node; shown beneath the title
//   cardActions: optional — function (row) => node; action buttons row
//   tableClassName: optional class for the desktop <table>
//   theadClassName / tbodyClassName: optional classes
import React from 'react';
import useViewport from '../../hooks/useViewport';

const MobileTable = ({
  columns = [],
  rows = [],
  rowKey = (r) => r?.id ?? r?.key ?? JSON.stringify(r),
  onRowClick,
  emptyMessage = 'No records yet',
  cardRender,
  cardTitle,
  cardSubtitle,
  cardActions,
  tableClassName = '',
  theadClassName = '',
  tbodyClassName = '',
}) => {
  const { isMobile } = useViewport();

  if (!isMobile) {
    // ── Desktop: standard <table> ────────────────────────────────────
    return (
      <div className="mobile-table-desktop" style={{ overflowX: 'auto' }}>
        <table
          className={tableClassName}
          style={{ width: '100%', borderCollapse: 'collapse' }}
        >
          <thead className={theadClassName}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    textAlign: col.align || 'left',
                    padding: '10px 12px',
                    fontSize: '0.7rem',
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontWeight: 700,
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-soft)',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={tbodyClassName}>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {columns.map((col) => {
                    const value =
                      typeof col.render === 'function' ? col.render(row) : row[col.key];
                    return (
                      <td
                        key={col.key}
                        style={{
                          padding: '12px',
                          fontSize: '0.85rem',
                          color: 'var(--text)',
                          textAlign: col.align || 'left',
                          verticalAlign: 'middle',
                        }}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Mobile: stacked card list ──────────────────────────────────────
  if (rows.length === 0) {
    return <div className="mobile-table-empty">{emptyMessage}</div>;
  }

  return (
    <div className="mobile-table-mobile">
      <div className="mobile-table-list">
        {rows.map((row) => {
          const clickable = !!onRowClick;
          return (
            <div
              key={rowKey(row)}
              className={`mobile-table-card ${clickable ? 'mobile-table-card--clickable' : ''}`}
              onClick={clickable ? () => onRowClick(row) : undefined}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
            >
              {cardRender ? (
                cardRender(row)
              ) : (
                <>
                  {cardTitle && (
                    <div className="mobile-table-card-title">
                      {cardTitle(row)}
                    </div>
                  )}
                  {cardSubtitle && (
                    <div style={{ marginTop: '-2px' }}>{cardSubtitle(row)}</div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    {columns.map((col) => {
                      // Skip the column that becomes the title
                      if (col.hideOnCard) return null;
                      const value =
                        typeof col.render === 'function' ? col.render(row) : row[col.key];
                      return (
                        <div className="mobile-table-card-row" key={col.key}>
                          <span className="mobile-table-card-label">{col.label}</span>
                          <span className="mobile-table-card-value">
                            {value ?? <span style={{ color: 'var(--muted)' }}>—</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {cardActions && (
                    <div className="mobile-table-card-actions">{cardActions(row)}</div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MobileTable;
