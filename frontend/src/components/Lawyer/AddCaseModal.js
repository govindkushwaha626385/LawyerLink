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
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { v4 as uuidv4 } from "uuid";
import { addCaseEvent } from "../../utils/caseEvents";
import { createNotification } from "../../utils/notifications";

export default function AddCaseModal({ onClose, advocateNumber: propAdvocateNumber, initialData }) {
  const [caseData, setCaseData] = useState({
    title: initialData?.title || "",
    clientName: initialData?.clientName || "",
    clientEmail: initialData?.clientEmail || "",
    clientPhone: initialData?.clientPhone || "",
    category: initialData?.category || "",
    description: initialData?.description || "",
    next_hearing_date: "",
    status: "Open",
  });

  const [loading, setLoading] = useState(false);
  const [advocateNumber, setAdvocateNumber] = useState(propAdvocateNumber || "");
  // const [caseId, setCaseId] = useState(null);
  const user = auth.currentUser;

  // ✅ Fetch advocateNumber if not passed as prop
  useEffect(() => {
    const fetchAdvocateNumber = async () => {
      if (!user || advocateNumber) return;
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setAdvocateNumber(userSnap.data().advocateNumber || "");
      }
    };
    fetchAdvocateNumber();
  }, [user, advocateNumber]);

  const handleChange = (e) => {
    setCaseData({ ...caseData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("Please log in first!");
    try {
      setLoading(true);
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

      // Send case-added email to client
      try {
        const clientName = usersSnap.empty ? "" : (usersSnap.docs[0].data().fullName || "");
        await fetch("http://127.0.0.1:8000/send-case-added-email/", {
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
          }),
        });
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
    <div
      className="modal fade show"
      style={{ display: "block", background: "rgba(0,0,0,0.6)" }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content border-0 rounded-4 shadow-lg">
          <div className="modal-header bg-primary text-white rounded-top-4">
            <h5 className="modal-title fw-bold">🧾 Add New Case</h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
            ></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body px-4 py-3">
              <div className="row g-3">
                {/* Case Info */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Case Title</label>
                  <input
                    type="text"
                    className="form-control"
                    name="title"
                    value={caseData.title}
                    onChange={handleChange}
                    placeholder="e.g. Property dispute case"
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">Category</label>
                  <select
                    className="form-select"
                    name="category"
                    value={caseData.category}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Category</option>
                    <option value="Criminal">Criminal</option>
                    <option value="Civil">Civil</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Family">Family</option>
                    <option value="Property">Property</option>
                  </select>
                </div>

                {/* Client Info */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Client Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="clientName"
                    value={caseData.clientName}
                    onChange={handleChange}
                    placeholder="e.g. Rajesh Kumar"
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">Client Email</label>
                  <input
                    type="email"
                    className="form-control"
                    name="clientEmail"
                    value={caseData.clientEmail}
                    onChange={handleChange}
                    placeholder="e.g. rajesh@gmail.com"
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">Client Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    name="clientPhone"
                    value={caseData.clientPhone}
                    onChange={handleChange}
                    placeholder="Optional"
                  />
                </div>

                {/* ✅ New Hearing Date (Calendar Input) */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Next Hearing Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    name="next_hearing_date"
                    value={caseData.next_hearing_date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">Status</label>
                  <select
                    className="form-select"
                    name="status"
                    value={caseData.status}
                    onChange={handleChange}
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                {/* Description */}
                <div className="col-12">
                  <label className="form-label fw-semibold">Description</label>
                  <textarea
                    className="form-control"
                    name="description"
                    rows="3"
                    value={caseData.description}
                    onChange={handleChange}
                    placeholder="Brief summary of the case..."
                    required
                  ></textarea>
                </div>

                {/* Advocate Number */}
                {advocateNumber && (
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Advocate Number
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={advocateNumber}
                      readOnly
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary rounded-pill px-4"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-success rounded-pill px-4"
                disabled={loading}
              >
                {loading ? "Adding..." : "Add Case"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ✨ Inline Styling */}
      <style>
        {`
          .form-label {
            color: #2c3e50;
          }
          .form-control, .form-select {
            border-radius: 10px;
          }
          .modal-content {
            animation: fadeIn 0.3s ease-in-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
}
