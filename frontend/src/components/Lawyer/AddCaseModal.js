import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  query,
  where,
  doc,
  limit,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { v4 as uuidv4 } from "uuid";
import { addCaseEvent } from "../../utils/caseEvents";
import { createNotification } from "../../utils/notifications";

export default function AddCaseModal({ onClose, advocateNumber: propAdvocateNumber, initialData }) {
  const [caseData, setCaseData] = useState({
    title:           initialData?.title || "",
    clientName:      initialData?.clientName || "",
    clientEmail:     initialData?.clientEmail || "",
    clientPhone:     initialData?.clientPhone || "",
    category:        initialData?.category || "",
    description:     initialData?.description || "",
    next_hearing_date: "",
    status:          "Open",
    // ── New fields ──
    courtName:       "",
    ipcSections:     "",
    stage:           "",
    priority:        "",
    opposingParty:   "",
    opposingCounsel: "",
    filingDate:      "",
    firNumber:       "",
  });

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [advocateNumber, setAdvocateNumber] = useState(propAdvocateNumber || "");
  // Court autocomplete state
  const [courtList, setCourtList] = useState([]);       // all courts from Firestore
  const [courtInput, setCourtInput] = useState("");      // raw text input
  const [courtSuggestions, setCourtSuggestions] = useState([]); // filtered
  const [showSuggestions, setShowSuggestions] = useState(false);
  const user = auth.currentUser;

  // Fetch advocate number if not passed as prop
  useEffect(() => {
    const fetchAdvocateNumber = async () => {
      if (!user || advocateNumber) return;
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists()) setAdvocateNumber(userSnap.data().advocateNumber || "");
    };
    fetchAdvocateNumber();
  }, [user, advocateNumber]);

  // Fetch courts master list from Firestore once on mount
  useEffect(() => {
    getDocs(collection(db, "courts"))
      .then(snap => setCourtList(snap.docs.map(d => d.data())))
      .catch(() => {}); // non-critical
  }, []);

  const handleChange = (e) => {
    setCaseData({ ...caseData, [e.target.name]: e.target.value });
    setFormError(""); // clear any inline error on field change
  };

  // Court autocomplete handlers
  const handleCourtInput = (e) => {
    const val = e.target.value;
    setCourtInput(val);
    setCaseData(prev => ({ ...prev, courtName: val, courtAddress: "" })); // clear address until selected
    if (val.trim().length < 1) { setCourtSuggestions([]); setShowSuggestions(false); return; }
    const filtered = courtList.filter(c =>
      c.court_name.toLowerCase().includes(val.trim().toLowerCase())
    );
    setCourtSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  const handleCourtSelect = (court) => {
    setCourtInput(court.court_name);
    setCaseData(prev => ({ ...prev, courtName: court.court_name, courtAddress: court.address }));
    setCourtSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("Please log in first!");
    setFormError("");
    try {
      setLoading(true);

      // ── Validate FIR Number (if provided) ──────────────────────
      if (caseData.firNumber && caseData.firNumber.trim()) {
        const normalizedFir = caseData.firNumber.trim().toUpperCase();
        const firQ = query(
          collection(db, "fir_numbers"),
          where("fir_number", "==", normalizedFir),
          limit(1)
        );
        const firSnap = await getDocs(firQ);
        if (firSnap.empty) {
          setFormError(`❌ FIR Number "${normalizedFir}" is not found in our records. Please verify and try again.`);
          setLoading(false);
          return;
        }
      }

      const generatedCaseId = uuidv4().slice(0, 8).toUpperCase();

      // Fetch lawyer's name for notifications
      const lawyerSnap = await getDoc(doc(db, "users", user.uid));
      const lawyerName = lawyerSnap.exists() ? lawyerSnap.data().fullName || user.email : user.email;

      // Fetch litigantId first (so it can be stored in the case doc)
      const normalizedClientEmail = caseData.clientEmail.trim().toLowerCase();
      const usersQ = query(collection(db, "users"), where("email", "==", normalizedClientEmail));
      const usersSnap = await getDocs(usersQ);
      const litigantId = usersSnap.empty ? null : usersSnap.docs[0].id;

      // Save case in Firestore (single addDoc with all fields including litigantId)
      const newCaseRef = await addDoc(collection(db, "cases"), {
        ...caseData,
        clientEmail: normalizedClientEmail,
        case_id: generatedCaseId,
        advocateNumber,
        lawyerId: user.uid,
        lawyerEmail: user.email,
        lawyerName,
        litigantId: litigantId || null,
        status: caseData.status || "Open",
        createdAt: serverTimestamp(),
        date: new Date().toLocaleDateString(),
        events: [],
        hearingNotes: [],
        documents: [],
      });

      // Timeline event: case created
      await addCaseEvent(newCaseRef.id, "created",
        `📁 Case "${caseData.title}" created by ${lawyerName}`, lawyerName);

      // Notify litigant if they have an account
      if (litigantId) {
        await createNotification(
          litigantId,
          "New Case Added",
          `Lawyer ${lawyerName} added case "${caseData.title}" to your account.`,
          "case_update",
          newCaseRef.id
        );
      }

      // Send case-added email to client (Non-blocking)
      try {
        const clientName = usersSnap.empty ? "" : (usersSnap.docs[0].data().fullName || "");
        fetch(`${process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000"}/send-case-added-email/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_email:      normalizedClientEmail,
            client_name:       clientName || caseData.clientName,
            lawyer_name:       lawyerName,
            lawyer_email:      user.email,
            case_id:           generatedCaseId,
            case_title:        caseData.title,
            category:          caseData.category,
            description:       caseData.description,
            status:            caseData.status || "Open",
            next_hearing_date: caseData.next_hearing_date,
            court_name:        caseData.courtName,
            stage:             caseData.stage,
            priority:          caseData.priority,
            filing_date:       caseData.filingDate,
            opposing_party:    caseData.opposingParty,
            opposing_counsel:  caseData.opposingCounsel,
            ipc_sections:      caseData.ipcSections,
            fir_number:        caseData.firNumber,
          }),
        }).catch(err => console.warn("Email fetch error:", err));
      } catch (emailErr) {
        console.warn("Email notification failed (non-critical):", emailErr);
      }

      alert(`✅ Case added successfully!\nCase ID: ${generatedCaseId}`);
      onClose();
      window.location.reload();
    } catch (error) {
      console.error("❌ Error adding case:", error);
      alert("Failed to add case. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.65)" }}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <form onSubmit={handleSubmit} className="modal-content border-0 rounded-4 shadow-lg">

          {/* Header */}
          <div className="modal-header rounded-top-4" style={{ background: "linear-gradient(135deg,#1a2744,#243460)" }}>
            <h5 className="modal-title fw-bold text-white">🧾 Add New Case</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} />
          </div>

          <div className="modal-body px-4 py-4">

              {/* ── Section 1: Case Basics ── */}
              <p className="acm-section-label">📁 Case Information</p>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Case Title <span className="text-danger">*</span></label>
                  <input type="text" className="form-control acm-input" name="title"
                    value={caseData.title} onChange={handleChange}
                    placeholder="e.g. Property Dispute Case" required />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Category <span className="text-danger">*</span></label>
                  <select className="form-select acm-input" name="category"
                    value={caseData.category} onChange={handleChange} required>
                    <option value="">Select Category</option>
                    <option>Criminal</option>
                    <option>Civil</option>
                    <option>Corporate</option>
                    <option>Family</option>
                    <option>Property</option>
                    <option>Labour</option>
                    <option>Consumer</option>
                    <option>Tax</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Case Stage <span className="text-danger">*</span></label>
                  <select className="form-select acm-input" name="stage"
                    value={caseData.stage} onChange={handleChange} required>
                    <option value="">Select Stage</option>
                    <option>Filing</option>
                    <option>Arguments</option>
                    <option>Evidence</option>
                    <option>Judgment</option>
                    <option>Disposal</option>
                    <option>Appeal</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Priority <span className="text-danger">*</span></label>
                  <select className="form-select acm-input" name="priority"
                    value={caseData.priority} onChange={handleChange} required>
                    <option value="">Select Priority</option>
                    <option value="Low">🟢 Low</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="High">🟠 High</option>
                    <option value="Urgent">🔴 Urgent</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Status</label>
                  <select className="form-select acm-input" name="status"
                    value={caseData.status} onChange={handleChange}>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Case Filing Date <span className="text-danger">*</span></label>
                  <input type="date" className="form-control acm-input" name="filingDate"
                    value={caseData.filingDate} onChange={handleChange} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Next Hearing Date <span className="text-danger">*</span></label>
                  <input type="date" className="form-control acm-input" name="next_hearing_date"
                    value={caseData.next_hearing_date} onChange={handleChange} required />
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold">Description <span className="text-danger">*</span></label>
                  <textarea className="form-control acm-input" name="description" rows="3"
                    value={caseData.description} onChange={handleChange}
                    placeholder="Brief summary of the case facts and background..." required />
                </div>
              </div>

              {/* ── Section 2: Court Details ── */}
              <p className="acm-section-label">🏛️ Court Details</p>
              {formError && (
                <div style={{
                  background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626",
                  borderRadius: 10, padding: "10px 14px", fontSize: "0.83rem",
                  fontWeight: 500, marginBottom: 12
                }}>
                  {formError}
                </div>
              )}
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Court Name <span className="text-danger">*</span></label>
                  {/* Custom autocomplete */}
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      className="form-control acm-input"
                      placeholder="Search court name..."
                      value={courtInput}
                      onChange={handleCourtInput}
                      onFocus={() => courtSuggestions.length > 0 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      required
                    />
                    {showSuggestions && (
                      <ul style={{
                        position: "absolute", top: "100%", left: 0, right: 0, zIndex: 9999,
                        background: "white", border: "1.5px solid #e5e7eb", borderRadius: 10,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.1)", margin: 0, padding: "4px 0",
                        listStyle: "none", maxHeight: 200, overflowY: "auto"
                      }}>
                        {courtSuggestions.map((court, i) => (
                          <li
                            key={i}
                            onMouseDown={() => handleCourtSelect(court)}
                            style={{
                              padding: "9px 14px", cursor: "pointer",
                              fontSize: "0.85rem", color: "#1a2744",
                              borderBottom: i < courtSuggestions.length - 1 ? "1px solid #f3f4f6" : "none",
                              transition: "background 0.15s"
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f0f4ff"}
                            onMouseLeave={e => e.currentTarget.style.background = "white"}
                          >
                            <div style={{ fontWeight: 600 }}>🏛️ {court.court_name}</div>
                            <div style={{ fontSize: "0.73rem", color: "#6b7280", marginTop: 2 }}>{court.address}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {/* Show auto-filled address */}
                  {caseData.courtAddress && (
                    <div style={{
                      marginTop: 6, fontSize: "0.75rem", color: "#6b7280",
                      background: "#f0fdf4", borderRadius: 8, padding: "5px 10px",
                      border: "1px solid #bbf7d0"
                    }}>
                      📍 {caseData.courtAddress}
                    </div>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">IPC / BNS Sections</label>
                  <input type="text" className="form-control acm-input" name="ipcSections"
                    value={caseData.ipcSections} onChange={handleChange}
                    placeholder="e.g. IPC 302, IPC 420 (optional)" />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">FIR Number <span className="text-muted" style={{fontSize:".78rem"}}>(Criminal cases)</span></label>
                  <input type="text" className="form-control acm-input" name="firNumber"
                    value={caseData.firNumber} onChange={handleChange}
                    placeholder="e.g. FIR/2024/0123 (optional)" />
                </div>
              </div>

              {/* ── Section 3: Opposing Party ── */}
              <p className="acm-section-label">⚔️ Opposing Party</p>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Opposing Party Name <span className="text-danger">*</span></label>
                  <input type="text" className="form-control acm-input" name="opposingParty"
                    value={caseData.opposingParty} onChange={handleChange}
                    placeholder="e.g. State of UP / Ramesh Sharma" required />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Opposing Counsel</label>
                  <input type="text" className="form-control acm-input" name="opposingCounsel"
                    value={caseData.opposingCounsel} onChange={handleChange}
                    placeholder="Name of opposing lawyer (optional)" />
                </div>
              </div>

              {/* ── Section 4: Client Info ── */}
              <p className="acm-section-label">👤 Client Information</p>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Client Name <span className="text-danger">*</span></label>
                  <input type="text" className="form-control acm-input" name="clientName"
                    value={caseData.clientName} onChange={handleChange}
                    placeholder="e.g. Rajesh Kumar" required />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Client Email <span className="text-danger">*</span></label>
                  <input type="email" className="form-control acm-input" name="clientEmail"
                    value={caseData.clientEmail} onChange={handleChange}
                    placeholder="e.g. rajesh@gmail.com" required />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Client Phone</label>
                  <input type="text" className="form-control acm-input" name="clientPhone"
                    value={caseData.clientPhone} onChange={handleChange}
                    placeholder="Optional" />
                </div>
                {advocateNumber && (
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Advocate Number</label>
                    <input type="text" className="form-control acm-input" value={advocateNumber} readOnly
                      style={{ background: "#f3f4f6", cursor: "not-allowed" }} />
                  </div>
                )}
              </div>

            </div>{/* modal-body */}

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn rounded-pill px-5 fw-bold text-white" disabled={loading}
                style={{ background: "linear-gradient(135deg,#1a2744,#243460)" }}>
                {loading ? "⏳ Adding..." : "✅ Add Case"}
              </button>
            </div>
        </form>
      </div>

      <style>{`
        .acm-section-label {
          font-family: 'Playfair Display', serif;
          font-size: 0.85rem; font-weight: 700;
          color: #1a2744; text-transform: uppercase;
          letter-spacing: 0.8px; margin: 8px 0 4px;
          padding-bottom: 6px;
          border-bottom: 2px solid #c9a84c;
          display: inline-block;
        }
        .acm-input { border-radius: 10px !important; border: 1.5px solid #e5e7eb; font-size: 0.875rem; transition: all 0.2s; }
        .acm-input:focus { border-color: #1a2744 !important; box-shadow: 0 0 0 3px rgba(26,39,68,0.08) !important; }
        .modal-content { animation: acmFadeIn 0.3s ease; }
        @keyframes acmFadeIn { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}
