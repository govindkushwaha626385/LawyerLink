// src/components/Case/CaseTimeline.js
import React from "react";

const EVENT_STYLES = {
  created:       { icon: "🎯", color: "#4f46e5", bg: "#eef2ff" },
  status_change: { icon: "🔄", color: "#d97706", bg: "#fef3c7" },
  document:      { icon: "📄", color: "#0891b2", bg: "#ecfeff" },
  note:          { icon: "📝", color: "#15803d", bg: "#f0fdf4" },
  message:       { icon: "💬", color: "#7c3aed", bg: "#faf5ff" },
  hearing:       { icon: "📅", color: "#dc2626", bg: "#fef2f2" },
  general:       { icon: "🔔", color: "#374151", bg: "#f9fafb" },
};

export default function CaseTimeline({ events = [] }) {
  const sorted = [...events].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (sorted.length === 0) return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: "#9ca3af", fontFamily: "Inter,sans-serif" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>🗓️</div>
      <p style={{ fontSize: "0.85rem" }}>No timeline events yet. Events will appear here as the case progresses.</p>
    </div>
  );

  return (
    <>
      <style>{`
        .tl-wrap { position: relative; padding-left: 28px; font-family: 'Inter', sans-serif; }
        .tl-wrap::before { content: ''; position: absolute; left: 11px; top: 0; bottom: 0; width: 2px; background: linear-gradient(180deg, #e0e7ff, #f3f4f6); border-radius: 2px; }
        .tl-item { position: relative; padding-bottom: 22px; }
        .tl-item:last-child { padding-bottom: 0; }
        .tl-dot { position: absolute; left: -22px; top: 4px; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; border: 2px solid white; box-shadow: 0 0 0 2px #e5e7eb; z-index: 1; }
        .tl-content { background: white; border: 1px solid #f3f4f6; border-radius: 12px; padding: 12px 15px; box-shadow: 0 1px 6px rgba(26,39,68,0.04); transition: box-shadow 0.2s; }
        .tl-content:hover { box-shadow: 0 4px 14px rgba(26,39,68,0.08); }
        .tl-message { font-size: 0.85rem; font-weight: 600; color: #1a2744; margin-bottom: 4px; }
        .tl-meta { font-size: 0.72rem; color: #9ca3af; display: flex; gap: 10px; flex-wrap: wrap; }
        .tl-by { color: #6b7280; font-weight: 500; }
      `}</style>

      <div className="tl-wrap">
        {sorted.map((event, i) => {
          const style = EVENT_STYLES[event.type] || EVENT_STYLES.general;
          return (
            <div key={event.id || i} className="tl-item">
              <div className="tl-dot" style={{ background: style.bg, color: style.color }}>
                {style.icon}
              </div>
              <div className="tl-content">
                <p className="tl-message">{event.message}</p>
                <div className="tl-meta">
                  <span>🕐 {new Date(event.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="tl-by">by {event.byName || "System"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
