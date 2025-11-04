// src/components/Lawyer/LawyerDashboard.js
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import AddCaseModal from "./AddCaseModal";
import { Card, Button, Container, Row, Col, Badge } from "react-bootstrap";

export default function LawyerDashboard() {
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [advocateNumber, setAdvocateNumber] = useState("");
  const navigate = useNavigate();

  const user = auth.currentUser;

  // ✅ Fetch advocateNumber from "users" collection
  useEffect(() => {
    const fetchAdvocateNumber = async () => {
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setAdvocateNumber(userSnap.data().advocateNumber || "");
      }
    };
    fetchAdvocateNumber();
  }, [user]);

  // ✅ Fetch lawyer’s cases
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const q = query(collection(db, "cases"), where("lawyerId", "==", user.uid));
      const snapshot = await getDocs(q);
      const caseList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCases(caseList);

      // Get unique clients
      const uniqueClients = [
        ...new Map(caseList.map((item) => [item.clientEmail, item])).values(),
      ];
      setClients(uniqueClients);
    };

    fetchData();
  }, [user]);

  return (
    <Container fluid className="py-4 bg-light min-vh-100">
      {/* 🧑‍⚖️ Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-primary mb-3 mb-md-0">
          ⚖️ Lawyer Dashboard
        </h2>
        <Button
          variant="success"
          className="rounded-pill px-4 fw-semibold"
          onClick={() => setShowModal(true)}
        >
          ➕ Add New Case
        </Button>
      </div>

      {/* 📂 My Cases */}
      <Card className="border-0 shadow-sm rounded-4 mb-5">
        <Card.Body>
          <h4 className="fw-semibold text-dark mb-4">📁 My Cases</h4>

          {cases.length > 0 ? (
            <Row className="g-4">
              {cases.map((c) => (
                <Col key={c.id} md={4} sm={6} xs={12}>
                  <Card
                    className="shadow-sm border-0 rounded-4 h-100 lawyer-card"
                    onClick={() => navigate(`/case/${c.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <Card.Body>
                      <Card.Title className="fw-bold text-dark">
                        {c.title}
                      </Card.Title>
                      <Card.Text className="text-muted mb-1">
                        👤 {c.clientName}
                      </Card.Text>
                      <Card.Text className="small text-secondary mb-2">
                        📅 {c.date || "N/A"}
                      </Card.Text>
                      <Badge
                        bg={
                          c.status === "Closed"
                            ? "danger"
                            : c.status === "In Progress"
                            ? "warning"
                            : "info"
                        }
                        className="rounded-pill px-3 py-2"
                      >
                        {c.status}
                      </Badge>
                      <div className="mt-2 small text-muted">
                        🧾 Case ID: <strong>{c.id}</strong>
                      </div>
                      <div className="small text-muted">
                        🪪 Advocate No: <strong>{c.advocateNumber}</strong>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <p className="text-center text-muted mt-3">
              No cases yet. Add one to get started.
            </p>
          )}
        </Card.Body>
      </Card>

      {/* 👥 Clients */}
      <Card className="border-0 shadow-sm rounded-4">
        <Card.Body>
          <h4 className="fw-semibold text-dark mb-4">👥 My Clients</h4>
          {clients.length > 0 ? (
            <Row className="g-4">
              {clients.map((client, i) => (
                <Col key={i} md={4} sm={6} xs={12}>
                  <Card className="border-0 shadow-sm rounded-4 h-100 p-3">
                    <h6 className="fw-bold mb-1">{client.clientName}</h6>
                    <p className="text-muted small mb-2">{client.clientEmail}</p>
                    <div className="d-flex flex-wrap gap-2">
                      <a
                        href={`mailto:${client.clientEmail}`}
                        className="btn btn-outline-success btn-sm rounded-pill fw-semibold"
                      >
                        ✉️ Email
                      </a>
                      {client.clientPhone && (
                        <a
                          href={`tel:${client.clientPhone}`}
                          className="btn btn-outline-primary btn-sm rounded-pill fw-semibold"
                        >
                          📞 Call
                        </a>
                      )}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <p className="text-center text-muted">No clients found yet.</p>
          )}
        </Card.Body>
      </Card>

      {/* ➕ Add Case Modal */}
      {showModal && (
        <AddCaseModal
          advocateNumber={advocateNumber}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* 💅 Hover Animations */}
      <style>
        {`
          .lawyer-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            background: #fff;
          }
          .lawyer-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 30px rgba(0,0,0,0.1);
          }
        `}
      </style>
    </Container>
  );
}
