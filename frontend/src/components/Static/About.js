// src/components/About.js
import React from "react";

export default function About() {
  return (
    <div
      className="py-5"
      style={{
        background: "linear-gradient(135deg, #e3f2fd, #bbdefb)",
        minHeight: "100vh",
      }}
    >
      <div className="container py-4">
        <div className="text-center mb-5">
          <h1 className="fw-bold text-primary">⚖️ About LawyerLink</h1>
          <p className="text-muted fs-5 mt-2">
            Empowering justice through technology and intelligent connections.
          </p>
        </div>

        <div className="row align-items-center g-5">
          <div className="col-md-6">
            <img
              src="https://img.freepik.com/free-vector/law-firm-concept-illustration_114360-10585.jpg?t=st=1730629400~exp=1730633000~hmac=a4b1e45a7b47d1c4d0f4c8af0ed07454c6b775efc6ac77c8f778f942b22b74a2&w=740"
              alt="LawyerLink Illustration"
              className="img-fluid rounded-4 shadow-lg"
            />
          </div>

          <div className="col-md-6">
            <div className="card border-0 shadow-lg p-4 rounded-4">
              <h3 className="text-primary mb-3">Who We Are</h3>
              <p className="text-muted">
                <strong>LawyerLink</strong> is a modern platform designed to
                bridge the gap between <strong>litigants</strong> and
                <strong> lawyers</strong>. Whether you’re looking for the right
                legal expert or managing client cases, LawyerLink provides an
                all-in-one solution.
              </p>

              <h4 className="text-success mt-4">Our Vision</h4>
              <p className="text-muted">
                To simplify access to justice by integrating
                <strong> AI-powered recommendations</strong>, case tracking, and
                communication into a single secure platform.
              </p>

              <ul className="list-unstyled mt-3">
                <li>✅ Smart lawyer recommendations</li>
                <li>✅ AI chatbot for legal assistance</li>
                <li>✅ Secure case management</li>
                <li>✅ Transparent client-lawyer communication</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center mt-5">
          <h5 className="text-muted">
            “Justice made accessible, digital, and intelligent.”
          </h5>
        </div>
      </div>
    </div>
  );
}
