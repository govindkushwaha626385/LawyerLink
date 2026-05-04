import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, getDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import AddCaseModal from "./AddCaseModal";
import AnalyticsSection from "./AnalyticsSection";
import MyConsultations from "./MyConsultations";


export default function LawyerDashboard() {
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [advocateNumber, setAdvocateNumber] = useState("");
  const [lawyerName, setLawyerName] = useState("");
  const [registrationDate, setRegistrationDate] = useState("");
  const [pendingConsultations, setPendingConsultations] = useState(0);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchAdvocateNumber = async () => {
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setAdvocateNumber(userSnap.data().advocateNumber || "");
        setLawyerName(userSnap.data().fullName || "Lawyer");
        setRegistrationDate(userSnap.data().registrationDate || "");
      }
    };
    fetchAdvocateNumber();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const q = query(collection(db, "cases"), where("lawyerId", "==", user.uid));
      const snapshot = await getDocs(q);
      const caseList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCases(caseList);
      const uniqueClients = [...new Map(caseList.map((item) => [item.clientEmail, item])).values()];
      setClients(uniqueClients);
    };
    fetchData();
  }, [user]);

  // Track pending consultations count
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "consultations"), where("lawyerId", "==", user.uid), where("status", "==", "pending"));
    const unsub = onSnapshot(q, snap => setPendingConsultations(snap.size), err => console.error(err));
    return () => unsub();
  }, [user]);

  const statusColor = (status) => {
    if (status === "Closed") return { bar: "#dc2626", bg: "#fee2e2", text: "#991b1b" };
    if (status === "In Progress") return { bar: "#d97706", bg: "#fef3c7", text: "#92400e" };
    return { bar: "#16a34a", bg: "#d1fae5", text: "#065f46" };
  };

  const openCount = cases.filter(c => c.status !== "Closed").length;
  const closedCount = cases.filter(c => c.status === "Closed").length;

  return (
    <>
      <style>{`
        .ld-wrapper {
          min-height: 100vh;
          background: linear-gradient(135deg, #f0f4ff 0%, #f8f9fc 50%, #fdf8ee 100%);
          padding: 32px 20px 60px;
          font-family: 'Inter', sans-serif;
        }
        .ld-header {
          display: flex; flex-wrap: wrap;
          justify-content: space-between; align-items: center;
          margin-bottom: 32px; gap: 16px;
        }
        .ld-greeting { font-family: 'Playfair Display', serif; font-size: 1.85rem; font-weight: 700; color: #1a2744; margin: 0; }
        .ld-greeting span { color: #c9a84c; }
        .ld-greeting-sub { font-size: 0.875rem; color: #6b7280; margin-top: 4px; }
        .ld-add-btn {
          background: linear-gradient(135deg, #1a2744, #243460);
          color: white; border: none; border-radius: 50px;
          padding: 11px 26px; font-size: 0.9rem; font-weight: 700;
          cursor: pointer; transition: all 0.25s ease;
          display: flex; align-items: center; gap: 8px;
          box-shadow: 0 4px 16px rgba(26,39,68,0.25);
        }
        .ld-add-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(26,39,68,0.35); }

        /* Stats */
        .ld-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap: 16px; margin-bottom: 36px; }
        .ld-stat-card {
          background: white; border-radius: 16px; padding: 20px 22px;
          box-shadow: 0 2px 12px rgba(26,39,68,0.06); border: 1px solid rgba(26,39,68,0.04);
          transition: all 0.25s ease;
        }
        .ld-stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(26,39,68,0.1); }
        .ld-stat-num { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 700; color: #1a2744; margin: 0; }
        .ld-stat-label { font-size: 0.78rem; color: #6b7280; margin-top: 2px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
        .ld-stat-icon { font-size: 1.4rem; margin-bottom: 8px; }

        /* Section headers */
        .ld-section-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 20px;
        }
        .ld-section-title {
          font-family: 'Playfair Display', serif; font-size: 1.3rem;
          font-weight: 700; color: #1a2744; margin: 0;
          display: flex; align-items: center; gap: 10px;
        }
        .ld-section-count {
          background: #eef2ff; color: #4338ca; border-radius: 50px;
          padding: 2px 12px; font-size: 0.78rem; font-weight: 700;
        }

        /* Case cards */
        .ld-case-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); gap: 20px; }
        .ld-case-card {
          background: white; border-radius: 18px; overflow: hidden;
          box-shadow: 0 2px 12px rgba(26,39,68,0.06); border: 1px solid rgba(26,39,68,0.04);
          cursor: pointer; transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
          position: relative;
        }
        .ld-case-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(26,39,68,0.14); }
        .ld-case-card-bar { height: 4px; width: 100%; }
        .ld-case-card-body { padding: 20px; }
        .ld-case-title { font-family: 'Playfair Display', serif; font-size: 1.05rem; font-weight: 700; color: #1a2744; margin-bottom: 8px; }
        .ld-case-meta { font-size: 0.8rem; color: #6b7280; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
        .ld-status-badge {
          display: inline-flex; align-items: center; gap: 5px;
          border-radius: 50px; padding: 3px 12px;
          font-size: 0.73rem; font-weight: 700; letter-spacing: 0.2px;
        }
        .ld-hearing-box {
          background: linear-gradient(135deg, #eef2ff, #e0e7ff);
          border-left: 3px solid #1a2744; border-radius: 8px;
          padding: 10px 14px; margin-top: 12px;
          font-size: 0.82rem; font-weight: 600; color: #1a2744;
        }
        .ld-ai-badge {
          display: inline-flex; align-items: center; gap: 4px; background: rgba(201,168,76,0.15); color: #b48b2d;
          border-radius: 50px; padding: 3px 12px; font-size: 0.73rem; font-weight: 800; border: 1px solid rgba(201,168,76,0.3); margin-top: 8px;
        }

        /* Client cards */
        .ld-client-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px,1fr)); gap: 16px; }
        .ld-client-card {
          background: white; border-radius: 16px; padding: 18px 20px;
          box-shadow: 0 2px 10px rgba(26,39,68,0.06); border: 1px solid rgba(26,39,68,0.04);
          transition: all 0.25s ease;
        }
        .ld-client-card:hover { transform: translateY(-3px); box-shadow: 0 8px 22px rgba(26,39,68,0.1); }
        .ld-client-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          background: linear-gradient(135deg, #eef2ff, #c7d2fe);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem; margin-bottom: 10px;
          border: 2px solid #e0e7ff;
        }
        .ld-client-name { font-weight: 700; color: #1a2744; font-size: 0.95rem; margin-bottom: 2px; }
        .ld-client-email { font-size: 0.78rem; color: #6b7280; margin-bottom: 12px; }
        .ld-contact-btn {
          display: inline-flex; align-items: center; gap: 5px;
          border-radius: 50px; padding: 5px 14px; font-size: 0.78rem;
          font-weight: 600; cursor: pointer; transition: all 0.2s ease;
          text-decoration: none; margin-right: 8px; border: 1.5px solid;
        }
        .ld-contact-btn-email { color: #16a34a; border-color: #16a34a; background: transparent; }
        .ld-contact-btn-email:hover { background: #16a34a; color: white; }
        .ld-contact-btn-call { color: #1a2744; border-color: #1a2744; background: transparent; }
        .ld-contact-btn-call:hover { background: #1a2744; color: white; }

        /* Empty state */
        .ld-empty { text-align: center; padding: 48px 20px; color: #9ca3af; }
        .ld-empty-icon { font-size: 3rem; margin-bottom: 12px; }
        .ld-empty p { font-size: 0.95rem; margin: 0; }

        /* Section card */
        .ld-section { background: white; border-radius: 20px; padding: 28px; margin-bottom: 28px; box-shadow: 0 2px 16px rgba(26,39,68,0.06); border: 1px solid rgba(26,39,68,0.04); }

        @media (max-width: 600px) {
          .ld-greeting { font-size: 1.4rem; }
          .ld-stats { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="ld-wrapper">
        <div className="container-lg">
          {/* ── Header ── */}
          <div className="ld-header">
            <div>
              <h2 className="ld-greeting">⚖️ Welcome back, <span>{lawyerName.split(" ")[0]}</span></h2>
              <p className="ld-greeting-sub">Manage your cases and clients from your dashboard.</p>
              {advocateNumber && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                  <span style={{
                    fontSize: "0.73rem", fontWeight: 700, background: "#eef2ff",
                    color: "#3730a3", borderRadius: 50, padding: "3px 12px",
                    display: "inline-flex", alignItems: "center", gap: 4
                  }}>
                    🪪 {advocateNumber}
                  </span>
                  {registrationDate && (
                    <span style={{
                      fontSize: "0.73rem", fontWeight: 700, background: "#dcfce7",
                      color: "#166534", borderRadius: 50, padding: "3px 12px",
                      display: "inline-flex", alignItems: "center", gap: 4
                    }}>
                      ✅ Registered: {new Date(registrationDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button className="ld-add-btn" onClick={() => setShowModal(true)}>
              ＋ Add New Case
            </button>
          </div>

          {/* ── Stats ── */}
          <div className="ld-stats">
            <div className="ld-stat-card">
              <div className="ld-stat-icon">📁</div>
              <p className="ld-stat-num">{cases.length}</p>
              <p className="ld-stat-label">Total Cases</p>
            </div>
            <div className="ld-stat-card">
              <div className="ld-stat-icon">⚡</div>
              <p className="ld-stat-num">{openCount}</p>
              <p className="ld-stat-label">Active Cases</p>
            </div>
            <div className="ld-stat-card">
              <div className="ld-stat-icon">✅</div>
              <p className="ld-stat-num">{closedCount}</p>
              <p className="ld-stat-label">Closed Cases</p>
            </div>
            <div className="ld-stat-card">
              <div className="ld-stat-icon">👥</div>
              <p className="ld-stat-num">{clients.length}</p>
              <p className="ld-stat-label">Total Clients</p>
            </div>
          </div>

          {/* ── AI Legal Suite Banner ── */}
          <div style={{
            background: "linear-gradient(-45deg,#0f1d3a,#1a2744,#243460)",
            borderRadius: 20, padding: "22px 28px", marginBottom: 28,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 14, boxShadow: "0 8px 28px rgba(26,39,68,0.2)"
          }}>
            <div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", fontWeight: 700, color: "white", margin: "0 0 4px" }}>
                🤖 LawyerLink AI Suite
              </p>
              <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", margin: 0 }}>
                Analyze documents, draft responses, and ask legal questions instantly.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => navigate("/document-analyzer")} style={{ background: "linear-gradient(135deg,#c9a84c,#e8c96d)", color: "#1a2744", border: "none", borderRadius: 50, padding: "8px 18px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                📄 Doc Analyzer
              </button>
              <button onClick={() => navigate("/chatbot")} style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 50, padding: "8px 18px", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                💬 AI Chatbot
              </button>
            </div>
          </div>

          {/* ── Cases ── */}
          <div className="ld-section">
            <div className="ld-section-header">
              <h3 className="ld-section-title">
                📁 My Cases
                <span className="ld-section-count">{cases.length}</span>
              </h3>
            </div>

            {cases.length === 0 ? (
              <div className="ld-empty">
                <div className="ld-empty-icon">📂</div>
                <p>No cases yet. Click "Add New Case" to get started.</p>
              </div>
            ) : (
              <div className="ld-case-grid">
                {cases.map((c) => {
                  const col = statusColor(c.status);
                  return (
                    <div key={c.id} className="ld-case-card" onClick={() => navigate(`/case/${c.id}`)}>
                      <div className="ld-case-card-bar" style={{ background: col.bar }} />
                      <div className="ld-case-card-body">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h4 className="ld-case-title">{c.title}</h4>
                          <span className="ld-status-badge" style={{ background: col.bg, color: col.text }}>{c.status}</span>
                        </div>
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
                        <p className="ld-case-meta">👤 {c.clientName}</p>
                        <p className="ld-case-meta">🏷️ {c.category || "General"}</p>
                        {c.courtName && <p className="ld-case-meta">🏛️ {c.courtName}</p>}
                        {c.opposingParty && <p className="ld-case-meta">⚔️ vs {c.opposingParty}</p>}
                        <p className="ld-case-meta">🧾 Case ID: <strong>{c.case_id}</strong></p>
                        {/* {c.aiPrediction && (

                        )} */}
                        <div className="ld-hearing-box">
                          📅 Next Hearing: <strong>{c.next_hearing_date || "Not set"}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Clients ── */}
          <div className="ld-section">
            <div className="ld-section-header">
              <h3 className="ld-section-title">
                👥 My Clients
                <span className="ld-section-count">{clients.length}</span>
              </h3>
            </div>

            {clients.length === 0 ? (
              <div className="ld-empty">
                <div className="ld-empty-icon">👤</div>
                <p>No clients linked yet.</p>
              </div>
            ) : (
              <div className="ld-client-grid">
                {clients.map((client, i) => (
                  <div key={i} className="ld-client-card">
                    <div className="ld-client-avatar">👤</div>
                    <p className="ld-client-name">{client.clientName}</p>
                    <p className="ld-client-email">{client.clientEmail}</p>
                    <div>
                      <a href={`mailto:${client.clientEmail}`} className="ld-contact-btn ld-contact-btn-email">✉️ Email</a>
                      {client.clientPhone && (
                        <a href={`tel:${client.clientPhone}`} className="ld-contact-btn ld-contact-btn-call">📞 Call</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Consultations ── */}
          <div className="ld-section">
            <div className="ld-section-header">
              <h3 className="ld-section-title">
                📅 Consultations
                {pendingConsultations > 0 && (
                  <span style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 50, padding: "2px 12px", fontSize: ".75rem", fontWeight: 700 }}>
                    {pendingConsultations} pending
                  </span>
                )}
              </h3>
            </div>
            <MyConsultations />
          </div>

          {/* ── Analytics ── */}
          {cases.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <AnalyticsSection cases={cases} />
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <AddCaseModal advocateNumber={advocateNumber} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
