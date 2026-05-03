import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { Spinner, Badge } from "react-bootstrap";

export default function MyCases({ advocateNumber }) {
  const [cases, setCases]     = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [status, setStatus]   = useState("");
  const [priority, setPriority] = useState("");
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

  // Filter cases by status and priority
  useEffect(() => {
    let result = cases;
    if (status)   result = result.filter(c => c.status   === status);
    if (priority) result = result.filter(c => c.priority === priority);
    setFiltered(result);
  }, [status, priority, cases]);

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
          <div className="col-md-4 col-6">
            <select className="form-select rounded-3" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div className="col-md-4 col-6">
            <select className="form-select rounded-3" value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="">All Priorities</option>
              <option value="Urgent">🔴 Urgent</option>
              <option value="High">🟠 High</option>
              <option value="Medium">🟡 Medium</option>
              <option value="Low">🟢 Low</option>
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
                  {/* Title + Status */}
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="fw-semibold text-dark mb-0" style={{ fontSize: "1rem", flex: 1, paddingRight: 8 }}>
                      {caseItem.title || "Untitled Case"}
                    </h5>
                    <Badge
                      bg={caseItem.status === "Closed" ? "secondary" : caseItem.status === "In Progress" ? "warning" : "success"}
                      text={caseItem.status === "In Progress" ? "dark" : "light"}
                      style={{ flexShrink: 0 }}
                    >
                      {caseItem.status}
                    </Badge>
                  </div>

                  {/* Priority + Stage row */}
                  <div className="d-flex gap-2 mb-2 flex-wrap">
                    {caseItem.priority && (
                      <span className="mc-priority-badge" data-priority={caseItem.priority}>
                        {caseItem.priority === "Urgent" && "🔴"}
                        {caseItem.priority === "High"   && "🟠"}
                        {caseItem.priority === "Medium" && "🟡"}
                        {caseItem.priority === "Low"    && "🟢"}
                        {" "}{caseItem.priority}
                      </span>
                    )}
                    {caseItem.stage && (
                      <span className="mc-stage-badge">{caseItem.stage}</span>
                    )}
                  </div>

                  <p className="small text-muted mb-1"><strong>Case ID:</strong> {caseItem.case_id || caseItem.id}</p>
                  <p className="small text-muted mb-1"><strong>Category:</strong> {caseItem.category || "General"}</p>
                  <p className="small text-muted mb-1"><strong>Client:</strong> {caseItem.clientName || "Not linked yet"}</p>
                  {caseItem.courtName && (
                    <p className="small text-muted mb-1"><strong>Court:</strong> {caseItem.courtName}</p>
                  )}
                  {caseItem.opposingParty && (
                    <p className="small text-muted mb-1"><strong>vs:</strong> {caseItem.opposingParty}</p>
                  )}
                  <p className="text-muted small mt-2" style={{ lineHeight: 1.5 }}>
                    {caseItem.description?.length > 90 ? caseItem.description.slice(0, 90) + "…" : caseItem.description || "No description available."}
                  </p>

                  <div className="d-flex justify-content-between mt-3">
                    <button className="btn btn-outline-primary btn-sm rounded-pill"
                      onClick={() => navigate(`/case/${caseItem.id}`)}>
                      View Details
                    </button>
                    <button className="btn btn-outline-success btn-sm rounded-pill"
                      onClick={() => navigate(`/case/${caseItem.id}`, { state: { editMode: true } })}
                    >
                      ✏️ Edit
                    </button>
                  </div>
                </div>
                <div className="card-footer bg-light border-0 text-center">
                  <small className="text-muted">
                    📅 Filed: {caseItem.filingDate || (caseItem.createdAt ? new Date(caseItem.createdAt.seconds * 1000).toLocaleDateString() : "N/A")}
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
          background: linear-gradient(135deg, #1a2744, #243460);
          color: white; font-weight: 600; border: none; transition: 0.3s;
        }
        .btn-gradient:hover { opacity: 0.9; transform: translateY(-1px); }
        .hover-scale { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .hover-scale:hover { transform: translateY(-5px); box-shadow: 0 10px 28px rgba(0,0,0,0.12) !important; }
        .mc-priority-badge {
          font-size: 0.7rem; font-weight: 700; border-radius: 50px;
          padding: 2px 10px; display: inline-flex; align-items: center; gap: 4px;
        }
        .mc-priority-badge[data-priority="Urgent"] { background: #fee2e2; color: #991b1b; }
        .mc-priority-badge[data-priority="High"]   { background: #fef3c7; color: #92400e; }
        .mc-priority-badge[data-priority="Medium"] { background: #fefce8; color: #854d0e; }
        .mc-priority-badge[data-priority="Low"]    { background: #dcfce7; color: #166534; }
        .mc-stage-badge {
          font-size: 0.7rem; font-weight: 600; border-radius: 50px;
          padding: 2px 10px; background: #eef2ff; color: #3730a3;
          display: inline-flex; align-items: center;
        }
      `}</style>
    </div>
  );
}
