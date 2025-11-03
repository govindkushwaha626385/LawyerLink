import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";

export default function MyClients({ lawyerId }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const q = query(collection(db, "cases"), where("lawyerId", "==", lawyerId));
        const snapshot = await getDocs(q);

        const clientList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filter unique clients by email
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

    fetchClients();
  }, [lawyerId]);

  if (loading) return <div className="text-center mt-5">Loading clients...</div>;

  return (
    <div className="container py-5">
      <h3 className="fw-bold mb-4 text-primary">👥 My Clients</h3>

      {clients.length === 0 ? (
        <div className="alert alert-info text-center">No clients found.</div>
      ) : (
        <div className="row">
          {clients.map((client) => (
            <div key={client.id} className="col-md-4 col-sm-6 col-12 mb-4">
              <div className="card border-0 shadow-sm rounded-4 h-100 lawyer-card">
                <div className="card-body text-center p-4">
                  <img
                    src={
                      client.clientImage ||
                      "https://cdn-icons-png.flaticon.com/512/4140/4140048.png"
                    }
                    alt={client.clientName}
                    className="rounded-circle mb-3"
                    style={{ width: "80px", height: "80px", objectFit: "cover" }}
                  />
                  <h5 className="fw-semibold">{client.clientName}</h5>
                  <p className="text-muted small mb-2">{client.clientEmail}</p>
                  <p className="text-secondary small mb-3">
                    Case: {client.title || "N/A"}
                  </p>
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
                    Last Case: {client.status || "Pending"}
                  </small>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
