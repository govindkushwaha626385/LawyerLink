import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { v4 as uuidv4 } from "uuid"; // npm install uuid

export default function AddCaseModal({ onClose, advocateNumber: propAdvocateNumber }) {
  const [caseData, setCaseData] = useState({
    title: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    category: "",
    description: "",
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

      // ✅ Generate unique case_id
      const generatedCaseId = uuidv4().slice(0, 8).toUpperCase();

      // ✅ Save case in Firestore
      await addDoc(collection(db, "cases"), {
        ...caseData,
        case_id: generatedCaseId,
        advocateNumber,
        lawyerId: user.uid,
        lawyerEmail: user.email,
        createdAt: serverTimestamp(),
        date: new Date().toLocaleDateString(),
      });

      // setCaseId(generatedCaseId);
      alert(`✅ Case added successfully!\nCase ID: ${generatedCaseId}`);
      onClose();
      window.location.reload(); // refresh dashboard to show new case
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
