import React, { useEffect, useState } from "react";
import axios from "axios";

export default function RecommendedCases({ caseSummary }) {
  const [recommendedCases, setRecommendedCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendedCases = async () => {
      try {
        if (!caseSummary) return;
        const response = await axios.post("http://127.0.0.1:8000/recommend/", {
          text: caseSummary,
          top_k: 5,
        });
        setRecommendedCases(response.data.results || []);
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendedCases();
  }, [caseSummary]);

  if (loading)
    return (
      <div className="text-center my-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted">Fetching similar cases...</p>
      </div>
    );

  if (recommendedCases.length === 0)
    return (
      <div className="alert alert-info text-center mt-4 shadow-sm rounded-3">
        No similar cases found at the moment.
      </div>
    );

  return (
    <div className="mt-5">
      <h4 className="fw-bold mb-4 text-primary text-center">
        🔍 Recommended Similar Cases
      </h4>

      <div className="row justify-content-center">
        {recommendedCases.map((c, idx) => (
          <div key={idx} className="col-md-6 col-lg-4 mb-4">
            <div className="card border-0 shadow-sm h-100 rounded-4 lawyer-card">
              <div className="card-body">
                <h5 className="fw-semibold text-dark mb-2">
                  Case ID: {c.Case_ID}
                </h5>
                <p className="small text-muted mb-2">
                  <strong>Relevance Score:</strong> {c.Score.toFixed(3)}
                </p>

                <p className="text-secondary small mb-3">
                  <strong>Summary:</strong>{" "}
                  {c.Summary?.length > 250
                    ? c.Summary.slice(0, 250) + "..."
                    : c.Summary}
                </p>

                <details className="bg-light rounded p-2 mb-2">
                  <summary className="text-primary small mb-1">
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

      <style>
        {`
          .lawyer-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            background: #ffffff;
          }
          .lawyer-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
          }
          summary {
            cursor: pointer;
          }
        `}
      </style>
    </div>
  );
}
