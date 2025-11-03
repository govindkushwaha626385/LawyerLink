import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";

export default function MyCases({ lawyerId }) {
  const [cases, setCases] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch all cases for the lawyer
  useEffect(() => {
    const fetchCases = async () => {
      try {
        const q = query(collection(db, "cases"), where("lawyerId", "==", lawyerId));
        const snapshot = await getDocs(q);
        const caseList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCases(caseList);
        setFiltered(caseList);
      } catch (error) {
        console.error("Error fetching cases:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, [lawyerId]);

  // Filter cases by status
  useEffect(() => {
    let result = cases;
    if (status) {
      result = result.filter((c) => c.status === status);
    }
    setFiltered(result);
  }, [status, cases]);

  if (loading)
    return <div className="text-center mt-5">Loading your cases...</div>;

  return (
    <div className="container py-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <h3 className="fw-bold text-primary mb-3 mb-md-0">📂 My Cases</h3>
        <button
          className="btn btn-success rounded-pill"
          onClick={() => navigate("/lawyer/add-case")}
        >
          ➕ Add New Case
        </button>
      </div>

      {/* --- Filters --- */}
      <div className="card shadow-sm border-0 mb-4 rounded-4 p-3">
        <div className="row g-3 align-items-center">
          <div className="col-md-6 col-12">
            <select
              className="form-select rounded-3"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* --- Cases List --- */}
      <div className="row g-4">
        {filtered.length > 0 ? (
          filtered.map((caseItem) => (
            <div key={caseItem.id} className="col-lg-4 col-md-6 col-12">
              <div className="card h-100 border-0 shadow-sm rounded-4 lawyer-card">
                <div className="card-body">
                  <h5 className="fw-semibold text-dark">
                    {caseItem.title || "Untitled Case"}
                  </h5>
                  <p className="small text-muted mb-1">
                    <strong>Client:</strong> {caseItem.clientName || "N/A"}
                  </p>
                  <p className="text-secondary small mb-1">
                    <strong>Category:</strong> {caseItem.category || "General"}
                  </p>
                  <p className="small mb-2">
                    <strong>Status:</strong>{" "}
                    <span
                      className={`badge ${
                        caseItem.status === "Closed"
                          ? "bg-secondary"
                          : caseItem.status === "In Progress"
                          ? "bg-warning text-dark"
                          : "bg-success"
                      }`}
                    >
                      {caseItem.status}
                    </span>
                  </p>
                  <p className="text-muted small mb-3">
                    {caseItem.description?.length > 100
                      ? caseItem.description.slice(0, 100) + "..."
                      : caseItem.description || "No description"}
                  </p>

                  <div className="d-flex justify-content-between">
                    <button
                      className="btn btn-outline-primary btn-sm rounded-pill"
                      onClick={() => navigate(`/case/${caseItem.id}`)}
                    >
                      View Details
                    </button>
                    <button
                      className="btn btn-outline-success btn-sm rounded-pill"
                      onClick={() => navigate(`/lawyer/edit-case/${caseItem.id}`)}
                    >
                      ✏️ Update
                    </button>
                  </div>
                </div>
                <div className="card-footer bg-light border-0 text-center">
                  <small className="text-muted">
                    Created:{" "}
                    {caseItem.createdAt
                      ? new Date(caseItem.createdAt.seconds * 1000).toLocaleDateString()
                      : "N/A"}
                  </small>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-muted">No cases found.</p>
        )}
      </div>
    </div>
  );
}
