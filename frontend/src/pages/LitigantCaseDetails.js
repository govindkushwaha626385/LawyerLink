import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import CaseChat from "../components/Case/CaseChat";
import CaseDocuments from "../components/Case/CaseDocuments";
import CaseTimeline from "../components/Case/CaseTimeline";
import ReviewModal from "../components/Reviews/ReviewModal";

const TABS = ["Overview", "Messages", "Documents", "Timeline"];

export default function LitigantCaseDetails() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [lawyerData, setLawyerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [showReview, setShowReview] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const caseRef = doc(db, "cases", id);
        const caseSnap = await getDoc(caseRef);
        if (caseSnap.exists()) {
          const caseInfo = { id: caseSnap.id, ...caseSnap.data() };
          setCaseData(caseInfo);
          if (caseInfo.lawyerId) {
            const lawyerSnap = await getDoc(doc(db, "users", caseInfo.lawyerId));
            if (lawyerSnap.exists()) setLawyerData(lawyerSnap.data());
          }
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  const statusColor = (status) => {
    if (status === "Closed") return { bar: "#dc2626", bg: "#fee2e2", text: "#991b1b" };
    if (status === "In Progress") return { bar: "#d97706", bg: "#fef3c7", text: "#92400e" };
    return { bar: "#16a34a", bg: "#d1fae5", text: "#065f46" };
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="spinner-border" style={{ color: "#1a2744" }} />
      <p className="mt-3" style={{ color: "#6b7280", fontFamily: "Inter,sans-serif" }}>Loading case...</p>
    </div>
  );

  if (!caseData) return (
    <div style={{ textAlign: "center", padding: "60px", fontFamily: "Inter,sans-serif" }}>
      <div style={{ fontSize: "3rem", marginBottom: 12 }}>⚠️</div>
      <h3 style={{ color: "#dc2626" }}>Case not found</h3>
      <button onClick={() => navigate(-1)} style={{ marginTop: 16, background: "#1a2744", color: "white", border: "none", borderRadius: "50px", padding: "10px 24px", cursor: "pointer", fontWeight: 700 }}>Go Back</button>
    </div>
  );

  const col = statusColor(caseData.status);
  const createdAt = caseData.createdAt
    ? new Date(caseData.createdAt.seconds ? caseData.createdAt.seconds * 1000 : caseData.createdAt)
        .toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "N/A";

  return (
    <>
      <style>{`
        .lcd-wrapper { min-height: 100vh; background: linear-gradient(135deg, #f0f4ff 0%, #f8f9fc 50%, #fdf8ee 100%); padding: 32px 20px 60px; font-family: 'Inter', sans-serif; }
        .lcd-back-btn { display: inline-flex; align-items: center; gap: 6px; background: white; border: 1.5px solid #e5e7eb; border-radius: 50px; padding: 8px 18px; font-size: 0.83rem; font-weight: 600; color: #374151; cursor: pointer; transition: all 0.2s ease; margin-bottom: 24px; }
        .lcd-back-btn:hover { background: #1a2744; color: white; border-color: #1a2744; }
        .lcd-hero { background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 24px rgba(26,39,68,0.08); margin-bottom: 20px; border: 1px solid rgba(26,39,68,0.04); }
        .lcd-hero-bar { height: 5px; }
        .lcd-hero-body { padding: 24px 28px; }
        @media(max-width:560px){.lcd-hero-body{padding:18px;}}
        .lcd-title { font-family: 'Playfair Display', serif; font-size: 1.5rem; font-weight: 700; color: #1a2744; margin-bottom: 6px; }
        .lcd-case-id { font-size: 0.83rem; color: #6b7280; margin-bottom: 14px; }
        .lcd-case-id strong { color: #4f46e5; }
        .lcd-status-badge { display: inline-flex; border-radius: 50px; padding: 4px 14px; font-size: 0.78rem; font-weight: 700; margin-bottom: 18px; }
        .lcd-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 32px; }
        @media(max-width:560px){.lcd-info-grid{grid-template-columns:1fr;}}
        .lcd-info-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; font-weight: 600; margin-bottom: 2px; }
        .lcd-info-value { font-size: 0.88rem; font-weight: 600; color: #1a2744; }
        .lcd-hearing { background: linear-gradient(135deg, #eef2ff, #e0e7ff); border-left: 4px solid #1a2744; border-radius: 10px; padding: 13px 16px; font-weight: 700; color: #1a2744; font-size: 0.85rem; margin-top: 16px; }

        /* Review button */
        .lcd-review-btn { background: linear-gradient(135deg, #c9a84c, #e8c96d); color: #1a2744; border: none; border-radius: 50px; padding: 9px 22px; font-size: 0.83rem; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
        .lcd-review-btn:hover { box-shadow: 0 6px 18px rgba(201,168,76,0.4); transform: translateY(-1px); }

        /* Tabs */
        .lcd-tabs { background: white; border-radius: 18px; overflow: hidden; box-shadow: 0 2px 14px rgba(26,39,68,0.06); margin-bottom: 20px; border: 1px solid rgba(26,39,68,0.04); }
        .lcd-tab-header { display: flex; border-bottom: 1px solid #f0f0f0; overflow-x: auto; }
        .lcd-tab-header::-webkit-scrollbar { height: 0; }
        .lcd-tab-btn { flex-shrink: 0; padding: 14px 20px; background: transparent; border: none; font-family: 'Inter', sans-serif; font-size: 0.83rem; font-weight: 600; color: #6b7280; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
        .lcd-tab-btn.active { color: #1a2744; border-bottom-color: #c9a84c; }
        .lcd-tab-btn:hover:not(.active) { color: #1a2744; background: #fafafa; }
        .lcd-tab-body { padding: 24px; }
        .lcd-section-title { font-family: 'Playfair Display', serif; font-size: 1.05rem; font-weight: 700; color: #1a2744; margin-bottom: 14px; }

        /* Lawyer card */
        .lcd-lawyer-card { background: white; border-radius: 20px; padding: 22px 26px; box-shadow: 0 2px 14px rgba(26,39,68,0.07); border: 1px solid rgba(26,39,68,0.04); }
        .lcd-lawyer-hd { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
        .lcd-lawyer-av { width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #1a2744, #243460); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; color: white; flex-shrink: 0; }
        .lcd-lawyer-name { font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700; color: #1a2744; margin: 0; }
        .lcd-lawyer-sub { font-size: 0.75rem; color: #6b7280; margin-top: 2px; }
        .lcd-contact-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
        .lcd-contact-btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 50px; padding: 8px 18px; font-size: 0.78rem; font-weight: 700; cursor: pointer; text-decoration: none; border: 1.5px solid; transition: all 0.2s; }
        .lcd-btn-email { color: #16a34a; border-color: #16a34a; }
        .lcd-btn-email:hover { background: #16a34a; color: white; }
        .lcd-btn-phone { color: #1a2744; border-color: #1a2744; }
        .lcd-btn-phone:hover { background: #1a2744; color: white; }

        /* Notes read-only */
        .hn-note-card { background: #fafafa; border: 1px solid #f0f0f0; border-radius: 14px; padding: 14px 16px; border-left: 3px solid #c9a84c; margin-bottom: 12px; }
        .hn-note-text { font-size: 0.88rem; color: #1a2744; line-height: 1.65; white-space: pre-line; }
        .hn-note-meta { font-size: 0.72rem; color: #9ca3af; margin-top: 8px; }
      `}</style>

      <div className="lcd-wrapper">
        <div className="container" style={{ maxWidth: 820 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <button className="lcd-back-btn" onClick={() => navigate(-1)}>← Dashboard</button>
            {caseData.status === "Closed" && (
              <button className="lcd-review-btn" onClick={() => setShowReview(true)}>⭐ Rate your Lawyer</button>
            )}
          </div>

          {/* Hero */}
          <div className="lcd-hero">
            <div className="lcd-hero-bar" style={{ background: col.bar }} />
            <div className="lcd-hero-body">
              <h1 className="lcd-title">{caseData.title || "Untitled Case"}</h1>
              <p className="lcd-case-id">Case ID: <strong>{caseData.case_id || id}</strong></p>
              <span className="lcd-status-badge" style={{ background: col.bg, color: col.text }}>{caseData.status || "In Progress"}</span>

              <div className="lcd-info-grid">
                <div><p className="lcd-info-label">Category</p><p className="lcd-info-value">{caseData.category || "N/A"}</p></div>
                <div><p className="lcd-info-label">Advocate Number</p><p className="lcd-info-value">{caseData.advocateNumber || "N/A"}</p></div>
                <div><p className="lcd-info-label">Stage</p><p className="lcd-info-value">{caseData.stage || "In Progress"}</p></div>
                <div><p className="lcd-info-label">Linked On</p><p className="lcd-info-value">{createdAt}</p></div>
              </div>

              <div className="lcd-hearing">
                📅 Next Hearing: <strong>{caseData.next_hearing_date || "Not set"}</strong>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="lcd-tabs">
            <div className="lcd-tab-header">
              {TABS.map(tab => (
                <button key={tab} className={`lcd-tab-btn ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}>{tab}</button>
              ))}
            </div>

            <div className="lcd-tab-body">
              {/* ── Overview ── */}
              {activeTab === "Overview" && (
                <>
                  <h3 className="lcd-section-title">📋 Case Description</h3>
                  <p style={{ fontSize: "0.88rem", lineHeight: 1.75, color: "#374151", background: "#fafafa", padding: 14, borderRadius: 12, whiteSpace: "pre-line" }}>
                    {caseData.description || "No description provided."}
                  </p>

                  {/* Hearing Notes (read-only) */}
                  {(caseData.hearingNotes || []).length > 0 && (
                    <>
                      <h3 className="lcd-section-title" style={{ marginTop: 22 }}>📝 Hearing Notes from Lawyer</h3>
                      {[...(caseData.hearingNotes || [])].reverse().map((note, i) => (
                        <div key={note.id || i} className="hn-note-card">
                          <p className="hn-note-text">{note.note}</p>
                          <p className="hn-note-meta">📅 {note.date} · by {note.addedBy}</p>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Lawyer card */}
                  <div className="lcd-lawyer-card" style={{ marginTop: 22 }}>
                    <div className="lcd-lawyer-hd">
                      <div className="lcd-lawyer-av">⚖️</div>
                      <div>
                        <p className="lcd-lawyer-name">{lawyerData?.fullName || "Your Lawyer"}</p>
                        <p className="lcd-lawyer-sub">{lawyerData?.category || "Advocate"} · {lawyerData?.experience || 0} yrs exp</p>
                      </div>
                    </div>
                    <div className="lcd-info-grid">
                      <div><p className="lcd-info-label">Advocate No.</p><p className="lcd-info-value">{caseData.advocateNumber || "N/A"}</p></div>
                      <div><p className="lcd-info-label">Email</p><p className="lcd-info-value">{lawyerData?.email || "N/A"}</p></div>
                    </div>
                    <div className="lcd-contact-row">
                      <a href={`mailto:${lawyerData?.email}`} className="lcd-contact-btn lcd-btn-email">✉️ Email</a>
                      {lawyerData?.phone && <a href={`tel:${lawyerData.phone}`} className="lcd-contact-btn lcd-btn-phone">📞 Call</a>}
                    </div>
                  </div>
                </>
              )}

              {activeTab === "Messages" && (
                <>
                  <h3 className="lcd-section-title">💬 Case Conversation</h3>
                  <CaseChat caseId={id} caseData={caseData} />
                </>
              )}

              {activeTab === "Documents" && (
                <>
                  <h3 className="lcd-section-title">📄 Case Documents</h3>
                  <CaseDocuments caseId={id} isLawyer={false} />
                </>
              )}

              {activeTab === "Timeline" && (
                <>
                  <h3 className="lcd-section-title">🗓️ Case Timeline</h3>
                  <CaseTimeline events={caseData.events || []} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showReview && (
        <ReviewModal
          caseData={caseData}
          lawyerId={caseData.lawyerId}
          onClose={() => setShowReview(false)}
        />
      )}
    </>
  );
}
