// ✅ src/components/Lawyer/CaseDetails.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import axios from "axios";
import "./CaseDetails.css";

export default function CaseDetails() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [recommendedCases, setRecommendedCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [updatedData, setUpdatedData] = useState({});
  const user = auth.currentUser;

  // ✅ Fetch selected case details from Firestore
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
        } else {
          console.error("No such case found!");
        }
      } catch (error) {
        console.error("Error fetching case:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
  }, [id]);

  // ✅ Fetch AI-based case recommendations
  const fetchRecommendedCases = async (text) => {
    setRecLoading(true);
    try {
      const response = await axios.post("http://127.0.0.1:8000/recommend/", {
        text,
        top_k: 5,
      });
      setRecommendedCases(response.data.results || []);
    } catch (error) {
      console.error("Error fetching recommended cases:", error);
    } finally {
      setRecLoading(false);
    }
  };

  // ✅ Handle edits
  const handleChange = (e) => {
    setUpdatedData({ ...updatedData, [e.target.name]: e.target.value });
  };

  // ✅ Save updated data
  const handleUpdate = async () => {
    try {
      const caseRef = doc(db, "cases", id);
      await updateDoc(caseRef, {
        ...updatedData,
        lastUpdated: new Date().toISOString(),
      });
      setCaseData(updatedData);
      setIsEditing(false);
      alert("✅ Case updated successfully!");
    } catch (error) {
      console.error("Error updating case:", error);
      alert("❌ Failed to update case. Please try again.");
    }
  };

  if (loading)
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-3 text-muted">Loading case details...</p>
      </div>
    );

  if (!caseData)
    return (
      <div className="text-center mt-5 text-danger fw-semibold">
        Case not found.
      </div>
    );

  const isLawyerOwner = user && user.uid === caseData.lawyerId;

  return (
    <div className="container py-5">
      {/* 🧾 Case Info Card */}
      <div className="card shadow-sm border-0 rounded-4 mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="fw-bold mb-3 text-primary">{caseData.title}</h3>
            {isLawyerOwner && !isEditing && (
              <button
                className="btn btn-outline-primary btn-sm rounded-pill"
                onClick={() => setIsEditing(true)}
              >
                ✏️ Edit Case
              </button>
            )}
          </div>

          {/* Case Info */}
          <div className="row mb-2">
            <div className="col-md-6">
              <p className="mb-1">
                <strong>Case ID:</strong>{" "}
                <span className="text-primary fw-semibold">
                  {caseData.case_id || "N/A"}
                </span>
              </p>
              <p className="mb-1">
                <strong>Advocate Number:</strong>{" "}
                <span className="text-dark">{caseData.advocateNumber || "N/A"}</span>
              </p>
              <p className="mb-1">
                <strong>Client:</strong> {caseData.clientName} (
                {caseData.clientEmail})
              </p>
              <p className="mb-1">
                <strong>Category:</strong> {caseData.category}
              </p>

              {/* 🪪 Editable Next Hearing Date */}
              <div
                className="p-3 rounded-3 shadow-sm mt-2"
                style={{
                  backgroundColor: "#e8f0fe",
                  fontWeight: "700",
                  color: "#0d47a1",
                  borderLeft: "5px solid #0d47a1",
                }}
              >
                🪪 Next Hearing Date:{" "}
                {isEditing ? (
                  <input
                    type="date"
                    name="next_hearing_date"
                    className="form-control d-inline-block w-auto ms-2"
                    value={updatedData.next_hearing_date || ""}
                    onChange={handleChange}
                  />
                ) : (
                  <span className="text-dark">{caseData.next_hearing_date || "N/A"}</span>
                )}
              </div>
            </div>

            <div className="col-md-6 text-md-end">
              <p className="mb-1">
                <strong>Status:</strong>{" "}
                {isEditing ? (
                  <select
                    name="status"
                    className="form-select d-inline-block w-auto ms-2"
                    value={updatedData.status}
                    onChange={handleChange}
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Closed">Closed</option>
                  </select>
                ) : (
                  <span
                    className={`badge ${
                      caseData.status === "Closed"
                        ? "bg-danger"
                        : caseData.status === "In Progress"
                        ? "bg-warning text-dark"
                        : "bg-success"
                    }`}
                  >
                    {caseData.status}
                  </span>
                )}
              </p>
              <p className="text-muted small">
                <i className="bi bi-calendar"></i> Created: {caseData.date || "N/A"}
              </p>
            </div>
          </div>

          <hr />

          {/* Description */}
          <div>
            <strong>Description:</strong>
            {isEditing ? (
              <textarea
                name="description"
                className="form-control mt-2"
                rows="4"
                value={updatedData.description}
                onChange={handleChange}
              ></textarea>
            ) : (
              <p
                className="mt-2 text-secondary"
                style={{ whiteSpace: "pre-line" }}
              >
                {caseData.description}
              </p>
            )}
          </div>

          {/* Update Buttons */}
          {isEditing && (
            <div className="mt-3 text-end">
              <button
                className="btn btn-secondary rounded-pill me-2"
                onClick={() => {
                  setIsEditing(false);
                  setUpdatedData(caseData);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-success rounded-pill"
                onClick={handleUpdate}
              >
                💾 Save Changes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 🔍 AI-Powered Recommended Cases */}
      <h4 className="fw-bold mb-4 text-primary text-center">
        🔍 AI-Powered Recommended Cases
      </h4>

      {recLoading ? (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-3 text-muted">Fetching recommendations...</p>
        </div>
      ) : recommendedCases.length === 0 ? (
        <div className="alert alert-info text-center">
          No similar cases found.
        </div>
      ) : (
        <div className="row justify-content-center">
          {recommendedCases.map((c, idx) => (
            <div key={idx} className="col-md-6 col-lg-4 mb-4">
              <div className="card border-0 shadow-sm h-100 rounded-4 lawyer-card">
                <div className="card-body">
                  <h5 className="fw-semibold text-dark mb-2">
                    Case ID: {c.Case_ID}
                  </h5>
                  <p className="small text-muted mb-2">
                    <strong>Relevance Score:</strong>{" "}
                    {c.Score ? c.Score.toFixed(3) : "N/A"}
                  </p>
                  <p className="text-secondary small mb-2">
                    <strong>Summary:</strong>{" "}
                    {c.Summary?.length > 220
                      ? c.Summary.slice(0, 220) + "..."
                      : c.Summary}
                  </p>

                  <details className="bg-light rounded p-2 mb-2">
                    <summary className="text-primary small">
                      View Judgment
                    </summary>
                    <p className="small text-muted mt-2">{c.Judgment}</p>
                  </details>

                  <button
                    className="btn btn-outline-primary btn-sm rounded-pill mt-2"
                    onClick={() => alert("Full case view coming soon!")}
                  >
                    View Full Case
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 💅 Hover Animation */}
      <style>
        {`
          .lawyer-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            background: #fff;
          }
          .lawyer-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
          }
          details summary {
            cursor: pointer;
          }
        `}
      </style>
    </div>
  );
}
