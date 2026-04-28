// src/components/Contact.js
import React, { useState } from "react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = (e) => {
    e.preventDefault();
    // In production connect to a backend/email service
    setSent(true);
    setTimeout(() => setSent(false), 4000);
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  const contactItems = [
    { icon: "✉️", label: "Email", value: "govindkushwahabusiness@gmail.com", href: "mailto:govindkushwahabusiness@gmail.com" },
    { icon: "📞", label: "Phone", value: "+91 6263 859 670", href: "tel:+916263859670" },
    { icon: "📍", label: "Location", value: "Sagar, Madhya Pradesh, India", href: null },
  ];

  return (
    <>
      <style>{`
        .ct-wrapper { min-height: 100vh; font-family: 'Inter', sans-serif; }

        /* Hero */
        .ct-hero {
          background: linear-gradient(-45deg, #0f1d3a, #1a2744, #243460, #1a3a5c);
          background-size: 400% 400%; animation: ctGrad 10s ease infinite;
          padding: 72px 20px 60px; text-align: center; position: relative; overflow: hidden;
        }
        @keyframes ctGrad { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .ct-orb { position: absolute; border-radius: 50%; filter: blur(100px); }
        .ct-orb1 { width: 350px; height: 350px; background: #c9a84c; opacity: 0.08; top: -80px; right: -80px; }
        .ct-orb2 { width: 280px; height: 280px; background: #3b82f6; opacity: 0.08; bottom: -60px; left: -60px; }
        .ct-hero-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(201,168,76,0.15); border: 1px solid rgba(201,168,76,0.3); color: #e8c96d; border-radius: 50px; padding: 5px 16px; font-size: 0.78rem; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 18px; }
        .ct-hero-title { font-family: 'Playfair Display', serif; font-size: clamp(1.9rem, 4vw, 2.8rem); font-weight: 800; color: white; margin-bottom: 12px; }
        .ct-hero-title span { color: #c9a84c; }
        .ct-hero-sub { font-size: 0.95rem; color: rgba(255,255,255,0.6); max-width: 480px; margin: 0 auto; line-height: 1.7; }

        /* Main */
        .ct-main { max-width: 1100px; margin: 0 auto; padding: 60px 20px 80px; display: grid; grid-template-columns: 1fr 1.4fr; gap: 40px; align-items: start; }
        @media (max-width: 768px) { .ct-main { grid-template-columns: 1fr; } }

        /* Left info */
        .ct-info-card { background: white; border-radius: 24px; padding: 36px 32px; box-shadow: 0 4px 24px rgba(26,39,68,0.08); border: 1px solid rgba(26,39,68,0.04); }
        .ct-info-title { font-family: 'Playfair Display', serif; font-size: 1.4rem; font-weight: 700; color: #1a2744; margin-bottom: 8px; }
        .ct-info-sub { font-size: 0.85rem; color: #6b7280; line-height: 1.65; margin-bottom: 28px; }
        .ct-contact-item { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 22px; }
        .ct-contact-icon { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #eef2ff, #e0e7ff); color: #1a2744; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; }
        .ct-contact-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; font-weight: 600; margin-bottom: 3px; }
        .ct-contact-value { font-size: 0.875rem; font-weight: 600; color: #1a2744; text-decoration: none; display: block; }
        .ct-contact-value:hover { color: #c9a84c; }

        .ct-divider { height: 1px; background: #f3f4f6; margin: 24px 0; }
        .ct-social-title { font-size: 0.8rem; font-weight: 700; color: #374151; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        .ct-socials { display: flex; gap: 10px; }
        .ct-social-btn {
          width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
          font-size: 1rem; border: 1.5px solid #e5e7eb; background: transparent;
          cursor: pointer; transition: all 0.2s; text-decoration: none; color: #374151;
        }
        .ct-social-btn:hover { background: #1a2744; color: white; border-color: #1a2744; transform: translateY(-2px); }

        /* Right form */
        .ct-form-card { background: white; border-radius: 24px; padding: 36px 32px; box-shadow: 0 4px 24px rgba(26,39,68,0.08); border: 1px solid rgba(26,39,68,0.04); }
        .ct-form-title { font-family: 'Playfair Display', serif; font-size: 1.4rem; font-weight: 700; color: #1a2744; margin-bottom: 6px; }
        .ct-form-sub { font-size: 0.83rem; color: #6b7280; margin-bottom: 26px; }
        .ct-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
        @media (max-width: 500px) { .ct-form-row { grid-template-columns: 1fr; } }
        .ct-field { margin-bottom: 14px; }
        .ct-label { display: block; font-size: 0.78rem; font-weight: 600; color: #374151; margin-bottom: 6px; letter-spacing: 0.2px; }
        .ct-input {
          display: block; width: 100%; border: 1.5px solid #e5e7eb; border-radius: 12px;
          padding: 10px 14px; font-family: 'Inter', sans-serif; font-size: 0.875rem;
          color: #1a2744; background: #fafafa; outline: none; transition: all 0.25s ease;
        }
        .ct-input:focus { border-color: #1a2744; background: white; box-shadow: 0 0 0 3px rgba(26,39,68,0.06); }
        .ct-input::placeholder { color: #9ca3af; }
        .ct-submit-btn {
          width: 100%; padding: 13px; border: none; border-radius: 50px;
          background: linear-gradient(135deg, #1a2744, #243460);
          color: white; font-family: 'Inter', sans-serif; font-size: 0.95rem; font-weight: 700;
          cursor: pointer; transition: all 0.25s ease; margin-top: 6px;
        }
        .ct-submit-btn:hover { box-shadow: 0 8px 24px rgba(26,39,68,0.3); transform: translateY(-1px); }
        .ct-success-banner {
          background: #d1fae5; border: 1px solid #6ee7b7; color: #065f46;
          border-radius: 12px; padding: 12px 16px; font-size: 0.85rem;
          font-weight: 600; text-align: center; margin-bottom: 18px;
          animation: fadeSlideUp 0.4s ease;
        }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div className="ct-wrapper">
        {/* Hero */}
        <div className="ct-hero">
          <div className="ct-orb ct-orb1" /><div className="ct-orb ct-orb2" />
          <div className="ct-hero-badge">📞 Contact Us</div>
          <h1 className="ct-hero-title">Get in <span>Touch</span></h1>
          <p className="ct-hero-sub">Have a question or need help? We'd love to hear from you. Reach out anytime.</p>
        </div>

        <div style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #f8f9fc 50%, #fdf8ee 100%)", minHeight: "60vh" }}>
          <div className="ct-main">
            {/* Info */}
            <div className="ct-info-card">
              <h3 className="ct-info-title">Contact Information</h3>
              <p className="ct-info-sub">Reach out via email, phone, or social media — our team is always ready to assist.</p>

              {contactItems.map((item, i) => (
                <div key={i} className="ct-contact-item">
                  <div className="ct-contact-icon">{item.icon}</div>
                  <div>
                    <p className="ct-contact-label">{item.label}</p>
                    {item.href ? (
                      <a href={item.href} className="ct-contact-value">{item.value}</a>
                    ) : (
                      <span className="ct-contact-value" style={{ cursor: "default" }}>{item.value}</span>
                    )}
                  </div>
                </div>
              ))}

              <div className="ct-divider" />
              <p className="ct-social-title">Follow Us</p>
              <div className="ct-socials">
                {["📘", "🐦", "📸", "💼"].map((icon, i) => (
                  <button key={i} className="ct-social-btn" type="button">{icon}</button>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="ct-form-card">
              <h3 className="ct-form-title">Send a Message</h3>
              <p className="ct-form-sub">Fill out the form and we'll get back to you shortly.</p>

              {sent && <div className="ct-success-banner">✅ Message sent! We'll get back to you soon.</div>}

              <form onSubmit={handleSubmit}>
                <div className="ct-form-row">
                  <div>
                    <label className="ct-label">Your Name</label>
                    <input className="ct-input" name="name" placeholder="John Doe" value={form.name} onChange={handleChange} required />
                  </div>
                  <div>
                    <label className="ct-label">Email Address</label>
                    <input className="ct-input" type="email" name="email" placeholder="your@email.com" value={form.email} onChange={handleChange} required />
                  </div>
                </div>
                <div className="ct-field">
                  <label className="ct-label">Subject</label>
                  <input className="ct-input" name="subject" placeholder="How can we help?" value={form.subject} onChange={handleChange} required />
                </div>
                <div className="ct-field">
                  <label className="ct-label">Message</label>
                  <textarea className="ct-input" name="message" rows="5" placeholder="Write your message here..." style={{ resize: "none" }} value={form.message} onChange={handleChange} required />
                </div>
                <button type="submit" className="ct-submit-btn">Send Message →</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
