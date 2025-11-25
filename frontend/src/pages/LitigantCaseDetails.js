import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Card, Spinner, Container, Button, ProgressBar } from "react-bootstrap";

export default function LitigantCaseDetails() {
    const { id } = useParams(); // case ID from URL
    const [caseData, setCaseData] = useState(null);
    const [lawyerData, setLawyerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCaseAndLawyer = async () => {
            try {
                // Fetch case data
                const caseRef = doc(db, "cases", id);
                const caseSnap = await getDoc(caseRef);

                if (caseSnap.exists()) {
                    const caseInfo = caseSnap.data();
                    setCaseData(caseInfo);

                    // ✅ Fetch lawyer details using lawyerId
                    if (caseInfo.lawyerId) {
                        const lawyerRef = doc(db, "users", caseInfo.lawyerId);
                        const lawyerSnap = await getDoc(lawyerRef);
                        if (lawyerSnap.exists()) {
                            setLawyerData(lawyerSnap.data());
                        }
                    }
                } else {
                    setCaseData(null);
                }
            } catch (err) {
                console.error("Error fetching case or lawyer:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCaseAndLawyer();
    }, [id]);

    if (loading)
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <Spinner animation="border" variant="primary" />
            </div>
        );

    if (!caseData)
        return (
            <Container className="text-center mt-5">
                <h4 className="text-danger">⚠️ Case not found.</h4>
                <Button onClick={() => navigate(-1)} className="mt-3">
                    Go Back
                </Button>
            </Container>
        );

    return (
        <Container className="py-5">
            <Button
                variant="secondary"
                className="mb-4 rounded-pill"
                onClick={() => navigate(-1)}
            >
                ⬅️ Back
            </Button>

            <Card className="shadow-lg border-0 rounded-4 p-4">
                <Card.Title className="fw-bold text-primary mb-3">
                    {caseData.title || "Untitled Case"}
                </Card.Title>

                <Card.Subtitle className="text-muted mb-3">
                    Case ID: {caseData.case_id || id}
                </Card.Subtitle>

                <p><strong>Category:</strong> {caseData.category || "N/A"}</p>
                <p><strong>Status:</strong> {caseData.status || "Pending"}</p>
                <p><strong>Stage:</strong> {caseData.stage || "In Progress"}</p>
                <p><strong>Description:</strong> {caseData.description || "No details provided."}</p>

                <div
                    className="p-3 rounded-3 shadow-sm mt-2"
                    style={{
                        backgroundColor: "#e8f0fe",
                        fontWeight: "700",
                        color: "#0d47a1",
                        borderLeft: "5px solid #0d47a1",
                    }}
                >
                    🪪 Next Hearing Date: <span className="text-dark">{caseData.next_hearing_date}</span>
                </div>

                <hr />

                <p><strong>Advocate Name:</strong> {lawyerData?.fullName || lawyerData?.displayName || lawyerData?.name || "N/A"}</p>
                <p><strong>Advocate Number:</strong> {caseData.advocateNumber || "N/A"}</p>
                <p><strong>Advocate Email:</strong> {lawyerData?.email || caseData.lawyerEmail || "N/A"}</p>

                <hr />

                <p><strong>Client Name:</strong> {caseData.clientName || "N/A"}</p>
                <p>
                    <strong>Linked On:</strong>{" "}
                    {caseData.createdAt
                        ? new Date(
                            caseData.createdAt.seconds
                                ? caseData.createdAt.seconds * 1000
                                : caseData.createdAt
                        ).toLocaleString()
                        : "N/A"}
                </p>

                {/* <div className="mt-4">
                    <ProgressBar
                        now={caseData.progress || 40}
                        label={`${caseData.progress || 40}%`}
                        className="rounded-pill"
                    />
                </div> */}
            </Card>
        </Container>
    );
}
