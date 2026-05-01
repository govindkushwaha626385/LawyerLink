import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Privacy() {
  const [viewRole, setViewRole] = useState("Litigant");
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (user) {
      getDoc(doc(db, "users", user.uid)).then((docSnap) => {
        if (docSnap.exists() && docSnap.data().role === "lawyer") {
          setViewRole("Lawyer");
        }
      });
    }
  }, [user]);

  return (
    <>
      <style>{`
        .tp-wrapper { min-height: 100vh; background: linear-gradient(135deg, #f0f4ff 0%, #f8f9fc 50%, #fdf8ee 100%); padding-bottom: 80px; font-family: 'Inter', sans-serif; }
        .tp-hero {
          background: linear-gradient(-45deg, #0f1d3a, #1a2744, #243460, #1a3a5c);
          background-size: 400% 400%; animation: tpGrad 10s ease infinite;
          padding: 70px 20px; text-align: center; position: relative; overflow: hidden;
        }
        @keyframes tpGrad { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .tp-orb { position: absolute; border-radius: 50%; filter: blur(100px); opacity: 0.1; }
        .tp-orb1 { width: 300px; height: 300px; background: #c9a84c; top: -80px; right: -50px; }
        .tp-orb2 { width: 250px; height: 250px; background: #3b82f6; bottom: -50px; left: -50px; }
        .tp-hero-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(201,168,76,0.15); border: 1px solid rgba(201,168,76,0.3); color: #e8c96d; border-radius: 50px; padding: 5px 16px; font-size: 0.78rem; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 18px; }
        .tp-title { font-family: 'Playfair Display', serif; font-size: clamp(2rem, 4vw, 3rem); font-weight: 800; color: white; margin: 0; }
        .tp-title span { color: #c9a84c; }
        .tp-update { font-size: 0.85rem; color: rgba(255,255,255,0.6); margin-top: 10px; }
        
        .tp-container { max-width: 900px; margin: -30px auto 0; position: relative; z-index: 10; background: white; padding: 48px; border-radius: 24px; box-shadow: 0 16px 40px rgba(26,39,68,0.08); border: 1px solid rgba(26,39,68,0.04); }
        .tp-tabs { display: flex; justify-content: center; gap: 12px; margin-bottom: 36px; padding-bottom: 30px; border-bottom: 1px solid #f3f4f6; }
        .tp-tab-btn { background: #f3f4f6; border: 1px solid transparent; padding: 10px 24px; border-radius: 50px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; color: #4b5563; }
        .tp-tab-btn.active { background: rgba(201,168,76,0.15); border-color: rgba(201,168,76,0.3); color: #b48b2d; }
        .tp-tab-btn:hover:not(.active) { background: #e5e7eb; }

        .tp-content h2 { font-family: 'Playfair Display', serif; font-size: 1.4rem; color: #1a2744; margin: 32px 0 16px; font-weight: 700; }
        .tp-content p { font-size: 0.95rem; color: #4b5563; line-height: 1.8; margin-bottom: 16px; }
        .tp-content ul { padding-left: 20px; margin-bottom: 16px; }
        .tp-content li { font-size: 0.95rem; color: #4b5563; line-height: 1.8; margin-bottom: 8px; }
      `}</style>

      <div className="tp-wrapper">
        <div className="tp-hero">
          <div className="tp-orb tp-orb1" /><div className="tp-orb tp-orb2" />
          <div className="tp-hero-badge">🔒 Legal</div>
          <h1 className="tp-title">Privacy <span>Policy</span></h1>
          <p className="tp-update">Last Updated: May 2026</p>
        </div>

        <div className="tp-container">
          <div className="tp-header">
            {!user && (
              <div className="tp-tabs">
                <button 
                  className={`tp-tab-btn ${viewRole === "Litigant" ? "active" : ""}`}
                  onClick={() => setViewRole("Litigant")}
                >For Litigants</button>
                <button 
                  className={`tp-tab-btn ${viewRole === "Lawyer" ? "active" : ""}`}
                  onClick={() => setViewRole("Lawyer")}
                >For Lawyers</button>
              </div>
            )}
          </div>

          <div className="tp-content">
            <p>
              LawyerLink Private Limited ("we", "our", or "us") is committed to protecting your privacy in accordance with the Digital Personal Data Protection Act, 2023 (DPDP Act) of India.
            </p>

            {viewRole === "Litigant" ? (
              <>
                <h2>1. Information We Collect from Litigants</h2>
                <p>When you register and use the platform, we collect:</p>
                <ul>
                  <li><strong>Personal Data:</strong> Your name, phone number, and location data to match you with local lawyers.</li>
                  <li><strong>Case Data:</strong> Any case descriptions or FIR documents you upload for consultation.</li>
                  <li><strong>Chat Logs:</strong> Questions asked to our AI chatbot for immediate legal guidance.</li>
                </ul>

                <h2>2. How Your Case Data is Used</h2>
                <p>
                  Your legal case data is strictly used to match you with an Advocate and to allow that Advocate to analyze your case. 
                  <strong> We do not use your private case data to train our public AI models.</strong> The AI inference engine processes your document ephemerally and deletes it from its temporary memory after generating the strategy.
                </p>

                <h2>3. Who Can See Your Data</h2>
                <p>
                  Only the Advocate you specifically choose to "Book Consultation" with can see your uploaded files. Our database administrators cannot read your encrypted documents.
                </p>
              </>
            ) : (
              <>
                <h2>1. Information We Collect from Advocates</h2>
                <p>When you create a professional profile, we collect:</p>
                <ul>
                  <li><strong>Professional Data:</strong> Bar Council Enrollment Number, specialization, experience, and practice courts.</li>
                  <li><strong>Client Communications:</strong> Encrypted chat messages and shared case notes between you and your linked clients.</li>
                </ul>

                <h2>2. AI Processing & Attorney-Client Privilege</h2>
                <p>
                  When you use the "AI Case Predictor" or "Analyze Precedents" features, the specific case text is sent to our Groq API (Llama-3.3 model). 
                  This transmission is secured via TLS encryption. The data is processed strictly for inference and is <strong>not retained or used by the AI provider to train future models</strong>. This ensures compliance with your professional confidentiality obligations.
                </p>

                <h2>3. Public Profile Visibility</h2>
                <p>
                  Your name, rating, experience, and category are visible to all litigants on the platform via the Lawyers Catalog. You may opt to hide your profile by toggling your availability in the settings.
                </p>
              </>
            )}

            <h2>4. Data Security</h2>
            <p>
              We use Firebase's administrative, technical, and physical security measures to help protect your personal information. Database reads and writes are heavily restricted by Firebase Security Rules.
            </p>

            <h2>5. Your Data Rights</h2>
            <p>
              Under Indian law, you have the right to request access to, correction of, or erasure of your personal data stored on our servers. To exercise these rights, please contact our Grievance Officer at <strong>privacy@lawyerlink.in</strong>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
