import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Terms() {
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
          <div className="tp-hero-badge">⚖️ Legal</div>
          <h1 className="tp-title">Terms & <span>Conditions</span></h1>
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
              Welcome to <strong>LawyerLink</strong>. These Terms and Conditions outline the rules and regulations for the use of LawyerLink's platform, operating under the laws of the Republic of India.
            </p>

            {viewRole === "Litigant" ? (
              <>
                <h2>1. Nature of Service for Litigants</h2>
                <p>
                  LawyerLink provides a technology platform to help you find and connect with independent verified Advocates. 
                  <strong> We are not a law firm.</strong> We do not provide legal representation. The Attorney-Client relationship is established solely between you and the Advocate you hire.
                </p>

                <h2>2. AI Tools & Disclaimers</h2>
                <p>
                  You may have access to AI-generated "Case Strength" and "Legal Strategy" insights if shared by your Advocate.
                </p>
                <ul>
                  <li>These AI insights are based on probabilistic algorithms referencing historical Indian court precedents.</li>
                  <li>They <strong>DO NOT</strong> guarantee any legal outcome. Do not base critical life decisions solely on AI percentages.</li>
                  <li>Always rely on the direct legal counsel of your Advocate.</li>
                </ul>

                <h2>3. User Responsibilities</h2>
                <p>
                  You agree to upload truthful and accurate documents and information regarding your case. Deliberate falsification of case data may lead to account suspension.
                </p>

                <h2>4. Fees & Consultation</h2>
                <p>
                  Any consultation fees or retainer fees are negotiated directly with your Advocate. LawyerLink is not responsible for refunding legal fees paid to independent practitioners.
                </p>
              </>
            ) : (
              <>
                <h2>1. Nature of Service for Advocates</h2>
                <p>
                  LawyerLink provides practice management and client-discovery software for verified Bar Council Advocates. You operate as an independent practitioner and not as an employee or agent of LawyerLink.
                </p>

                <h2>2. Verification & Professional Conduct</h2>
                <p>
                  You must provide a valid Bar Council Enrollment Number. You agree to adhere to the standard of professional conduct set by the Bar Council of India. We reserve the right to suspend accounts pending verification or upon receipt of verified ethical complaints.
                </p>

                <h2>3. Usage of the AI Precedent Engine</h2>
                <p>
                  Our platform provides you with an AI-driven Precedent Insight Engine (utilizing models like Llama-3.3). 
                </p>
                <ul>
                  <li>The AI tool is designed to augment your legal research, not replace your professional judgment.</li>
                  <li>You must verify all generated citations, precedents, and "AI Case Predictor" analysis against actual legal databases before advising your clients.</li>
                  <li>LawyerLink is not liable for malpractice claims arising from unverified AI recommendations.</li>
                </ul>

                <h2>4. Attorney-Client Privilege</h2>
                <p>
                  You are responsible for maintaining the confidentiality of your clients' data under Section 126 of the Indian Evidence Act. LawyerLink provides end-to-end encrypted storage to assist in this compliance.
                </p>
              </>
            )}

            <h2>5. General Jurisdiction</h2>
            <p>
              Any disputes arising out of or related to these Terms shall be subject to the exclusive jurisdiction of the courts located in Sagar, Madhya Pradesh, India. If you have queries, contact our legal grievance officer at <strong>legal@lawyerlink.in</strong>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
