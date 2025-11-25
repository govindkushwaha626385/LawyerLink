import React from "react";
import { FaFacebook, FaTwitter, FaLinkedin, FaGithub } from "react-icons/fa";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer mt-5">
      <div className="container py-4">
        <div className="row text-center text-md-start">
          <div className="col-md-4 mb-3">
            <h5 className="footer-brand">⚖️ LawyerLink</h5>
            <p className="text-muted small">
              Connecting litigants and lawyers seamlessly — your trusted
              platform for legal solutions.
            </p>
          </div>

          <div className="col-md-4 mb-3">
            <h6 className="fw-semibold text-dark">Quick Links</h6>
            <ul className="list-unstyled small">
              <li><a href="/" className="footer-link">Home</a></li>
              <li><a href="/catalog" className="footer-link">Find Lawyers</a></li>
              <li><a href="/chatbot" className="footer-link">AI Chatbot</a></li>
              <li><a href="/about" className="footer-link">About Us</a></li>
            </ul>
          </div>

          <div className="col-md-4 mb-3">
            <h6 className="fw-semibold text-dark">Connect With Us</h6>
            <div className="d-flex justify-content-center justify-content-md-start gap-3 mt-2">
              <a href="#" className="social-icon"><FaFacebook /></a>
              <a href="#" className="social-icon"><FaTwitter /></a>
              <a href="#" className="social-icon"><FaLinkedin /></a>
              <a href="#" className="social-icon"><FaGithub /></a>
            </div>
          </div>
        </div>

        <hr className="my-3" />
        <div className="text-center small text-muted">
          © {new Date().getFullYear()} <strong>LawyerLink</strong> — Built with ❤️ by Govind Singh Kushwaha
        </div>
      </div>
    </footer>
  );
}
