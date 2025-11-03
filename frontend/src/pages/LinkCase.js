import React, { useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import { Alert, Button, Form } from "react-bootstrap";

export default function LinkCase() {
  const [user] = useAuthState(auth);
  const [caseId, setCaseId] = useState("");
  const [lawyerId, setLawyerId] = useState("");
  const [message, setMessage] = useState(""); 
  const [error, setError] = useState("");

  const handleAddCase = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!user) {
      setError("You must be logged in to add a case.");
      return;
    }

    try {
      const caseRef = doc(db, "cases", caseId);
      const caseSnap = await getDoc(caseRef);

      if (!caseSnap.exists()) {
        setError("No case found with this Case ID.");
        return;
      }

      const caseData = caseSnap.data();

      if (caseData.lawyerId !== lawyerId) {
        setError("Lawyer ID does not match this case.");
        return;
      }

      // Update case with litigant (client) info
      await updateDoc(caseRef, {
        clientEmail: user.email,
        clientName: user.displayName || "Client",
      });

      setMessage("Case successfully added to your dashboard!");
      setCaseId("");
      setLawyerId("");
    } catch (err) {
      setError("Error adding case: " + err.message);
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: "500px" }}>
      <h3 className="text-center mb-4">Add Case by Case ID</h3>
      {error && <Alert variant="danger">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      <Form onSubmit={handleAddCase}>
        <Form.Group className="mb-3">
          <Form.Label>Case ID</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter Case ID"
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Lawyer ID</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter Lawyer ID"
            value={lawyerId}
            onChange={(e) => setLawyerId(e.target.value)}
            required
          />
        </Form.Group>

        <Button variant="primary" type="submit" className="w-100">
          Add Case
        </Button>
      </Form>
    </div>
  );
}