import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";

export default function LitigantDashboard() {
  const [user] = useAuthState(auth);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCases = async () => {
      if (!user?.email) return;
      try {
        const q = query(
          collection(db, "cases"),
          where("clientEmail", "==", user.email.trim().toLowerCase())
        );
        const querySnapshot = await getDocs(q);
        const caseList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setCases(caseList);
      } catch (error) {
        console.error("Error fetching cases:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, [user]);

  const statusColor = (status) => {
    if (status === "Closed") return { bar: "#dc2626", bg: "#fee2e2", text: "#991b1b" };
    if (status === "In Progress") return { bar: "#d97706", bg: "#fef3c7", text: "#92400e" };
    return { bar: "#16a34a", bg: "#d1fae5", text: "#065f46" };
  };

  if (!user || loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="spinner-border" style={{ color: "#1a2744" }} role="status" />
      <p className="mt-3" style={{ color: "#6b7280", fontFamily: "Inter,sans-serif" }}>Loading your cases...</p>
    </div>
  );

  const openCount = cases.filter(c => c.status !== "Closed").length;
  const closedCount = cases.filter(c => c.status === "Closed").length;
  const firstName = user.email.split("@")[0];

  return (
    <>
      <style>{`
        .lit-wrapper {
          min-height: 100vh;
          background: linear-gradient(135deg, #f0f4ff 0%, #f8f9fc 50%, #fdf8ee 100%);
          padding: 32px 20px 60px;
          font-family: 'Inter', sans-serif;
        }
        .lit-header { margin-bottom: 28px; }
        .lit-greeting { font-family: 'Playfair Display', serif; font-size: 1.75rem; font-weight: 700; color: #1a2744; margin: 0; }
        .lit-greeting span { color: #c9a84c; }
        .lit-sub { font-size: 0.875rem; color: #6b7280; margin-top: 6px; }

        /* Stats */
        .lit-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
        @media (max-width: 520px) { .lit-stats { grid-template-columns: 1fr; } }
        .lit-stat {
          background: white; border-radius: 16px; padding: 20px 22px;
          box-shadow: 0 2px 12px rgba(26,39,68,0.06); border: 1px solid rgba(26,39,68,0.04);
          transition: all 0.25s ease;
        }
        .lit-stat:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(26,39,68,0.1); }
        .lit-stat-icon { font-size: 1.4rem; margin-bottom: 8px; }
        .lit-stat-num { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 700; color: #1a2744; margin: 0; }
        .lit-stat-label { font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-top: 2px; }

        /* Section */
        .lit-section { background: white; border-radius: 20px; padding: 28px 30px; box-shadow: 0 2px 16px rgba(26,39,68,0.06); border: 1px solid rgba(26,39,68,0.04); }
        .lit-section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 22px; }
        .lit-section-title { font-family: 'Playfair Display', serif; font-size: 1.25rem; font-weight: 700; color: #1a2744; margin: 0; }
        .lit-count-badge { background: #eef2ff; color: #4338ca; border-radius: 50px; padding: 2px 12px; font-size: 0.75rem; font-weight: 700; }

        /* Case cards */
        .lit-case-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .lit-case-card {
          border-radius: 18px; overflow: hidden; background: white;
          box-shadow: 0 2px 12px rgba(26,39,68,0.06); border: 1px solid rgba(26,39,68,0.04);
          cursor: pointer; transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        .lit-case-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(26,39,68,0.13); }
        .lit-case-bar { height: 4px; }
        .lit-case-body { padding: 20px; }
        .lit-case-title { font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700; color: #1a2744; margin-bottom: 10px; }
        .lit-info-row { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #6b7280; margin-bottom: 4px; }
        .lit-status-badge { display: inline-flex; align-items: center; border-radius: 50px; padding: 3px 12px; font-size: 0.73rem; font-weight: 700; margin-top: 8px; }
        .lit-hearing-box {
          background: linear-gradient(135deg, #eef2ff, #e0e7ff);
          border-left: 3px solid #1a2744; border-radius: 8px;
          padding: 10px 14px; margin-top: 12px;
          font-size: 0.82rem; font-weight: 600; color: #1a2744;
        }
        .lit-view-btn {
          display: block; width: 100%; text-align: center;
          background: #1a2744; color: white; border: none; border-radius: 50px;
          padding: 10px; font-size: 0.83rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s ease; margin-top: 14px;
        }
        .lit-view-btn:hover { background: #111b33; box-shadow: 0 4px 14px rgba(26,39,68,0.25); }

        /* Empty */
        .lit-empty { text-align: center; padding: 56px 20px; color: #9ca3af; }
        .lit-empty-icon { font-size: 3.5rem; margin-bottom: 14px; }
        .lit-empty h4 { font-family: 'Playfair Display', serif; color: #374151; font-size: 1.2rem; margin-bottom: 8px; }
        .lit-empty p { font-size: 0.85rem; }
      `}</style>

      <div className="lit-wrapper">
        <div className="container-lg">

          {/* Header */}
          <div className="lit-header">
            <h2 className="lit-greeting">📜 Hello, <span>{firstName}</span></h2>
            <p className="lit-sub">Here are all the cases linked to your account.</p>
          </div>

          {/* Stats */}
          <div className="lit-stats">
            <div className="lit-stat">
              <div className="lit-stat-icon">📁</div>
              <p className="lit-stat-num">{cases.length}</p>
              <p className="lit-stat-label">Total Cases</p>
            </div>
            <div className="lit-stat">
              <div className="lit-stat-icon">⚡</div>
              <p className="lit-stat-num">{openCount}</p>
              <p className="lit-stat-label">Active Cases</p>
            </div>
            <div className="lit-stat">
              <div className="lit-stat-icon">✅</div>
              <p className="lit-stat-num">{closedCount}</p>
              <p className="lit-stat-label">Closed Cases</p>
            </div>
          </div>

          {/* ── AI Smart Match Banner ── */}
          <div style={{
            background: "linear-gradient(-45deg,#0f1d3a,#1a2744,#243460)",
            borderRadius: 20, padding: "22px 28px", marginBottom: 24,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 14, boxShadow: "0 8px 28px rgba(26,39,68,0.2)"
          }}>
            <div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", fontWeight: 700, color: "white", margin: "0 0 4px" }}>
                🤖 Find Your Perfect Lawyer with AI
              </p>
              <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", margin: 0 }}>
                Describe your legal problem — our AI matches you with the best lawyers instantly.
              </p>
            </div>
            <button
              onClick={() => navigate("/smart-match")}
              style={{
                background: "linear-gradient(135deg,#c9a84c,#e8c96d)", color: "#1a2744",
                border: "none", borderRadius: 50, padding: "10px 24px",
                fontFamily: "'Inter',sans-serif", fontSize: "0.85rem", fontWeight: 700,
                cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s",
                boxShadow: "0 4px 14px rgba(201,168,76,0.35)"
              }}>
              🔍 Match Me Now
            </button>
          </div>

          {/* Cases section */}
          <div className="lit-section">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, flexWrap: "wrap", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h3 className="lit-section-title">My Cases</h3>
                <span className="lit-count-badge">{cases.length}</span>
              </div>
              <button
                onClick={() => navigate("/link-case")}
                style={{
                  background: "transparent", border: "1.5px solid #1a2744", borderRadius: 50,
                  padding: "7px 18px", fontFamily: "'Inter',sans-serif", fontSize: "0.78rem",
                  fontWeight: 700, color: "#1a2744", cursor: "pointer", transition: "all 0.2s"
                }}>
                🔗 Link a Case
              </button>
            </div>

            {cases.length === 0 ? (
              <div className="lit-empty">
                <div className="lit-empty-icon">📂</div>
                <h4>No cases yet</h4>
                <p>Your lawyer will add cases linked to your email. They will appear here.</p>
              </div>
            ) : (
              <div className="lit-case-grid">
                {cases.map((c) => {
                  const col = statusColor(c.status);
                  return (
                    <div key={c.id} className="lit-case-card" onClick={() => navigate(`/litigant/case/${c.id}`)}>
                      <div className="lit-case-bar" style={{ background: col.bar }} />
                      <div className="lit-case-body">
                        <h4 className="lit-case-title">{c.title || "Untitled Case"}</h4>
                        <p className="lit-info-row">🧾 Case ID: <strong>{c.case_id}</strong></p>
                        <p className="lit-info-row">🏷️ {c.category || "Not specified"}</p>
                        <p className="lit-info-row">🪪 Advocate No: {c.advocateNumber || "N/A"}</p>
                        <span className="lit-status-badge" style={{ background: col.bg, color: col.text }}>
                          {c.status || "In Progress"}
                        </span>
                        <div className="lit-hearing-box">
                          📅 Next Hearing: <strong>{c.next_hearing_date || "Not set"}</strong>
                        </div>
                        <button className="lit-view-btn">View Case Details →</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
