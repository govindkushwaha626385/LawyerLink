import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { Spinner, Badge } from "react-bootstrap";

export default function MyCases({ advocateNumber }) {
  const [cases, setCases] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch all cases for the logged-in advocate
  useEffect(() => {
    const fetchCases = async () => {
      try {
        const q = query(collection(db, "cases"), where("advocateNumber", "==", advocateNumber));
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
    if (advocateNumber) fetchCases();
  }, [advocateNumber]);

  // Filter cases by status
  useEffect(() => {
    let result = cases;
    if (status) {
      result = result.filter((c) => c.status === status);
    }
    setFiltered(result);
  }, [status, cases]);

  if (loading)
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" /> <p>Loading your cases...</p>
      </div>
    );

  return (
    <div className="container py-5">
      {/* Header Section */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <h3 className="fw-bold text-primary mb-3 mb-md-0">⚖️ My Cases</h3>
        <button
          className="btn btn-gradient rounded-pill px-4 py-2"
          onClick={() => navigate("/lawyer/add-case")}
        >
          ➕ Add New Case
        </button>
      </div>

      {/* Filters */}
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

      {/* Cases List */}
      <div className="row g-4">
        {filtered.length > 0 ? (
          filtered.map((caseItem) => (
            <div key={caseItem.id} className="col-lg-4 col-md-6 col-12">
              <div className="card h-100 border-0 shadow-lg rounded-4 lawyer-card hover-scale">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <h5 className="fw-semibold text-dark mb-1">
                      {caseItem.title || "Untitled Case"}
                    </h5>
                    <Badge
                      bg={
                        caseItem.status === "Closed"
                          ? "secondary"
                          : caseItem.status === "In Progress"
                          ? "warning"
                          : "success"
                      }
                      text={
                        caseItem.status === "In Progress"
                          ? "dark"
                          : "light"
                      }
                    >
                      {caseItem.status}
                    </Badge>
                  </div>

                  <p className="small text-muted mb-1">
                    <strong>Case ID:</strong> {caseItem.id}
                  </p>
                  <p className="small text-muted mb-1">
                    <strong>Category:</strong> {caseItem.category || "General"}
                  </p>
                  <p className="small text-muted mb-1">
                    <strong>Client:</strong> {caseItem.clientName || "Not linked yet"}
                  </p>
                  <p className="small text-muted mb-1">
                    <strong>Advocate Number:</strong> {caseItem.advocateNumber}
                  </p>
                  <p className="text-muted small mt-2">
                    {caseItem.description?.length > 100
                      ? caseItem.description.slice(0, 100) + "..."
                      : caseItem.description || "No description available."}
                  </p>

                  <div className="d-flex justify-content-between mt-3">
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
                      ✏️ Edit
                    </button>
                  </div>
                </div>
                <div className="card-footer bg-light border-0 text-center">
                  <small className="text-muted">
                    📅 Created:{" "}
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

      {/* Extra Styles */}
      <style>{`
        .btn-gradient {
          background: linear-gradient(90deg, #007bff, #00bfff);
          color: white;
          font-weight: 500;
          border: none;
          transition: 0.3s;
        }
        .btn-gradient:hover {
          background: linear-gradient(90deg, #0056b3, #0099cc);
        }
        .hover-scale {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .hover-scale:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}
