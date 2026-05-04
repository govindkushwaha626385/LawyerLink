// src/components/About.js
import React from "react";
import lawImage from "../../images/law.jpg";

export default function About() {
  const stats = [
    { num: "500+", label: "Cases Managed" },
    { num: "50+", label: "Verified Lawyers" },
    { num: "1000+", label: "Users Served" },
    { num: "24/7", label: "AI Assistance" },
  ];

  const features = [
    { icon: "🤖", title: "AI Legal Predictor", desc: "Our proprietary AI models analyze case precedents from Indian High Courts and the Supreme Court to generate outcome probabilities." },
    { icon: "📁", title: "End-to-End Case Management", desc: "Advocates and Litigants share a synchronized dashboard for hearings, encrypted document storage, and direct communication." },
    { icon: "🔒", title: "Privileged & Secure", desc: "Built with bank-grade encryption to protect Attorney-Client privilege under Section 126 of the Indian Evidence Act." },
    { icon: "💬", title: "Jurisdiction-Aware AI", desc: "Our virtual legal assistant is trained on the Bharatiya Nyaya Sanhita (BNS) and regional state laws to provide accurate preliminary guidance." },
  ];

  return (
    <>
      <style>{`
        .ab-wrapper { min-height: 100vh; font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #f0f4ff 0%, #f8f9fc 50%, #fdf8ee 100%); }

        /* Hero */
        .ab-hero {
          background: linear-gradient(-45deg, #0f1d3a, #1a2744, #243460, #1a3a5c);
          background-size: 400% 400%; animation: abGrad 10s ease infinite;
          padding: 80px 20px 70px; text-align: center; position: relative; overflow: hidden;
        }
        @keyframes abGrad { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .ab-orb { position: absolute; border-radius: 50%; filter: blur(100px); opacity: 0.1; }
        .ab-orb1 { width: 400px; height: 400px; background: #c9a84c; top: -100px; right: -80px; }
        .ab-orb2 { width: 300px; height: 300px; background: #3b82f6; bottom: -60px; left: -60px; }
        .ab-hero-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(201,168,76,0.15); border: 1px solid rgba(201,168,76,0.3); color: #e8c96d; border-radius: 50px; padding: 5px 16px; font-size: 0.78rem; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 18px; }
        .ab-hero-title { font-family: 'Playfair Display', serif; font-size: clamp(2rem, 4vw, 3rem); font-weight: 800; color: white; margin-bottom: 14px; }
        .ab-hero-title span { color: #c9a84c; }
        .ab-hero-sub { font-size: 1rem; color: rgba(255,255,255,0.65); max-width: 560px; margin: 0 auto; line-height: 1.7; }

        /* Stats */
        .ab-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 0; background: white; box-shadow: 0 4px 24px rgba(26,39,68,0.08); }
        @media (max-width: 640px) { .ab-stats { grid-template-columns: 1fr 1fr; } }
        .ab-stat { padding: 32px 20px; text-align: center; border-right: 1px solid #f3f4f6; transition: background 0.2s; }
        .ab-stat:last-child { border-right: none; }
        .ab-stat:hover { background: #fafafa; }
        .ab-stat-num { font-family: 'Playfair Display', serif; font-size: 2.2rem; font-weight: 800; color: #1a2744; margin: 0; }
        .ab-stat-label { font-size: 0.78rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-top: 4px; }

        /* Main content */
        .ab-main { max-width: 1100px; margin: 0 auto; padding: 64px 20px; }

        /* Who we are */
        .ab-who { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; margin-bottom: 72px; }
        @media (max-width: 768px) { .ab-who { grid-template-columns: 1fr; } }
        .ab-who-img-wrapper { border-radius: 24px; overflow: hidden; box-shadow: 0 16px 48px rgba(26,39,68,0.14); position: relative; }
        .ab-who-img { width: 100%; height: auto; display: block; transition: transform 0.5s ease; }
        .ab-who-img-wrapper:hover .ab-who-img { transform: scale(1.03); }
        .ab-who-content {}
        .ab-section-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1.5px; color: #c9a84c; font-weight: 700; margin-bottom: 8px; }
        .ab-section-title { font-family: 'Playfair Display', serif; font-size: 1.9rem; font-weight: 700; color: #1a2744; margin-bottom: 16px; }
        .ab-section-title span { color: #c9a84c; }
        .ab-para { font-size: 0.9rem; line-height: 1.8; color: #4b5563; margin-bottom: 14px; }
        .ab-check-list { list-style: none; padding: 0; margin: 0; }
        .ab-check-item { display: flex; align-items: center; gap: 10px; font-size: 0.875rem; color: #374151; margin-bottom: 10px; font-weight: 500; }
        .ab-check-icon { width: 22px; height: 22px; border-radius: 50%; background: #d1fae5; color: #065f46; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; flex-shrink: 0; }

        /* Features */
        .ab-features-header { text-align: center; margin-bottom: 36px; }
        .ab-features-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px,1fr)); gap: 22px; margin-bottom: 72px; }
        .ab-feature-card {
          background: white; border-radius: 20px; padding: 28px 24px;
          border: 1px solid rgba(26,39,68,0.04); box-shadow: 0 2px 14px rgba(26,39,68,0.06);
          transition: all 0.3s ease;
        }
        .ab-feature-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(26,39,68,0.12); }
        .ab-feature-icon { font-size: 2rem; margin-bottom: 14px; }
        .ab-feature-title { font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700; color: #1a2744; margin-bottom: 8px; }
        .ab-feature-desc { font-size: 0.83rem; line-height: 1.65; color: #6b7280; }

        /* Quote */
        .ab-quote-block {
          background: linear-gradient(-45deg, #0f1d3a, #1a2744, #243460, #1a3a5c);
          background-size: 400% 400%; animation: abGrad 10s ease infinite;
          border-radius: 24px; padding: 52px 40px; text-align: center;
          box-shadow: 0 12px 40px rgba(26,39,68,0.2); position: relative; overflow: hidden;
        }
        .ab-quote { font-family: 'Playfair Display', serif; font-size: clamp(1.2rem, 2.5vw, 1.6rem); font-style: italic; color: white; max-width: 620px; margin: 0 auto 16px; line-height: 1.55; }
        .ab-quote-attr { font-size: 0.8rem; color: rgba(255,255,255,0.45); letter-spacing: 1px; text-transform: uppercase; font-weight: 600; }
        .ab-quote-gold { color: #c9a84c; font-size: 4rem; line-height: 1; margin-bottom: 8px; font-family: Georgia, serif; opacity: 0.4; }
      `}</style>

      <div className="ab-wrapper">
        {/* Hero */}
        <div className="ab-hero">
          <div className="ab-orb ab-orb1" /><div className="ab-orb ab-orb2" />
          <div className="ab-hero-badge">⚖️ About Us</div>
          <h1 className="ab-hero-title">About <span>LawyerLink</span></h1>
          <p className="ab-hero-sub">Empowering justice through technology, AI, and intelligent legal connections. Your trusted digital partner.</p>
        </div>

        {/* Stats */}
        <div className="ab-stats">
          {stats.map((s, i) => (
            <div className="ab-stat" key={i}>
              <p className="ab-stat-num">{s.num}</p>
              <p className="ab-stat-label">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="ab-main">
          {/* Who we are */}
          <div className="ab-who">
            <div className="ab-who-img-wrapper">
              <img src={lawImage} alt="Law and Justice" className="ab-who-img" />
            </div>
            <div className="ab-who-content">
              <p className="ab-section-label">Our Story</p>
              <h2 className="ab-section-title">Who We <span>Are</span></h2>
              <p className="ab-para">
                <strong>LawyerLink Private Limited</strong> bridges the gap between litigants and legal professionals using state-of-the-art technology. Our mission is to digitize the Indian legal ecosystem, making justice accessible, transparent, and driven by data.
              </p>
              <p className="ab-para">
                Operating strictly within the ambit of the Advocates Act, 1961, we connect citizens with verified Bar Council Advocates and supercharge their workflow with Artificial Intelligence.
              </p>
              <ul className="ab-check-list">
                {["Verified Bar Council Advocates", "Data-driven Legal Insights", "End-to-End encrypted case sharing", "Compliance with IT Act, 2000"].map(item => (
                  <li key={item} className="ab-check-item">
                    <span className="ab-check-icon">✓</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Features */}
          <div className="ab-features-header">
            <p className="ab-section-label" style={{ textAlign: "center" }}>What We Offer</p>
            <h2 className="ab-section-title" style={{ textAlign: "center" }}>Our <span>Features</span></h2>
          </div>
          <div className="ab-features-grid">
            {features.map((f, i) => (
              <div className="ab-feature-card" key={i}>
                <div className="ab-feature-icon">{f.icon}</div>
                <h3 className="ab-feature-title">{f.title}</h3>
                <p className="ab-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Quote */}
          <div className="ab-quote-block">
            <div className="ab-quote-gold">"</div>
            <blockquote className="ab-quote">
              Justice made accessible, digital, and intelligent — for every Indian citizen.
            </blockquote>
            <p className="ab-quote-attr">— LawyerLink Mission</p>
          </div>
        </div>
      </div>
    </>
  );
}
