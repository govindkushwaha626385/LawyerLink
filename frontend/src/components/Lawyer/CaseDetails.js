// ✅ src/components/Lawyer/CaseDetails.js — full tabbed interface
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db, auth } from "../../firebase";
import axios from "axios";
import CaseChat from "../Case/CaseChat";
import CaseDocuments from "../Case/CaseDocuments";
import CaseTimeline from "../Case/CaseTimeline";
import { addCaseEvent } from "../../utils/caseEvents";
import { createNotification } from "../../utils/notifications";

const TABS = ["Overview", "Messages", "Documents", "Timeline", "Hearing Notes"];

export default function CaseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [recommendedCases, setRecommendedCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(false);
  const location = useLocation();
  const [isEditing, setIsEditing] = useState(location.state?.editMode || false);
  const [updatedData, setUpdatedData] = useState({});
  const [selectedJudgment, setSelectedJudgment] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [lawyerData, setLawyerData] = useState(null);
  const user = auth.currentUser;

  // Compute today's date in YYYY-MM-DD format for input limits
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const docRef = doc(db, "cases", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          setCaseData(data);
          setUpdatedData(data);
          fetchRecommendedCases(data.description);
          // fetch lawyer data for notifications
          if (data.lawyerId) {
            const lSnap = await getDoc(doc(db, "users", data.lawyerId));
            if (lSnap.exists()) setLawyerData(lSnap.data());
          }
        }
      } catch (error) {
        console.error("Error fetching case:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
  }, [id]);

  const fetchRecommendedCases = async (text) => {
    setRecLoading(true);
    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000"}/recommend/`, { text, top_k: 5 });
      setRecommendedCases(response.data.results || []);
    } catch (error) {
      console.error("Error fetching recommended cases:", error);
    } finally {
      setRecLoading(false);
    }
  };

  const handleChange = (e) => setUpdatedData({ ...updatedData, [e.target.name]: e.target.value });

  const handleUpdate = async () => {
    try {
      const caseRef = doc(db, "cases", id);
      const oldStatus = caseData.status;
      await updateDoc(caseRef, { ...updatedData, lastUpdated: new Date().toISOString() });
      // Log timeline event for status change
      if (updatedData.status !== oldStatus) {
        await addCaseEvent(id, "status_change",
          `Status changed from "${oldStatus}" to "${updatedData.status}"`,
          lawyerData?.fullName || "Lawyer");
        // Notify litigant
        if (caseData.litigantId) {
          await createNotification(caseData.litigantId,
            "Case Status Updated",
            `Your case "${caseData.title}" status changed to ${updatedData.status}`,
            "case_update", id);
        }
      }
      setCaseData({ ...caseData, ...updatedData });
      setIsEditing(false);
      alert("✅ Case updated successfully!");
    } catch (error) {
      alert("❌ Failed to update case.");
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;
    setAddingNote(true);
    try {
      const note = {
        note: newNote.trim(),
        date: new Date().toLocaleDateString("en-IN"),
        addedBy: lawyerData?.fullName || user.email,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).slice(2, 9),
      };
      await updateDoc(doc(db, "cases", id), { hearingNotes: arrayUnion(note) });
      await addCaseEvent(id, "note", `📝 Hearing note added`, lawyerData?.fullName || "Lawyer");
      // Notify litigant
      if (caseData?.litigantId) {
        await createNotification(caseData.litigantId, "New Hearing Note",
          `Your lawyer added a note to case "${caseData.title}"`, "case_update", id);
      }
      setCaseData(prev => ({ ...prev, hearingNotes: [...(prev.hearingNotes || []), note] }));
      setNewNote("");
    } catch (err) {
      console.error("Note error:", err);
    } finally {
      setAddingNote(false);
    }
  };

  const statusColor = (status) => {
    if (status === "Closed") return { bar: "#dc2626", bg: "#fee2e2", text: "#991b1b" };
    if (status === "In Progress") return { bar: "#d97706", bg: "#fef3c7", text: "#92400e" };
    return { bar: "#16a34a", bg: "#d1fae5", text: "#065f46" };
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="spinner-border" style={{ color: "#1a2744" }} role="status" />
      <p className="mt-3" style={{ color: "#6b7280", fontFamily: "Inter,sans-serif" }}>Loading case...</p>
    </div>
  );

  if (!caseData) return (
    <div className="text-center mt-5 text-danger fw-semibold">Case not found.</div>
  );

  const isLawyerOwner = user && user.uid === caseData.lawyerId;
  const col = statusColor(caseData.status);

  return (
    <>
      <style>{`
        .cd-wrapper { min-height: 100vh; background: linear-gradient(135deg, #f0f4ff 0%, #f8f9fc 50%, #fdf8ee 100%); padding: 32px 20px 60px; font-family: 'Inter', sans-serif; }
        .cd-back-btn { display: inline-flex; align-items: center; gap: 6px; background: white; border: 1.5px solid #e5e7eb; border-radius: 50px; padding: 8px 18px; font-size: 0.83rem; font-weight: 600; color: #374151; cursor: pointer; transition: all 0.2s ease; margin-bottom: 24px; }
        .cd-back-btn:hover { background: #1a2744; color: white; border-color: #1a2744; }
        .cd-hero { background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 24px rgba(26,39,68,0.08); margin-bottom: 20px; border: 1px solid rgba(26,39,68,0.04); }
        .cd-hero-bar { height: 5px; }
        .cd-hero-body { padding: 24px 28px; }
        .cd-title { font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 700; color: #1a2744; margin-bottom: 4px; }
        .cd-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 32px; margin: 18px 0; }
        @media (max-width: 600px) { .cd-info-grid { grid-template-columns: 1fr; } .cd-hero-body { padding: 18px; } }
        .cd-priority-badge { display: inline-flex; align-items: center; gap: 5px; border-radius: 50px; padding: 3px 12px; font-size: 0.73rem; font-weight: 700; }
        .cd-info-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; font-weight: 600; margin-bottom: 2px; }
        .cd-info-value { font-size: 0.88rem; font-weight: 600; color: #1a2744; }
        .cd-status-badge { display: inline-flex; border-radius: 50px; padding: 4px 14px; font-size: 0.78rem; font-weight: 700; }
        .cd-hearing { background: linear-gradient(135deg, #eef2ff, #e0e7ff); border-left: 4px solid #1a2744; border-radius: 10px; padding: 13px 16px; font-weight: 700; color: #1a2744; font-size: 0.85rem; margin-top: 14px; }
        .cd-edit-btn { background: transparent; border: 1.5px solid #1a2744; border-radius: 50px; padding: 7px 18px; font-size: 0.83rem; font-weight: 600; color: #1a2744; cursor: pointer; transition: all 0.2s ease; }
        .cd-edit-btn:hover { background: #1a2744; color: white; }
        .cd-edit-input { width: 100%; border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 9px 13px; font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #1a2744; outline: none; transition: all 0.25s ease; background: #fafafa; }
        .cd-edit-input:focus { border-color: #1a2744; background: white; box-shadow: 0 0 0 3px rgba(26,39,68,0.06); }
        .cd-action-row { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
        .cd-btn-cancel { background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 50px; padding: 9px 22px; font-size: 0.85rem; font-weight: 600; color: #374151; cursor: pointer; }
        .cd-btn-cancel:hover { background: #f3f4f6; }
        .cd-btn-save { background: linear-gradient(135deg, #16a34a, #22c55e); border: none; border-radius: 50px; padding: 9px 24px; font-size: 0.85rem; font-weight: 700; color: white; cursor: pointer; transition: all 0.2s; }
        .cd-btn-save:hover { box-shadow: 0 6px 18px rgba(22,163,74,0.35); transform: translateY(-1px); }

        /* Tabs */
        .cd-tabs { background: white; border-radius: 18px; overflow: hidden; box-shadow: 0 2px 14px rgba(26,39,68,0.06); margin-bottom: 20px; border: 1px solid rgba(26,39,68,0.04); }
        .cd-tab-header { display: flex; border-bottom: 1px solid #f0f0f0; overflow-x: auto; }
        .cd-tab-header::-webkit-scrollbar { height: 0; }
        .cd-tab-btn { flex-shrink: 0; padding: 14px 20px; background: transparent; border: none; font-family: 'Inter', sans-serif; font-size: 0.83rem; font-weight: 600; color: #6b7280; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
        .cd-tab-btn.active { color: #1a2744; border-bottom-color: #c9a84c; }
        .cd-tab-btn:hover:not(.active) { color: #1a2744; background: #fafafa; }
        .cd-tab-body { padding: 24px; }
        .cd-section-title { font-family: 'Playfair Display', serif; font-size: 1.05rem; font-weight: 700; color: #1a2744; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }

        /* AI Section */
        .cd-ai-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px,1fr)); gap: 18px; }
        .cd-rec-card { background: #fafafa; border-radius: 14px; padding: 18px; border: 1px solid #f0f0f0; transition: all 0.25s ease; display: flex; flex-direction: column; }
        .cd-rec-card:hover { background: white; box-shadow: 0 8px 28px rgba(26,39,68,0.1); transform: translateY(-4px); }
        .cd-rec-case-id { font-family: 'Playfair Display', serif; font-size: 0.95rem; font-weight: 700; color: #1a2744; margin-bottom: 6px; }
        .cd-rec-score { display: inline-flex; align-items: center; gap: 5px; background: #eef2ff; color: #4338ca; border-radius: 50px; padding: 2px 10px; font-size: 0.72rem; font-weight: 700; margin-bottom: 12px; }
        .cd-rec-summary { font-size: 0.8rem; line-height: 1.6; color: #4b5563; background: white; border-radius: 10px; padding: 10px; border: 1px solid #f0f0f0; max-height: 160px; overflow-y: auto; flex-grow: 1; margin-bottom: 12px; white-space: pre-line; }
        .cd-rec-btn { display: flex; align-items: center; justify-content: center; gap: 6px; border: 1.5px solid #1a2744; border-radius: 50px; padding: 7px 14px; font-size: 0.78rem; font-weight: 700; color: #1a2744; background: transparent; cursor: pointer; transition: all 0.2s; width: 100%; }
        .cd-rec-btn:hover { background: #1a2744; color: white; }

        /* Judgment Modal */
        .cd-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px); }
        .cd-modal { background: white; border-radius: 20px; max-width: 820px; width: 100%; max-height: 88vh; display: flex; flex-direction: column; box-shadow: 0 24px 80px rgba(0,0,0,0.35); }
        .cd-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 22px 28px; border-bottom: 1px solid #f0f0f0; }
        .cd-modal-title { font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 700; color: #1a2744; margin: 0; }
        .cd-modal-close { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 50px; padding: 6px 16px; font-size: 0.83rem; font-weight: 600; color: #374151; cursor: pointer; transition: all 0.2s; }
        .cd-modal-close:hover { background: #1a2744; color: white; border-color: #1a2744; }
        .cd-modal-body { overflow-y: auto; padding: 28px; font-size: 0.9rem; line-height: 1.85; color: #374151; white-space: pre-line; }

        /* Hearing Notes */
        .hn-wrap { display: flex; flex-direction: column; gap: 14px; }
        .hn-note-card { background: #fafafa; border: 1px solid #f0f0f0; border-radius: 14px; padding: 14px 16px; border-left: 3px solid #c9a84c; }
        .hn-note-text { font-size: 0.88rem; color: #1a2744; line-height: 1.65; white-space: pre-line; }
        .hn-note-meta { font-size: 0.72rem; color: #9ca3af; margin-top: 8px; }
        .hn-add-area { margin-top: 18px; }
        .hn-textarea { width: 100%; border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 11px 14px; font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #1a2744; outline: none; transition: all 0.25s; background: #fafafa; resize: none; }
        .hn-textarea:focus { border-color: #1a2744; background: white; box-shadow: 0 0 0 3px rgba(26,39,68,0.06); }
        .hn-add-btn { background: linear-gradient(135deg, #1a2744, #243460); color: white; border: none; border-radius: 50px; padding: 10px 24px; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; margin-top: 10px; }
        .hn-add-btn:hover:not(:disabled) { box-shadow: 0 6px 18px rgba(26,39,68,0.28); transform: translateY(-1px); }
        .hn-add-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div className="cd-wrapper">
        <div className="container-lg">
          <button className="cd-back-btn" onClick={() => navigate(-1)}>← Back</button>

          {/* Hero Card */}
          <div className="cd-hero">
            <div className="cd-hero-bar" style={{ background: col.bar }} />
            <div className="cd-hero-body">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <h1 className="cd-title">{caseData.title}</h1>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {isEditing ? (
                    <select name="status" className="cd-edit-input" style={{ width: "auto" }}
                      value={updatedData.status} onChange={handleChange}>
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Closed">Closed</option>
                    </select>
                  ) : (
                    <span className="cd-status-badge" style={{ background: col.bg, color: col.text }}>{caseData.status}</span>
                  )}
                  {isLawyerOwner && !isEditing && (
                    <>
                      <button className="cd-edit-btn" onClick={() => navigate(`/case/${id}/predict`)}
                        style={{ background: "linear-gradient(135deg,#1a2744,#243460)", color: "white", border: "none" }}>
                        🔮 AI Predict
                      </button>
                      <button className="cd-edit-btn" onClick={() => setIsEditing(true)}>✏️ Edit</button>
                    </>
                  )}
                </div>
              </div>

              <div className="cd-info-grid">
                <div><p className="cd-info-label">Case ID</p><p className="cd-info-value" style={{ color: "#4f46e5" }}>{caseData.case_id}</p></div>
                <div><p className="cd-info-label">Advocate Number</p><p className="cd-info-value">{caseData.advocateNumber}</p></div>
                <div><p className="cd-info-label">Client</p><p className="cd-info-value">{caseData.clientName} · {caseData.clientEmail}</p></div>
                <div><p className="cd-info-label">Category</p><p className="cd-info-value">{caseData.category}</p></div>
                {/* New fields */}
                <div><p className="cd-info-label">Court</p>
                  {isEditing ? <input name="courtName" className="cd-edit-input" value={updatedData.courtName || ""} onChange={handleChange} placeholder="Court name" /> : <p className="cd-info-value">{caseData.courtName || "—"}</p>}
                </div>
                <div><p className="cd-info-label">Case Stage</p>
                  {isEditing ? (
                    <select name="stage" className="cd-edit-input" value={updatedData.stage || ""} onChange={handleChange}>
                      <option value="">Select</option>
                      {["Filing", "Arguments", "Evidence", "Judgment", "Disposal", "Appeal"].map(s => <option key={s}>{s}</option>)}
                    </select>
                  ) : <p className="cd-info-value">{caseData.stage || "—"}</p>}
                </div>
                <div><p className="cd-info-label">Priority</p>
                  {isEditing ? (
                    <select name="priority" className="cd-edit-input" value={updatedData.priority || ""} onChange={handleChange}>
                      <option value="">Select</option>
                      <option value="Low">🟢 Low</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="High">🟠 High</option>
                      <option value="Urgent">🔴 Urgent</option>
                    </select>
                  ) : (
                    <p className="cd-info-value">
                      {caseData.priority === "Urgent" && <span style={{ color: "#dc2626", fontWeight: 700 }}>🔴 Urgent</span>}
                      {caseData.priority === "High" && <span style={{ color: "#d97706", fontWeight: 700 }}>🟠 High</span>}
                      {caseData.priority === "Medium" && <span style={{ color: "#ca8a04", fontWeight: 700 }}>🟡 Medium</span>}
                      {caseData.priority === "Low" && <span style={{ color: "#16a34a", fontWeight: 700 }}>🟢 Low</span>}
                      {!caseData.priority && "—"}
                    </p>
                  )}
                </div>
                <div><p className="cd-info-label">Case Filing Date</p>
                  {isEditing ? <input type="date" name="filingDate" className="cd-edit-input" max={today} value={updatedData.filingDate || ""} onChange={handleChange} /> : <p className="cd-info-value">{caseData.filingDate || "—"}</p>}
                </div>
                <div><p className="cd-info-label">Opposing Party</p>
                  {isEditing ? <input name="opposingParty" className="cd-edit-input" value={updatedData.opposingParty || ""} onChange={handleChange} placeholder="Opposing party name" /> : <p className="cd-info-value">{caseData.opposingParty || "—"}</p>}
                </div>
                <div><p className="cd-info-label">Opposing Counsel</p>
                  {isEditing ? <input name="opposingCounsel" className="cd-edit-input" value={updatedData.opposingCounsel || ""} onChange={handleChange} placeholder="Opposing lawyer" /> : <p className="cd-info-value">{caseData.opposingCounsel || "—"}</p>}
                </div>
                <div><p className="cd-info-label">IPC / BNS Sections</p>
                  {isEditing ? <input name="ipcSections" className="cd-edit-input" value={updatedData.ipcSections || ""} onChange={handleChange} placeholder="e.g. IPC 302" /> : <p className="cd-info-value">{caseData.ipcSections || "—"}</p>}
                </div>
                {(caseData.firNumber || isEditing) && (
                  <div><p className="cd-info-label">FIR Number</p>
                    {isEditing ? <input name="firNumber" className="cd-edit-input" value={updatedData.firNumber || ""} onChange={handleChange} placeholder="FIR/2024/0123" /> : <p className="cd-info-value">{caseData.firNumber || "—"}</p>}
                  </div>
                )}
              </div>

              <div className="cd-hearing">
                📅 Next Hearing:&nbsp;
                {isEditing ? (
                  <input type="date" name="next_hearing_date" className="cd-edit-input"
                    style={{ width: "auto", display: "inline-block", marginLeft: 8 }}
                    min={today}
                    value={updatedData.next_hearing_date || ""} onChange={handleChange} />
                ) : (
                  <strong>{caseData.next_hearing_date || "Not set"}</strong>
                )}
              </div>

              {isEditing && (
                <div className="cd-action-row">
                  <button className="cd-btn-cancel" onClick={() => { setIsEditing(false); setUpdatedData(caseData); }}>Cancel</button>
                  <button className="cd-btn-save" onClick={handleUpdate}>💾 Save</button>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="cd-tabs">
            <div className="cd-tab-header">
              {TABS.map(tab => (
                <button key={tab} className={`cd-tab-btn ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}>{tab}</button>
              ))}
            </div>

            <div className="cd-tab-body">
              {/* ── Overview ── */}
              {activeTab === "Overview" && (
                <>
                  {/* {caseData.aiPrediction && (
                    <div style={{ background: "linear-gradient(135deg, #1a2744, #243460)", borderRadius: 16, padding: "22px 26px", color: "white", marginBottom: 28, boxShadow: "0 8px 24px rgba(26,39,68,0.15)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", margin: 0, color: "#c9a84c" }}>🤖 AI Case Predictor Snapshot</h3>
                        <span style={{ background: "rgba(255,255,255,0.1)", padding: "4px 12px", borderRadius: 50, fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>{caseData.aiPrediction.case_strength} Strength</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
                        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "14px 18px", border: "1px solid rgba(255,255,255,0.1)" }}>
                          <p style={{ margin: "0 0 4px", fontSize: "0.7rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700 }}>Predicted Verdict</p>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "white" }}>{caseData.aiPrediction.verdict_prediction}</p>
                            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>Confidence: {caseData.aiPrediction.confidence_level}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )} */}

                  <h3 className="cd-section-title">📋 Description</h3>
                  {isEditing ? (
                    <textarea name="description" className="cd-edit-input" rows="5"
                      value={updatedData.description} onChange={handleChange} />
                  ) : (
                    <div style={{ background: "#f8faff", border: "1px solid #e5e7eb", padding: 18, borderRadius: 16, borderLeft: "4px solid #1a2744" }}>
                      <p style={{ fontSize: "0.88rem", color: "#374151", lineHeight: 1.8, margin: 0, whiteSpace: "pre-line" }}>{caseData.description}</p>
                    </div>
                  )}

                  <div style={{ marginTop: 32 }}>
                    <h3 className="cd-section-title">🔍 AI Recommended Cases</h3>
                    {recLoading ? (
                      <div style={{ textAlign: "center", padding: 32 }}>
                        <div className="spinner-border" style={{ color: "#1a2744" }} />
                        <p className="mt-3" style={{ color: "#6b7280", fontSize: "0.83rem" }}>Analyzing Case Details</p>
                      </div>
                    ) : recommendedCases.length === 0 ? (
                      <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>No similar cases found.</p>
                    ) : (
                      <div className="cd-ai-grid">
                        {recommendedCases.map((c, idx) => (
                          <div key={idx} className="cd-rec-card">
                            <p className="cd-rec-case-id">Case ID: {c.Case_ID}</p>
                            <span className="cd-rec-score">⭐ {c.Score ? (c.Score * 100).toFixed(1) : "N/A"}% Match</span>
                            <div className="cd-rec-summary"><strong>📄 Summary</strong><br />{c.Summary}</div>
                            <button className="cd-rec-btn" onClick={() => setSelectedJudgment({ id: c.Case_ID, text: c.Judgment })}>
                              📜 Full Judgment
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── Messages ── */}
              {activeTab === "Messages" && (
                <>
                  <h3 className="cd-section-title">💬 Case Conversation</h3>
                  <CaseChat caseId={id} caseData={caseData} />
                </>
              )}

              {/* ── Documents ── */}
              {activeTab === "Documents" && (
                <>
                  <h3 className="cd-section-title">📄 Case Documents</h3>
                  <CaseDocuments caseId={id} isLawyer={true} />
                </>
              )}

              {/* ── Timeline ── */}
              {activeTab === "Timeline" && (
                <>
                  <h3 className="cd-section-title">🗓️ Case Timeline</h3>
                  <CaseTimeline events={caseData.events || []} />
                </>
              )}

              {/* ── Hearing Notes ── */}
              {activeTab === "Hearing Notes" && (
                <>
                  <h3 className="cd-section-title">📝 Hearing Notes</h3>
                  <div className="hn-wrap">
                    {(caseData.hearingNotes || []).length === 0 && (
                      <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>No hearing notes yet. Add your first note below.</p>
                    )}
                    {[...(caseData.hearingNotes || [])].reverse().map((note, i) => (
                      <div key={note.id || i} className="hn-note-card">
                        <p className="hn-note-text">{note.note}</p>
                        <p className="hn-note-meta">📅 {note.date} · by {note.addedBy}</p>
                      </div>
                    ))}

                    {isLawyerOwner && (
                      <div className="hn-add-area">
                        <p style={{ fontFamily: "Inter,sans-serif", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>Add Hearing Note</p>
                        <textarea className="hn-textarea" rows="4"
                          placeholder="What happened in today's hearing? Key points, next steps..."
                          value={newNote} onChange={e => setNewNote(e.target.value)} />
                        <button className="hn-add-btn" onClick={handleAddNote} disabled={addingNote || !newNote.trim()}>
                          {addingNote ? "Saving..." : "📝 Add Note"}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Judgment Modal */}
      {selectedJudgment && (
        <div className="cd-modal-overlay" onClick={() => setSelectedJudgment(null)}>
          <div className="cd-modal" onClick={e => e.stopPropagation()}>
            <div className="cd-modal-header">
              <h4 className="cd-modal-title">⚖️ Case ID: {selectedJudgment.id}</h4>
              <button className="cd-modal-close" onClick={() => setSelectedJudgment(null)}>✕ Close</button>
            </div>
            <div className="cd-modal-body">{selectedJudgment.text}</div>
          </div>
        </div>
      )}
    </>
  );
}
