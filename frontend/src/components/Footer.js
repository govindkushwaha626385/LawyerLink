import React from "react";
import { Link } from "react-router-dom";
import { FaFacebook, FaTwitter, FaLinkedin, FaGithub } from "react-icons/fa";

export default function Footer() {
  const quickLinks = [
    { label: "Home", href: "/" },
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
  ];

  const featuresLinks = [
    { label: "Lawyer Catalog", href: "/catalog" },
    { label: "AI Legal Chatbot", href: "/chatbot" },
    { label: "Smart Lawyer Match", href: "/smart-match" },
    { label: "AI Doc Analyzer", href: "/document-analyzer" },
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
          padding: 60px 0 0; font-family: 'Inter', sans-serif;
          margin-top: auto; border-top: 1px solid rgba(255,255,255,0.05);
          position: relative; overflow: hidden;
        }
        .ft-footer::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent);
        }
        .ft-container { max-width: 1150px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 1; }
        .ft-grid { display: grid; grid-template-columns: 2fr 1fr 1.2fr 1.2fr; gap: 40px; padding-bottom: 50px; }
        @media (max-width: 992px) { .ft-grid { grid-template-columns: 1fr 1fr; gap: 40px; } }
        @media (max-width: 576px) { .ft-grid { grid-template-columns: 1fr; gap: 32px; } }

        /* Brand col */
        .ft-brand { font-family: 'Playfair Display', serif; font-size: 1.5rem; font-weight: 800; color: white; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; letter-spacing: 0.5px; }
        .ft-brand-dot { display: inline-block; width: 6px; height: 6px; background: #c9a84c; border-radius: 50%; margin-bottom: 12px; box-shadow: 0 0 10px rgba(201,168,76,0.8); }
        .ft-tagline { font-size: 0.85rem; color: rgba(255,255,255,0.55); line-height: 1.8; max-width: 280px; margin-bottom: 24px; }
        .ft-socials { display: flex; gap: 12px; }
        .ft-social-btn {
          width: 40px; height: 40px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.6); font-size: 1rem;
          cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); text-decoration: none;
        }
        .ft-social-btn:hover { background: linear-gradient(135deg, #c9a84c, #e8c96d); color: #1a2744; border-color: transparent; transform: translateY(-4px); box-shadow: 0 8px 20px rgba(201,168,76,0.35); }

        /* Col headers */
        .ft-col-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1.8px; color: #c9a84c; font-weight: 700; margin-bottom: 20px; }

        /* Quick links */
        .ft-links { list-style: none; padding: 0; margin: 0; }
        .ft-link-item { margin-bottom: 12px; }
        .ft-link {
          color: rgba(255,255,255,0.5); font-size: 0.85rem; text-decoration: none;
          transition: all 0.25s ease; display: inline-flex; align-items: center; gap: 8px;
        }
        .ft-link::before { content: ''; display: block; width: 0; height: 1.5px; background: #c9a84c; transition: width 0.25s ease; }
        .ft-link:hover { color: #ffffff; padding-left: 6px; }
        .ft-link:hover::before { width: 14px; }

        /* Contact col */
        .ft-contact-item { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
        .ft-contact-icon { font-size: 0.95rem; margin-top: 2px; flex-shrink: 0; color: rgba(255,255,255,0.8); }
        .ft-contact-text { font-size: 0.85rem; color: rgba(255,255,255,0.5); line-height: 1.6; }
        .ft-contact-text a { color: rgba(255,255,255,0.5); text-decoration: none; transition: color 0.2s; }
        .ft-contact-text a:hover { color: #c9a84c; }

        /* Bottom bar */
        .ft-bottom { border-top: 1px solid rgba(255,255,255,0.06); padding: 22px 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; background: rgba(0,0,0,0.15); }
        .ft-copy { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0; }
        .ft-copy strong { color: rgba(255,255,255,0.6); font-weight: 600; }
        .ft-copy span { color: #c9a84c; font-size: 0.9rem; }
        .ft-policy-links { display: flex; gap: 24px; }
        .ft-policy-link { font-size: 0.78rem; color: rgba(255,255,255,0.35); text-decoration: none; transition: color 0.2s; }
        .ft-policy-link:hover { color: #c9a84c; }
      `}</style>

      <footer className="ft-footer">
        <div className="ft-container">
          <div className="ft-grid">
            {/* Brand */}
            <div>
              <div className="ft-brand">⚖️ LawyerLink <span className="ft-brand-dot" /></div>
              <p className="ft-tagline">
                Connecting litigants and lawyers seamlessly. Your trusted platform for accessible, intelligent, and secure legal solutions.
              </p>
              <div className="ft-socials">
                {socialLinks.map((s, i) => (
                  <a key={i} href={s.href} className="ft-social-btn" aria-label={s.label}>{s.icon}</a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <p className="ft-col-title">Company</p>
              <ul className="ft-links">
                {quickLinks.map((link, i) => (
                  <li key={i} className="ft-link-item">
                    <Link to={link.href} className="ft-link">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Features Links */}
            <div>
              <p className="ft-col-title">Platform Features</p>
              <ul className="ft-links">
                {featuresLinks.map((link, i) => (
                  <li key={i} className="ft-link-item">
                    <Link to={link.href} className="ft-link">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="ft-col-title">Get in Touch</p>
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
                <p className="ft-contact-text">LawyerLink Pvt. Ltd.,<br/>Tech Park, Sagar, MP, India</p>
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
            <Link to="/privacy" className="ft-policy-link">Privacy Policy</Link>
            <Link to="/terms" className="ft-policy-link">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
