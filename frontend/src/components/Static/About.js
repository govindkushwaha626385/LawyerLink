// src/components/About.js
import React from "react";

export default function About() {
  return (
    <div
      className="py-5"
      style={{
        background: "linear-gradient(135deg, #e8f0fe, #ffffff)",
        minHeight: "100vh",
      }}
    >
      <div className="container py-5">
        {/* Header Section */}
        <div className="text-center mb-5">
          <h1
            className="fw-bold text-primary"
            style={{ fontFamily: "Poppins, sans-serif", letterSpacing: "1px" }}
          >
            ⚖️ About <span className="text-dark">LawyerLink</span>
          </h1>
          <p
            className="text-secondary fs-5 mt-3"
            style={{ maxWidth: "700px", margin: "0 auto" }}
          >
            Empowering justice through technology, AI, and intelligent legal
            connections. Your trusted digital partner for all legal needs.
          </p>
        </div>

        {/* Main Content */}
        <div className="row align-items-center justify-content-center g-5">
          {/* Image Section */}
          <div className="col-lg-6 col-md-10">
            <div
              className="position-relative"
              style={{
                overflow: "hidden",
                borderRadius: "1rem",   
              }}
            >
              <img
                src="frontend/src/images/law.jpg"
                alt="Law and justice illustration"
                className="img-fluid shadow-lg"
                style={{
                  transform: "scale(1)",
                  transition: "transform 0.4s ease-in-out",
                  borderRadius: "1rem",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow = "0 10px 20px rgba(0, 0, 0, 0.3)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.1)";
                }}

              />
            </div>

          </div>

          {/* Text Section */}
          <div className="col-lg-6 col-md-10">
            <div
              className="card border-0 shadow-lg rounded-4 p-4 p-md-5"
              style={{
                backgroundColor: "#ffffff",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
              }}
            >
              <h3 className="text-primary fw-semibold mb-3">Who We Are</h3>
              <p className="text-muted lh-lg">
                <strong>LawyerLink</strong> bridges the gap between{" "}
                <strong>litigants</strong> and <strong>lawyers</strong> using
                technology and trust. Our mission is to make legal help
                accessible, transparent, and intelligent for everyone.
              </p>

              <h4 className="text-success mt-4 fw-semibold">Our Vision</h4>
              <p className="text-muted lh-lg">
                We aim to simplify access to justice with{" "}
                <strong>AI-powered recommendations</strong>, seamless{" "}
                <strong>case management</strong>, and secure{" "}
                <strong>communication tools</strong> — all in one place.
              </p>

              <ul className="list-unstyled mt-3 text-muted">
                <li className="mb-2">✅ Smart lawyer recommendations</li>
                <li className="mb-2">✅ AI chatbot for instant assistance</li>
                <li className="mb-2">✅ Secure case management system</li>
                <li>✅ Transparent client-lawyer communication</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quote Section */}
        <div className="text-center mt-5">
          <blockquote
            className="fst-italic text-secondary"
            style={{
              fontSize: "1.25rem",
              maxWidth: "600px",
              margin: "0 auto",
              fontFamily: "Lora, serif",
            }}
          >
            “Justice made accessible, digital, and intelligent.”
          </blockquote>
        </div>
      </div>
    </div>
  );
}
