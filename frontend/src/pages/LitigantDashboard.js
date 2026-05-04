import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";

export default function LitigantDashboard() {
  const [user] = useAuthState(auth);
  const [cases, setCases] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsId, setSelectedConsId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const activeCons = consultations.find(c => c.id === selectedConsId);

  const sendLitigantReply = async () => {
    if (!replyText.trim() || !activeCons) return;
    setSending(true);
    try {
      const newMessage = { sender: "litigant", text: replyText, timestamp: new Date().toISOString() };
      const currentMessages = activeCons.messages || [];
      // Legacy initialization
      if (!activeCons.messages && activeCons.replyMessage) {
        currentMessages.push({ sender: "lawyer", text: activeCons.replyMessage, timestamp: activeCons.repliedAt || new Date().toISOString() });
      }
      const updatedMessages = [...currentMessages, newMessage];

      await updateDoc(doc(db, "consultations", activeCons.id), {
        messages: updatedMessages
      });
      setReplyText("");
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

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

  // Fetch Consultations
  useEffect(() => {
    if (!user?.email) return;
    const q = query(collection(db, "consultations"), where("litigantEmail", "==", user.email.trim().toLowerCase()));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setConsultations(list);
    });
    return () => unsub();
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

          {/* ── Consultations ── */}
          {consultations.length > 0 && (
            <div className="lit-section" style={{ marginBottom: 24 }}>
              <div className="lit-section-header" style={{ marginBottom: 16 }}>
                <h3 className="lit-section-title">🤝 My Consultations</h3>
              </div>
              <div style={{ display: "grid", gap: 14, gridTemplateColumns: activeCons ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))" }}>
                {/* Active Chat Panel */}
                {activeCons ? (
                  <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #e5e7eb", padding: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                      <div>
                        <h4 style={{ margin: "0 0 4px", color: "#1a2744", fontWeight: 700 }}>Chat with {activeCons.lawyerName}</h4>
                        <p style={{ margin: 0, fontSize: "0.8rem", color: "#6b7280" }}>Regarding: {activeCons.caseType || "Legal Consultation"}</p>
                      </div>
                      <button onClick={() => setSelectedConsId(null)} style={{ background: "#f3f4f6", border: "none", borderRadius: 50, padding: "4px 14px", fontSize: "0.8rem", fontWeight: 600, color: "#374151", cursor: "pointer" }}>✕ Close</button>
                    </div>

                    <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "20px", height: "340px", overflowY: "auto", marginBottom: 16, display: "flex", flexDirection: "column", gap: 14, boxShadow: "inset 0 2px 10px rgba(0,0,0,0.02)" }}>
                      <div style={{ alignSelf: "flex-end", background: "#1a2744", color: "white", borderRadius: "18px 18px 4px 18px", padding: "12px 16px", maxWidth: "75%", boxShadow: "0 2px 8px rgba(26,39,68,0.15)" }}>
                        <p style={{ fontSize: "0.7rem", color: "#9ca3af", fontWeight: 600, margin: "0 0 4px", letterSpacing: "0.5px" }}>You (Initial Request)</p>
                        <p style={{ fontSize: "0.9rem", margin: 0, lineHeight: 1.5 }}>{activeCons.message}</p>
                      </div>

                      {!activeCons.messages && activeCons.replyMessage && (
                        <div style={{ alignSelf: "flex-start", background: "#f1f5f9", color: "#1e293b", borderRadius: "18px 18px 18px 4px", padding: "12px 16px", maxWidth: "75%", border: "1px solid #e2e8f0" }}>
                          <p style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600, margin: "0 0 4px", letterSpacing: "0.5px" }}>{activeCons.lawyerName}</p>
                          <p style={{ fontSize: "0.9rem", margin: 0, lineHeight: 1.5 }}>{activeCons.replyMessage}</p>
                        </div>
                      )}

                      {activeCons.messages?.map((msg, idx) => {
                        const isMe = msg.sender === "litigant";
                        return (
                          <div key={idx} style={{
                            alignSelf: isMe ? "flex-end" : "flex-start",
                            background: isMe ? "#1a2744" : "#f1f5f9",
                            color: isMe ? "white" : "#1e293b",
                            border: isMe ? "none" : "1px solid #e2e8f0",
                            borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                            padding: "12px 16px", maxWidth: "75%",
                            boxShadow: isMe ? "0 2px 8px rgba(26,39,68,0.15)" : "none"
                          }}>
                            <p style={{ fontSize: "0.7rem", color: isMe ? "#9ca3af" : "#64748b", fontWeight: 600, margin: "0 0 4px", letterSpacing: "0.5px" }}>{isMe ? "You" : activeCons.lawyerName}</p>
                            <p style={{ fontSize: "0.9rem", margin: 0, lineHeight: 1.5 }}>{msg.text}</p>
                          </div>
                        )
                      })}
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                      <input
                        type="text"
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Type a message to your lawyer..."
                        onKeyDown={e => e.key === "Enter" && sendLitigantReply()}
                        style={{ flexGrow: 1, border: "1.5px solid #e5e7eb", borderRadius: 50, padding: "10px 18px", fontSize: "0.85rem", outline: "none" }}
                      />
                      <button onClick={sendLitigantReply} disabled={sending || !replyText.trim()} style={{ background: "#1a2744", color: "white", border: "none", borderRadius: 50, padding: "10px 24px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}>
                        {sending ? "..." : "Send"}
                      </button>
                    </div>
                  </div>
                ) : (
                  consultations.map(c => (
                    <div key={c.id} style={{ padding: "18px 20px", borderRadius: 14, border: "1px solid rgba(26,39,68,0.06)", background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", cursor: "pointer", transition: "all 0.2s" }} onClick={() => setSelectedConsId(c.id)} onMouseOver={e => e.currentTarget.style.borderColor = "#c9a84c"} onMouseOut={e => e.currentTarget.style.borderColor = "rgba(26,39,68,0.06)"}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <p style={{ margin: "0 0 2px", fontWeight: 700, color: "#1a2744", fontSize: "0.95rem" }}>{c.lawyerName}</p>
                          <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280" }}>{c.caseType || "Legal Consultation"}</p>
                        </div>
                        <span style={{
                          background: c.status === "accepted" ? "#dcfce7" : c.status === "declined" ? "#fee2e2" : "#fef3c7",
                          color: c.status === "accepted" ? "#16a34a" : c.status === "declined" ? "#dc2626" : "#d97706",
                          padding: "4px 12px", borderRadius: 50, fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase"
                        }}>
                          {c.status}
                        </span>
                      </div>
                      <div style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 14px", marginTop: 12 }}>
                        <p style={{ margin: "0 0 4px", fontSize: "0.8rem", color: "#374151" }}>📅 <strong>{c.preferredDate}</strong> at <strong>{c.preferredTime}</strong></p>
                        <p style={{ margin: 0, fontSize: "0.75rem", color: "#4338ca", fontWeight: 600 }}>💬 Click to open chat thread</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Cases section */}
          <div className="lit-section">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
              <h3 className="lit-section-title">My Cases</h3>
              <span className="lit-count-badge">{cases.length}</span>
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
                        {/* Priority + Stage row */}
                        {(c.priority || c.stage) && (
                          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                            {c.priority && (
                              <span style={{
                                fontSize: "0.68rem", fontWeight: 700, borderRadius: 50, padding: "2px 9px",
                                background: c.priority === "Urgent" ? "#fee2e2" : c.priority === "High" ? "#fef3c7" : c.priority === "Medium" ? "#fefce8" : "#dcfce7",
                                color: c.priority === "Urgent" ? "#991b1b" : c.priority === "High" ? "#92400e" : c.priority === "Medium" ? "#854d0e" : "#166534"
                              }}>
                                {c.priority === "Urgent" ? "🔴" : c.priority === "High" ? "🟠" : c.priority === "Medium" ? "🟡" : "🟢"} {c.priority}
                              </span>
                            )}
                            {c.stage && (
                              <span style={{ fontSize: "0.68rem", fontWeight: 600, borderRadius: 50, padding: "2px 9px", background: "#eef2ff", color: "#3730a3" }}>
                                {c.stage}
                              </span>
                            )}
                          </div>
                        )}
                        <p className="lit-info-row">🧾 Case ID: <strong>{c.case_id}</strong></p>
                        <p className="lit-info-row">🏷️ {c.category || "Not specified"}</p>
                        {c.courtName && <p className="lit-info-row">🏛️ {c.courtName}</p>}
                        {c.opposingParty && <p className="lit-info-row">⚔️ vs {c.opposingParty}</p>}
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
