import React, { useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import { Alert, Button, Form, Card, Spinner } from "react-bootstrap";

export default function LinkCase() {
  const [user] = useAuthState(auth);
  const [caseId, setCaseId] = useState("");
  const [advocateNumber, setAdvocateNumber] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddCase = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    if (!user) {
      setError("You must be logged in to add a case.");
      setLoading(false);
      return;
    }

    try {
      const caseRef = doc(db, "cases", caseId);
      const caseSnap = await getDoc(caseRef);

      if (!caseSnap.exists()) {
        setError("❌ No case found with this Case ID.");
        setLoading(false);
        return;
      }

      const caseData = caseSnap.data();

      // Match using advocateNumber instead of lawyerId
      if (caseData.advocateNumber !== advocateNumber) {
        setError("⚠️ Advocate Number does not match this case.");
        setLoading(false);
        return;
      }

      // Update the case with litigant details
      await updateDoc(caseRef, {
        clientEmail: user.email,
        clientName: user.displayName || "Client",
      });

      setMessage("✅ Case successfully linked to your dashboard!");
      setCaseId("");
      setAdvocateNumber("");
    } catch (err) {
      setError("Error adding case: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5 d-flex justify-content-center">
      <Card className="shadow-lg p-4" style={{ maxWidth: "500px", width: "100%" }}>
        <h3 className="text-center mb-3 fw-bold text-primary">
          Link Your Case
        </h3>
        <p className="text-center text-muted mb-4">
          Enter your Case ID and Advocate Number to link your case.
        </p>

        {error && <Alert variant="danger">{error}</Alert>}
        {message && <Alert variant="success">{message}</Alert>}

        <Form onSubmit={handleAddCase}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Case ID</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter your Case ID"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold">Advocate Number</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter Advocate Number"
              value={advocateNumber}
              onChange={(e) => setAdvocateNumber(e.target.value)}
              required
            />
          </Form.Group>

          <Button
            variant="primary"
            type="submit"
            className="w-100 fw-semibold"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" /> Linking...
              </>
            ) : (
              "🔗 Link Case"
            )}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
