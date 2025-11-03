import React from "react";
import { useNavigate } from "react-router-dom";

export default function ChooseUserType() {
  const navigate = useNavigate();

  return (
    <div
      className="d-flex align-items-center justify-content-center text-center"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #e3f2fd, #bbdefb)",
        padding: "20px",
      }}
    >
      <div className="container">
        <h1 className="fw-bold mb-3 text-primary display-5">⚖️ LawyerLink</h1>
        <p className="text-secondary mb-5 fs-5">
          Bridging the gap between <strong>Lawyers</strong> and <strong>Litigants</strong>
        </p>

        <div className="row justify-content-center g-4">
          {/* Litigant Card */}
          <div className="col-12 col-md-5">
            <div
              className="card shadow-lg border-0 h-100 p-4 hover-card"
              style={{ borderRadius: "20px" }}
            >
              <div className="card-body">
                <h3 className="card-title mb-3 text-primary">I am a Litigant</h3>
                <p className="card-text text-muted">
                  Explore experienced lawyers, track your cases, and get AI-based legal guidance.
                </p>
                <button
                  className="btn btn-primary btn-lg mt-3 px-4"
                  onClick={() => navigate("/login?role=litigant")}
                >
                  Continue as Litigant
                </button>
              </div>
            </div>
          </div>

          {/* Lawyer Card */}
          <div className="col-12 col-md-5">
            <div
              className="card shadow-lg border-0 h-100 p-4 hover-card"
              style={{ borderRadius: "20px" }}
            >
              <div className="card-body">
                <h3 className="card-title mb-3 text-success">I am a Lawyer</h3>
                <p className="card-text text-muted">
                  Manage your clients, update cases, and leverage AI tools for smarter recommendations.
                </p>
                <button
                  className="btn btn-success btn-lg mt-3 px-4"
                  onClick={() => navigate("/login?role=lawyer")}
                >
                  Continue as Lawyer
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-5 text-muted small">
          ⚙️ Select your user type to proceed. You can switch roles anytime from your profile settings.
        </p>
      </div>
    </div>
  );
}
