import React from "react";
import { useNavigate } from "react-router-dom";

export default function ChooseUserType() {
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        .hero-wrapper {
          min-height: 100vh;
          background: linear-gradient(-45deg, #0f1d3a, #1a2744, #243460, #1a3a5c);
          background-size: 400% 400%;
          animation: gradBg 10s ease infinite;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          position: relative;
          overflow: hidden;
        }
        @keyframes gradBg {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .orb { position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.12; }
        .orb-1 { width: 500px; height: 500px; background: #c9a84c; top: -150px; right: -150px; animation: orbF 8s ease-in-out infinite; }
        .orb-2 { width: 350px; height: 350px; background: #3b82f6; bottom: -100px; left: -100px; animation: orbF 8s 3s ease-in-out infinite; }
        .orb-3 { width: 200px; height: 200px; background: #c9a84c; top: 50%; left: 20%; animation: orbF 8s 5s ease-in-out infinite; }
        @keyframes orbF { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-40px) scale(1.08); } }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(201,168,76,0.15);
          border: 1px solid rgba(201,168,76,0.35);
          color: #e8c96d;
          border-radius: 50px;
          padding: 6px 16px;
          font-family: 'Inter', sans-serif;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 20px;
          animation: fadeSlideUp 0.6s ease both;
        }
        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.4rem, 5vw, 3.8rem);
          font-weight: 800;
          color: white;
          line-height: 1.15;
          text-align: center;
          margin-bottom: 16px;
          animation: fadeSlideUp 0.6s 0.1s ease both;
          max-width: 720px;
        }
        .hero-title span { color: #c9a84c; }
        .hero-subtitle {
          font-family: 'Inter', sans-serif;
          font-size: 1.05rem;
          color: rgba(255,255,255,0.65);
          text-align: center;
          margin-bottom: 56px;
          max-width: 520px;
          line-height: 1.7;
          animation: fadeSlideUp 0.6s 0.2s ease both;
        }
        .hero-cards {
          display: flex;
          gap: 28px;
          flex-wrap: wrap;
          justify-content: center;
          animation: fadeSlideUp 0.6s 0.3s ease both;
          width: 100%;
          max-width: 880px;
        }
        .hero-card {
          flex: 1;
          min-width: 280px;
          max-width: 380px;
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 24px;
          padding: 40px 36px;
          cursor: pointer;
          transition: all 0.35s cubic-bezier(0.4,0,0.2,1);
          position: relative;
          overflow: hidden;
          text-align: center;
        }
        .hero-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #c9a84c, #e8c96d);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .hero-card:hover {
          background: rgba(255,255,255,0.10);
          border-color: rgba(201,168,76,0.4);
          transform: translateY(-10px);
          box-shadow: 0 24px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,168,76,0.2);
        }
        .hero-card:hover::before { opacity: 1; }
        .card-icon {
          width: 72px; height: 72px;
          border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          font-size: 2rem;
          margin: 0 auto 24px;
          transition: transform 0.3s ease;
        }
        .hero-card:hover .card-icon { transform: scale(1.1) rotate(-3deg); }
        .litigant-icon { background: rgba(201,168,76,0.15); border: 1px solid rgba(201,168,76,0.3); }
        .lawyer-icon  { background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3); }
        .card-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          margin-bottom: 12px;
        }
        .card-desc {
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          color: rgba(255,255,255,0.6);
          line-height: 1.6;
          margin-bottom: 28px;
        }
        .card-features {
          text-align: left;
          margin-bottom: 28px;
        }
        .card-feature-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 0.8rem;
          color: rgba(255,255,255,0.7);
          margin-bottom: 8px;
        }
        .card-feature-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #c9a84c; flex-shrink: 0;
        }
        .card-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px 24px;
          border-radius: 50px;
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 0.875rem;
          border: none;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .cta-gold {
          background: linear-gradient(135deg, #c9a84c, #e8c96d);
          color: #1a2744;
        }
        .cta-gold:hover {
          box-shadow: 0 6px 24px rgba(201,168,76,0.5);
          transform: scale(1.02);
        }
        .cta-blue {
          background: linear-gradient(135deg, #3b82f6, #60a5fa);
          color: white;
        }
        .cta-blue:hover {
          box-shadow: 0 6px 24px rgba(59,130,246,0.45);
          transform: scale(1.02);
        }
        .hero-footer-note {
          margin-top: 48px;
          font-family: 'Inter', sans-serif;
          font-size: 0.8rem;
          color: rgba(255,255,255,0.35);
          text-align: center;
          animation: fadeSlideUp 0.6s 0.5s ease both;
        }
        .trust-bar {
          display: flex;
          align-items: center;
          gap: 28px;
          margin-top: 40px;
          flex-wrap: wrap;
          justify-content: center;
          animation: fadeSlideUp 0.6s 0.4s ease both;
        }
        .trust-item {
          display: flex; align-items: center; gap: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 0.8rem;
          color: rgba(255,255,255,0.5);
        }
        .trust-dot { color: #c9a84c; font-size: 0.6rem; }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="hero-wrapper">
        {/* Background orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        {/* Badge */}
        <div className="hero-badge">⚖️ India's Legal Platform</div>

        {/* Title */}
        <h1 className="hero-title">
          Justice, Made <span>Accessible</span><br />& Intelligent
        </h1>
        <p className="hero-subtitle">
          Bridging the gap between Lawyers and Litigants using AI, trust, and technology — all in one secure platform.
        </p>

        {/* Cards */}
        <div className="hero-cards">
          {/* Litigant Card */}
          <div className="hero-card" onClick={() => navigate("/login?role=litigant")}>
            <div className="card-icon litigant-icon">⚖️</div>
            <h3 className="card-title">I am a Litigant</h3>
            <p className="card-desc">Find the right lawyer, track your cases, and get AI-powered legal guidance.</p>
            <div className="card-features">
              <div className="card-feature-item"><span className="card-feature-dot" />Browse verified lawyers</div>
              <div className="card-feature-item"><span className="card-feature-dot" />Track case status in real-time</div>
              <div className="card-feature-item"><span className="card-feature-dot" />AI legal assistant chatbot</div>
            </div>
            <button className="card-cta cta-gold">Continue as Litigant →</button>
          </div>

          {/* Lawyer Card */}
          <div className="hero-card" onClick={() => navigate("/login?role=lawyer")}>
            <div className="card-icon lawyer-icon">👨‍⚖️</div>
            <h3 className="card-title">I am a Lawyer</h3>
            <p className="card-desc">Manage your clients, update case files, and use AI tools for smarter insights.</p>
            <div className="card-features">
              <div className="card-feature-item"><span className="card-feature-dot" />Create & manage cases</div>
              <div className="card-feature-item"><span className="card-feature-dot" />AI-powered case recommendations</div>
              <div className="card-feature-item"><span className="card-feature-dot" />Manage client relationships</div>
            </div>
            <button className="card-cta cta-blue">Continue as Lawyer →</button>
          </div>
        </div>

        {/* Trust bar */}
        <div className="trust-bar">
          <div className="trust-item"><span className="trust-dot">●</span>Secure & Encrypted</div>
          <div className="trust-item"><span className="trust-dot">●</span>AI-Powered</div>
          <div className="trust-item"><span className="trust-dot">●</span>100% Free to Join</div>
        </div>

        <p className="hero-footer-note">
          ⚙️ Select your role to get started. You can update your profile anytime.
        </p>

        {/* Subtle admin portal link */}
        <p style={{ marginTop: 16, fontFamily: "'Inter',sans-serif", fontSize: "0.72rem", color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
          <span
            style={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={() => navigate("/login?role=admin")}
          >
            Admin Portal
          </span>
        </p>
      </div>
    </>
  );
}
