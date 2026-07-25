// src/pages/GameMasterPage.jsx

import React from "react";
import { useApp } from "../context/AppContext";
import { ChessKing, Disc3, Trophy } from "lucide-react";
import useViewport from "../hooks/useViewport";
import MobileTable from "../components/common/MobileTable";

const gameIcons = {
  chess: <ChessKing size={20} strokeWidth={2} />,
  carrom: <Disc3 size={20} strokeWidth={2} />,
};

const thStyle = {
  padding: "8px 10px",
  textAlign: "left",
  fontWeight: 500,
  color: "var(--text-soft)",
  fontSize: "0.7rem",
};
const tdStyle = { padding: "8px 10px", fontSize: "0.7rem" };

const GameMasterPage = () => {
  const { games } = useApp();
  const { isMobile } = useViewport();

  // Decorate rows with a stable code for display
  const rows = games.map((game, i) => ({
    ...game,
    _code: `ACT-00${i + 1}`,
    _iconNode: gameIcons[String(game.icon || "").toLowerCase()] || (
      <Trophy size={20} />
    ),
  }));

  const columns = [
    {
      key: "edit",
      label: "Edit",
      render: () => <input type="checkbox" />,
    },
    {
      key: "_code",
      label: "Game Code",
      render: (row) => (
        <span style={{ color: "var(--accent)", fontWeight: 500 }}>
          {row._code}
        </span>
      ),
    },
    {
      key: "name",
      label: "Game Name",
      render: (row) => <span style={{ fontWeight: 500 }}>{row.name}</span>,
    },
    {
      key: "icon",
      label: "Icon",
      align: "center",
      render: (row) => (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "var(--accent)",
          }}
        >
          {row._iconNode}
        </div>
      ),
    },
    { key: "location", label: "Location" },
    {
      key: "maxPlayers",
      label: "Max/Slot",
      align: "center",
      render: (row) => (
        <span style={{ fontWeight: 600 }}>{row.maxPlayers}</span>
      ),
    },
    {
      key: "active",
      label: "Active",
      render: (row) =>
        row.active === false ? (
          <span className="clay-badge clay-badge-red">✕ Inactive</span>
        ) : (
          <span className="clay-badge clay-badge-green">✓ Active</span>
        ),
    },
    {
      key: "actions",
      label: "Action",
      render: () => (
        <div style={{ display: "flex", gap: "6px" }}>
          <button className="clay-btn" style={{ padding: "4px 10px", fontSize: "0.6rem" }}>👁</button>
          <button className="clay-btn" style={{ padding: "4px 10px", fontSize: "0.6rem" }}>✏</button>
          <button className="clay-btn" style={{ padding: "4px 10px", fontSize: "0.6rem", color: "var(--danger)" }}>🗑</button>
        </div>
      ),
    },
  ];

  return (
    <div className="clay-card">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <h2
          style={{
            fontSize: "1.6rem",
            fontWeight: 600,
            color: "var(--text-strong)",
            margin: 0,
            flex: 1,
            minWidth: 0,
          }}
        >
          Game Master — All Activities
        </h2>

        <button className="clay-btn clay-btn-primary">+ Add Game</button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: isMobile ? "flex" : "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "12px",
        }}
      >
        <label
          style={{
            fontSize: "0.7rem",
            color: "var(--muted)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            width: isMobile ? "100%" : "auto",
          }}
        >
          Status:
          <select className="clay-select" style={{ padding: "6px 14px", fontSize: "0.7rem", width: isMobile ? "100%" : "auto" }}>
            <option>All</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </label>

        <input
          type="text"
          className="clay-input"
          placeholder="Search games…"
          style={{ flex: 1, minWidth: 0, fontSize: "0.75rem", display: isMobile ? "block" : "none" }}
        />

        <div style={{ display: "flex", gap: "8px", flex: isMobile ? "none" : 1, justifyContent: isMobile ? "space-between" : "flex-end" }}>
          <button className="clay-btn clay-btn-teal" style={{ fontSize: "0.7rem", display: isMobile ? "none" : "inline-flex" }}>
            🔍 Search
          </button>
          <button className="clay-btn" style={{ fontSize: "0.7rem" }}>
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Total Records */}
      <div
        className="clay-soft"
        style={{
          padding: "6px 14px",
          borderRadius: "20px",
          display: "inline-block",
          fontSize: "0.7rem",
          marginBottom: "12px",
        }}
      >
        Total Record(s) Found: {games.length}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <MobileTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage="No games found"
          theadClassName=""
          tbodyClassName=""
        />
      </div>
    </div>
  );
};

export default GameMasterPage;
