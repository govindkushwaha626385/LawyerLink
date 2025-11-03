// src/components/Lawyer/AddCaseModal.js
import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase";

export default function AddCaseModal({ onClose }) {
  const [caseData, setCaseData] = useState({
    title: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    category: "",
    description: "",
    status: "Open",
  });
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;

  const handleChange = (e) => {
    setCaseData({ ...caseData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Please log in first!");
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, "cases"), {
        ...caseData,
        lawyerId: user.uid,
        lawyerEmail: user.email,
        createdAt: serverTimestamp(),
        date: new Date().toLocaleDateString(),
      });
      alert("✅ Case added successfully!");
      onClose();
    } catch (error) {
      console.error("Error adding case:", error);
      alert("❌ Failed to add case. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal fade show"
      style={{ display: "block", background: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content border-0 rounded-4 shadow">
          <div className="modal-header bg-primary text-white rounded-top-4">
            <h5 className="modal-title fw-bold">➕ Add New Case</h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
            ></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Case Title</label>
                  <input
                    type="text"
                    className="form-control"
                    name="title"
                    value={caseData.title}
                    onChange={handleChange}
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

                <div className="col-md-6">
                  <label className="form-label fw-semibold">Client Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="clientName"
                    value={caseData.clientName}
                    onChange={handleChange}
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

                <div className="col-12">
                  <label className="form-label fw-semibold">Description</label>
                  <textarea
                    className="form-control"
                    name="description"
                    rows="3"
                    value={caseData.description}
                    onChange={handleChange}
                    required
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary rounded-pill"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-success rounded-pill"
                disabled={loading}
              >
                {loading ? "Adding..." : "Add Case"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
