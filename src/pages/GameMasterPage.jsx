// src/pages/GameMasterPage.jsx

import React from "react";
import { useApp } from "../context/AppContext";
import { ChessKing, Disc3, Trophy } from "lucide-react";

const gameIcons = {
  chess: <ChessKing size={20} strokeWidth={2} />,
  carrom: <Disc3 size={20} strokeWidth={2} />,
};

const GameMasterPage = () => {
  const { games } = useApp();

  return (
    <div className="clay-card">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            color: "#1e1e2f",
          }}
        >
          Game Master — All Activities
        </h2>

        <button className="clay-btn clay-btn-primary">
          + Add Game
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "12px",
        }}
      >
        <label
          style={{
            fontSize: "0.7rem",
            color: "#8888aa",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          Status:
          <select
            className="clay-select"
            style={{
              padding: "6px 14px",
              fontSize: "0.7rem",
              width: "auto",
            }}
          >
            <option>All</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </label>

        <button
          className="clay-btn clay-btn-teal"
          style={{ fontSize: "0.7rem" }}
        >
          🔍 Search
        </button>

        <button
          className="clay-btn"
          style={{ fontSize: "0.7rem" }}
        >
          ↺ Reset
        </button>
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
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.7rem",
          }}
        >
          <thead>
            <tr style={{ background: "rgba(26,60,110,0.05)" }}>
              <th style={thStyle}>Edit</th>
              <th style={thStyle}>Game Code</th>
              <th style={thStyle}>Game Name</th>
              <th style={thStyle}>Icon</th>
              <th style={thStyle}>Location</th>
              <th style={{ ...thStyle, textAlign: "center" }}>
                Max/Slot
              </th>
              <th style={thStyle}>Active</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>

          <tbody>
            {games.map((game, i) => (
              <tr
                key={game.id}
                style={{
                  borderBottom: "1px solid rgba(200,210,230,0.2)",
                }}
              >
                <td style={tdStyle}>
                  <input type="checkbox" />
                </td>

                <td
                  style={{
                    ...tdStyle,
                    color: "#1a3c6e",
                    fontWeight: 500,
                  }}
                >
                  ACT-00{i + 1}
                </td>

                <td
                  style={{
                    ...tdStyle,
                    fontWeight: 500,
                  }}
                >
                  {game.name}
                </td>

                {/* Game Icon */}
                <td style={tdStyle}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      color: "#1a3c6e",
                    }}
                  >
                    {gameIcons[game.icon?.toLowerCase()] || (
                      <Trophy size={20} />
                    )}
                  </div>
                </td>

                <td style={tdStyle}>{game.location}</td>

                <td
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    fontWeight: 600,
                  }}
                >
                  {game.maxPlayers}
                </td>

                <td style={tdStyle}>
                  <span
                    className={
                      game.active === false
                        ? "clay-badge clay-badge-red"
                        : "clay-badge clay-badge-green"
                    }
                  >
                    {game.active === false
                      ? "✕ Inactive"
                      : "✓ Active"}
                  </span>
                </td>

                <td style={tdStyle}>
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                    }}
                  >
                    <button
                      className="clay-btn"
                      style={{
                        padding: "4px 10px",
                        fontSize: "0.6rem",
                      }}
                    >
                      👁
                    </button>

                    <button
                      className="clay-btn"
                      style={{
                        padding: "4px 10px",
                        fontSize: "0.6rem",
                      }}
                    >
                      ✏
                    </button>

                    <button
                      className="clay-btn"
                      style={{
                        padding: "4px 10px",
                        fontSize: "0.6rem",
                        color: "#e53935",
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const thStyle = {
  padding: "8px 10px",
  textAlign: "left",
  fontWeight: 500,
  color: "#444466",
};

const tdStyle = {
  padding: "8px 10px",
};

export default GameMasterPage;
