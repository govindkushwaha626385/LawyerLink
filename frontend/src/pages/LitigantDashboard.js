import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  // doc,
  // getDoc,
  // updateDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import { db, auth } from "../firebase";
import {
  Card,
  ProgressBar,
  Spinner,
  // Form,
  // Button,
  // Alert,
  Container,
} from "react-bootstrap";
import { useAuthState } from "react-firebase-hooks/auth";

export default function LitigantDashboard() {
  const [user] = useAuthState(auth);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  // const [caseId, setCaseId] = useState("");
  // const [advocateNumber, setAdvocateNumber] = useState("");
  // const [linkLoading, setLinkLoading] = useState(false);
  // const [message, setMessage] = useState({ type: "", text: "" });

  const navigate = useNavigate();

  // ✅ Fetch litigant's cases
  useEffect(() => {
    const fetchCases = async () => {
      if (!user?.email) return;

      try {
        const q = query(
          collection(db, "cases"),
          where("clientEmail", "==", user.email)
        );
        const querySnapshot = await getDocs(q);
        const caseList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCases(caseList);
      } catch (error) {
        console.error("Error fetching cases:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, [user]);

  // ✅ Link existing case using Case ID and Advocate Number
  // const handleLinkCase = async (e) => {
  //   e.preventDefault();
  //   if (!user) {
  //     setMessage({ type: "danger", text: "Please log in first." });
  //     return;
  //   }

  //   try {
  //     // setLinkLoading(true);
  //     // setMessage({ type: "", text: "" });

  //     const caseRef = doc(db, "cases", caseId);
  //     const caseSnap = await getDoc(caseRef);

  //     if (!caseSnap.exists()) {
  //       setMessage({ type: "danger", text: "❌ Case not found. Check Case ID." });
  //       return;
  //     }

  //     const caseData = caseSnap.data();

  //     if (caseData.clientEmail) {
  //       setMessage({
  //         type: "danger",
  //         text: "⚠️ This case is already linked to another litigant.",
  //       });
  //       return;
  //     }

  //     if (caseData.advocateNumber !== advocateNumber) {
  //       setMessage({
  //         type: "danger",
  //         text: "❌ Advocate Number does not match this case.",
  //       });
  //       return;
  //     }

  //     // ✅ Link litigant details to case
  //     await updateDoc(caseRef, {
  //       clientEmail: user.email,
  //       clientName: user.displayName || "Litigant",
  //       litigantId: user.uid,
  //       linkedAt: new Date().toISOString(),
  //     });

  //     setMessage({
  //       type: "success",
  //       text: "✅ Case successfully linked to your dashboard!",
  //     });

  //     // Refresh case list
  //     const q = query(
  //       collection(db, "cases"),
  //       where("clientEmail", "==", user.email)
  //     );
  //     const querySnapshot = await getDocs(q);
  //     setCases(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

  //     setCaseId("");
  //     setAdvocateNumber("");
  //   } catch (error) {
  //     console.error("Error linking case:", error);
  //     setMessage({ type: "danger", text: "❌ Failed to link case. Try again." });
  //   } finally {
  //     setLinkLoading(false);
  //   }
  // };

  // ✅ Loading states
  if (!user)
    return (
      <div className="d-flex flex-column justify-content-center align-items-center vh-100 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading user data...</p>
      </div>
    );

  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="primary" />
      </div>
    );

  // ✅ Render UI
  return (
    <Container className="mt-5">
      <h2 className="text-center mb-4 fw-bold">📜 My Cases</h2>

      {/* ✅ CASE LINKING FORM */}
      {/* <Card
        className="shadow-sm border-0 rounded-4 p-4 mx-auto mb-5"
        style={{ maxWidth: "500px" }}
      >
        <h5 className="fw-bold mb-3 text-primary text-center">
          🔗 Link Existing Case
        </h5>

        {message.text && <Alert variant={message.type}>{message.text}</Alert>}

        <Form onSubmit={handleLinkCase}>
          <Form.Group className="mb-3">
            <Form.Label>Case ID</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter Case ID shared by lawyer"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value.trim())}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Advocate Number</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter Advocate Number"
              value={advocateNumber}
              onChange={(e) => setAdvocateNumber(e.target.value.trim())}
              required
            />
          </Form.Group>

          <Button
            type="submit"
            variant="primary"
            className="w-100 rounded-pill py-2"
            disabled={linkLoading}
          >
            {linkLoading ? "Linking..." : "Link Case"}
          </Button>
        </Form>
      </Card> */}

      {/* ✅ CASES LIST */}
      {cases.length === 0 ? (
        <div className="text-center text-muted fs-5">
          <p>You have no active cases linked yet.</p>
        </div>
      ) : (
        <div className="row">
          {cases.map((c) => (
            <div key={c.id} className="col-md-6 col-lg-4 mb-4">
              <Card className="shadow-sm border-0 rounded-4">
                <Card.Body>
                  <Card.Title className="fw-bold text-primary">
                    {c.title || "Untitled Case"}
                  </Card.Title>
                  <Card.Subtitle className="mb-2 text-muted">
                    Case ID: {c.case_id}
                  </Card.Subtitle>

                  <p className="mb-1">
                    <strong>Category:</strong> {c.category || "Not specified"}
                  </p>
                  <p className="mb-1">
                    <strong>Advocate Number:</strong> {c.advocateNumber || "N/A"}
                  </p>
                  <p className="mb-1">
                    <strong>Status:</strong> {c.status || "Pending"}
                  </p>

                  <div
                    className="p-3 rounded-3 shadow-sm mt-2"
                    style={{
                      backgroundColor: "#e8f0fe",
                      fontWeight: "700",
                      color: "#0d47a1",
                      borderLeft: "5px solid #0d47a1",
                    }}
                  >
                    🪪 Next Hearing Date: <span className="text-dark">{c.next_hearing_date}</span>
                  </div>

                  <ProgressBar
                    now={c.progress || 40}
                    label={`${c.progress || 40}%`}
                    className="rounded-pill"
                  />

                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <button
                      className="btn btn-outline-primary btn-sm rounded-pill px-3"
                      onClick={() => navigate(`/litigant/case/${c.id}`)}
                    >
                      View Details
                    </button>
                    <span className="badge bg-success px-3 py-2 rounded-pill">
                      {c.stage || "In Progress"}
                    </span>
                  </div>
                </Card.Body>
              </Card>
            </div>
          ))}
        </div>
      )}
    </Container>
  );
}
