import React from "react";
import { Link } from "react-router-dom";
import { FaFacebook, FaTwitter, FaLinkedin, FaGithub } from "react-icons/fa";

export default function Footer() {
  const quickLinks = [
    { label: "Home", href: "/" },
    { label: "Find Lawyers", href: "/catalog" },
    { label: "AI Chatbot", href: "/chatbot" },
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  const socialLinks = [
    { icon: <FaFacebook />, href: "#", label: "Facebook" },
    { icon: <FaTwitter />, href: "#", label: "Twitter" },
    { icon: <FaLinkedin />, href: "#", label: "LinkedIn" },
    { icon: <FaGithub />, href: "#", label: "GitHub" },
  ];

  return (
    <>
      <style>{`
        .ft-footer {
          background: linear-gradient(180deg, #111b33 0%, #0d1528 100%);
          padding: 52px 0 0; font-family: 'Inter', sans-serif;
          margin-top: auto; border-top: 1px solid rgba(255,255,255,0.05);
        }
        .ft-container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        .ft-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 48px; padding-bottom: 40px; }
        @media (max-width: 768px) { .ft-grid { grid-template-columns: 1fr 1fr; gap: 32px; } }
        @media (max-width: 480px) { .ft-grid { grid-template-columns: 1fr; } }

        /* Brand col */
        .ft-brand { font-family: 'Playfair Display', serif; font-size: 1.4rem; font-weight: 800; color: white; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .ft-brand-dot { display: inline-block; width: 6px; height: 6px; background: #c9a84c; border-radius: 50%; margin-bottom: 12px; }
        .ft-tagline { font-size: 0.83rem; color: rgba(255,255,255,0.45); line-height: 1.7; max-width: 260px; margin-bottom: 22px; }
        .ft-socials { display: flex; gap: 10px; }
        .ft-social-btn {
          width: 38px; height: 38px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.5); font-size: 0.95rem;
          cursor: pointer; transition: all 0.25s ease; text-decoration: none;
        }
        .ft-social-btn:hover { background: #c9a84c; color: #1a2744; border-color: #c9a84c; transform: translateY(-3px); box-shadow: 0 6px 16px rgba(201,168,76,0.3); }

        /* Col headers */
        .ft-col-title { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1.5px; color: #c9a84c; font-weight: 700; margin-bottom: 18px; }

        /* Quick links */
        .ft-links { list-style: none; padding: 0; margin: 0; }
        .ft-link-item { margin-bottom: 10px; }
        .ft-link {
          color: rgba(255,255,255,0.45); font-size: 0.83rem; text-decoration: none;
          transition: all 0.2s ease; display: flex; align-items: center; gap: 6px;
        }
        .ft-link::before { content: ''; display: block; width: 0; height: 1px; background: #c9a84c; transition: width 0.2s ease; }
        .ft-link:hover { color: #c9a84c; padding-left: 8px; }
        .ft-link:hover::before { width: 12px; }

        /* Contact col */
        .ft-contact-item { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 13px; }
        .ft-contact-icon { font-size: 0.9rem; margin-top: 2px; flex-shrink: 0; }
        .ft-contact-text { font-size: 0.82rem; color: rgba(255,255,255,0.45); line-height: 1.5; }
        .ft-contact-text a { color: rgba(255,255,255,0.45); text-decoration: none; transition: color 0.2s; }
        .ft-contact-text a:hover { color: #c9a84c; }

        /* Bottom bar */
        .ft-bottom { border-top: 1px solid rgba(255,255,255,0.06); padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
        .ft-copy { font-size: 0.78rem; color: rgba(255,255,255,0.3); }
        .ft-copy strong { color: rgba(255,255,255,0.5); }
        .ft-copy span { color: #c9a84c; }
        .ft-policy-links { display: flex; gap: 18px; }
        .ft-policy-link { font-size: 0.75rem; color: rgba(255,255,255,0.25); text-decoration: none; transition: color 0.2s; }
        .ft-policy-link:hover { color: #c9a84c; }
      `}</style>

      <footer className="ft-footer">
        <div className="ft-container">
          <div className="ft-grid">
            {/* Brand */}
            <div>
              <div className="ft-brand">⚖️ LawyerLink <span className="ft-brand-dot" /></div>
              <p className="ft-tagline">
                Connecting litigants and lawyers seamlessly — your trusted platform for accessible, intelligent legal solutions.
              </p>
              <div className="ft-socials">
                {socialLinks.map((s, i) => (
                  <a key={i} href={s.href} className="ft-social-btn" aria-label={s.label}>{s.icon}</a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <p className="ft-col-title">Quick Links</p>
              <ul className="ft-links">
                {quickLinks.map((link, i) => (
                  <li key={i} className="ft-link-item">
                    <Link to={link.href} className="ft-link">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="ft-col-title">Contact Us</p>
              <div className="ft-contact-item">
                <span className="ft-contact-icon">✉️</span>
                <p className="ft-contact-text">
                  <a href="mailto:govindkushwahabusiness@gmail.com">govindkushwahabusiness@gmail.com</a>
                </p>
              </div>
              <div className="ft-contact-item">
                <span className="ft-contact-icon">📞</span>
                <p className="ft-contact-text"><a href="tel:+916263859670">+91 6263 859 670</a></p>
              </div>
              <div className="ft-contact-item">
                <span className="ft-contact-icon">📍</span>
                <p className="ft-contact-text">Sagar, Madhya Pradesh, India</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="ft-bottom">
          <p className="ft-copy">
            © {new Date().getFullYear()} <strong>LawyerLink</strong> — Built with <span>♥</span> by Govind Singh Kushwaha
          </p>
          <div className="ft-policy-links">
            <span className="ft-policy-link" style={{cursor:"default"}}>Privacy Policy</span>
            <span className="ft-policy-link" style={{cursor:"default"}}>Terms of Service</span>
          </div>
        </div>
      </footer>
    </>
  );
}
