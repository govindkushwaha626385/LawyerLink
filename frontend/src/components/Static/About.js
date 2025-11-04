// ✅ src/components/About.js
import React from "react";
import lawImage from "../../images/law.jpg"; // ✅ Correct way to import

export default function About() {
  return (
    <div
      className="py-5"
      style={{
        background: "linear-gradient(135deg, #f0f4ff 0%, #ffffff 100%)",
        minHeight: "100vh",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <div className="container py-5">
        {/* 🌟 Header */}
        <div className="text-center mb-5">
          <h1 className="fw-bold text-primary display-5">
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

        {/* 💡 Main Section */}
        <div className="row align-items-center justify-content-center g-5">
          {/* 🖼️ Image */}
          <div className="col-lg-6 col-md-10 text-center">
            <div
              className="shadow-lg overflow-hidden rounded-4 position-relative"
              style={{
                transition: "transform 0.6s ease",
                border: "4px solid #e3f2fd",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.03)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              <img
                src={lawImage}
                alt="Law and Justice"
                className="img-fluid"
                style={{
                  borderRadius: "1rem",
                  width: "100%",
                  height: "auto",
                }}
              />
            </div>
          </div>

          {/* 🧾 Text */}
          <div className="col-lg-6 col-md-10">
            <div
              className="card border-0 shadow-lg rounded-4 p-4 p-md-5"
              style={{
                background:
                  "linear-gradient(135deg, rgba(227,242,253,0.7), #ffffff)",
                backdropFilter: "blur(10px)",
                transition: "0.3s all ease",
              }}
            >
              <h3 className="text-primary fw-bold mb-3">Who We Are</h3>
              <p className="text-muted lh-lg">
                <strong>LawyerLink</strong> bridges the gap between{" "}
                <strong>litigants</strong> and <strong>lawyers</strong> using
                modern technology and trust. Our mission is to make legal help
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

        {/* 🕊️ Quote */}
        <div className="text-center mt-5">
          <blockquote
            className="fst-italic text-secondary"
            style={{
              fontSize: "1.3rem",
              maxWidth: "600px",
              margin: "0 auto",
              fontFamily: "Lora, serif",
              borderLeft: "4px solid #0d47a1",
              paddingLeft: "1rem",
            }}
          >
            “Justice made accessible, digital, and intelligent.”
          </blockquote>
        </div>
      </div>
    </div>
  );
}
