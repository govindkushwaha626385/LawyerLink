import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { Spinner, Badge } from "react-bootstrap";

export default function MyClients({ advocateNumber }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const q = query(collection(db, "cases"), where("advocateNumber", "==", advocateNumber));
        const snapshot = await getDocs(q);

        const clientList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Keep only unique clients by their email
        const uniqueClients = [
          ...new Map(clientList.map((c) => [c.clientEmail, c])).values(),
        ];

        setClients(uniqueClients);
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setLoading(false);
      }
    };

    if (advocateNumber) fetchClients();
  }, [advocateNumber]);

  if (loading)
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" /> <p>Loading clients...</p>
      </div>
    );

  return (
    <div className="container py-5">
      <h3 className="fw-bold mb-4 text-primary text-center">👥 My Clients</h3>

      {clients.length === 0 ? (
        <div className="alert alert-info text-center rounded-4 shadow-sm">
          No clients found yet.
        </div>
      ) : (
        <div className="row g-4">
          {clients.map((client) => (
            <div key={client.id} className="col-lg-4 col-md-6 col-12">
              <div className="card border-0 shadow-lg rounded-4 text-center hover-scale h-100">
                <div className="card-body p-4">
                  <img
                    src={
                      client.clientImage ||
                      "https://cdn-icons-png.flaticon.com/512/4140/4140048.png"
                    }
                    alt={client.clientName}
                    className="rounded-circle mb-3 shadow-sm"
                    style={{
                      width: "90px",
                      height: "90px",
                      objectFit: "cover",
                    }}
                  />

                  <h5 className="fw-semibold text-dark">
                    {client.clientName || "Unnamed Client"}
                  </h5>

                  <p className="text-muted small mb-2">{client.clientEmail}</p>

                  <p className="small text-secondary mb-2">
                    <strong>Case:</strong> {client.title || "N/A"}
                  </p>

                  <Badge
                    bg={
                      client.status === "Closed"
                        ? "secondary"
                        : client.status === "In Progress"
                        ? "warning"
                        : "success"
                    }
                    text={client.status === "In Progress" ? "dark" : "light"}
                    className="mb-3"
                  >
                    {client.status || "Pending"}
                  </Badge>

                  <div className="d-flex justify-content-center gap-2">
                    <a
                      href={`mailto:${client.clientEmail}`}
                      className="btn btn-outline-primary btn-sm rounded-pill"
                    >
                      ✉️ Email
                    </a>

                    {client.clientPhone && (
                      <a
                        href={`tel:${client.clientPhone}`}
                        className="btn btn-outline-success btn-sm rounded-pill"
                      >
                        📞 Call
                      </a>
                    )}
                  </div>
                </div>

                <div className="card-footer bg-light border-0 text-center">
                  <small className="text-muted">
                    📅 Last Case: {client.createdAt
                      ? new Date(client.createdAt.seconds * 1000).toLocaleDateString()
                      : "N/A"}
                  </small>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inline Styles */}
      <style>{`
        .hover-scale {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .hover-scale:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}
