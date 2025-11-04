// src/components/Contact.js
import React from "react";

export default function Contact() {
  return (
    <div
      className="py-5"
      style={{
        background: "linear-gradient(135deg, #bbdefb, #e3f2fd)",
        minHeight: "100vh",
      }}
    >
      <div className="container py-4">
        <div className="text-center mb-5">
          <h1 className="fw-bold text-primary">📞 Contact Us</h1>
          <p className="text-muted fs-5">
            Have a question or need help? We’d love to hear from you.
          </p>
        </div>

        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card shadow-lg p-4 border-0 rounded-4">
              <h4 className="text-primary mb-3">Get in Touch</h4>
              <p className="text-muted mb-4">
                Reach out via email, phone, or social media — our team is always
                ready to assist you.
              </p>

              <ul className="list-unstyled">
                <li className="mb-3">
                  <strong>Email:</strong> govindkushwahabusiness@gmail.com
                </li>
                <li className="mb-3">
                  <strong>Phone:</strong> +91 6263859670
                </li>
                <li className="mb-3">
                  <strong>Address:</strong> Sagar, Madhya Pradesh, India
                </li>
              </ul>

              <div className="mt-4">
                <h5 className="text-success">Follow Us</h5>
                <div className="d-flex gap-3 mt-3">
                  <a
                    href="#"
                    className="btn btn-outline-primary btn-sm rounded-circle"
                  >
                    <i className="bi bi-facebook"></i>
                  </a>
                  <a
                    href="#"
                    className="btn btn-outline-info btn-sm rounded-circle"
                  >
                    <i className="bi bi-twitter"></i>
                  </a>
                  <a
                    href="#"
                    className="btn btn-outline-danger btn-sm rounded-circle"
                  >
                    <i className="bi bi-instagram"></i>
                  </a>
                  <a
                    href="#"
                    className="btn btn-outline-dark btn-sm rounded-circle"
                  >
                    <i className="bi bi-linkedin"></i>
                  </a>
                </div>
              </div>
            </div>

            <div className="text-center mt-5">
              <p className="text-muted small">
                © {new Date().getFullYear()} LawyerLink — Empowering Legal
                Access through Technology.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
