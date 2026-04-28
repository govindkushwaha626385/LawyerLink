import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate, useLocation, Link } from "react-router-dom";

// ── Admin credentials (email only — password lives in Firebase Auth) ──
const ADMIN_EMAILS = ["govindkushwahabusiness@gmail.com"];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nav = useNavigate();
  const location = useLocation();
  const role = new URLSearchParams(location.search).get("role") || "litigant";

  const handleLogin = async () => {
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      // ✅ Admin check — redirect before role-based redirect
      if (ADMIN_EMAILS.includes(email.trim().toLowerCase())) {
        nav("/admin");
        return;
      }
      nav(role === "lawyer" ? "/lawyer" : "/litigant");
    } catch (e) {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isLawyer = role === "lawyer";
  const isAdmin  = role === "admin";

  // Role display config
  const roleConfig = {
    lawyer:   { icon: "👨\u200d⚖️", label: "Lawyer Portal",        bg: "rgba(59,130,246,0.1)",    color: "#1d4ed8", border: "rgba(59,130,246,0.25)" },
    litigant: { icon: "⚖️",        label: "Litigant Portal",      bg: "rgba(201,168,76,0.1)",   color: "#92400e", border: "rgba(201,168,76,0.3)"  },
    admin:    { icon: "🛡️",        label: "Administrator Portal", bg: "rgba(220,38,38,0.08)",   color: "#991b1b", border: "rgba(220,38,38,0.2)"   },
  };
  const rc = roleConfig[role] || roleConfig.litigant;

  return (
    <>
      <style>{`
        .auth-wrapper {
          min-height: 100vh;
          background: linear-gradient(-45deg, #0f1d3a, #1a2744, #243460, #1a3a5c);
          background-size: 400% 400%;
          animation: gradBg 10s ease infinite;
          display: flex;
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
        .auth-orb-1 { position: absolute; width: 400px; height: 400px; border-radius: 50%; background: #c9a84c; filter: blur(100px); opacity: 0.08; top: -100px; right: -100px; animation: orbF 7s ease-in-out infinite; }
        .auth-orb-2 { position: absolute; width: 300px; height: 300px; border-radius: 50%; background: #3b82f6; filter: blur(100px); opacity: 0.08; bottom: -80px; left: -80px; animation: orbF 7s 3s ease-in-out infinite; }
        @keyframes orbF { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-30px); } }

        .auth-card {
          background: rgba(255,255,255,0.97);
          border-radius: 28px;
          padding: 48px 44px;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.4);
          animation: fadeSlideUp 0.5s ease both;
          position: relative;
          z-index: 1;
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .auth-logo {
          font-family: 'Playfair Display', serif;
          font-size: 1.6rem;
          font-weight: 800;
          color: #1a2744;
          text-align: center;
          margin-bottom: 4px;
        }
        .auth-role-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: ${rc.bg};
          color: ${rc.color};
          border: 1px solid ${rc.border};
          border-radius: 50px;
          padding: 4px 14px;
          font-family: 'Inter', sans-serif;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .auth-heading {
          font-family: 'Playfair Display', serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a2744;
          margin: 20px 0 6px;
          text-align: center;
        }
        .auth-sub {
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          color: #6b7280;
          text-align: center;
          margin-bottom: 28px;
        }
        .auth-divider { height: 2px; width: 48px; background: linear-gradient(90deg,#c9a84c,#e8c96d); border-radius: 1px; margin: 0 auto 28px; }
        .auth-label {
          font-family: 'Inter', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
          display: block;
          letter-spacing: 0.3px;
        }
        .auth-input {
          width: 100%;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          padding: 11px 14px;
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          color: #1a2744;
          outline: none;
          transition: all 0.25s ease;
          background: #fafafa;
          margin-bottom: 18px;
        }
        .auth-input:focus {
          border-color: #1a2744;
          background: white;
          box-shadow: 0 0 0 3px rgba(26,39,68,0.06);
        }
        .auth-input::placeholder { color: #9ca3af; }
        .password-wrapper { position: relative; }
        .password-wrapper .auth-input { margin-bottom: 0; padding-right: 44px; }
        .pass-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          font-size: 1rem;
          padding: 0;
        }
        .auth-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          border-radius: 10px;
          padding: 10px 14px;
          font-family: 'Inter', sans-serif;
          font-size: 0.83rem;
          margin-bottom: 18px;
          font-weight: 500;
        }
        .auth-btn {
          width: 100%;
          padding: 13px;
          border-radius: 50px;
          border: none;
          background: linear-gradient(135deg, #1a2744, #243460);
          color: white;
          font-family: 'Inter', sans-serif;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
          margin-top: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .auth-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #111b33, #1a2744);
          box-shadow: 0 8px 24px rgba(26,39,68,0.35);
          transform: translateY(-1px);
        }
        .auth-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .auth-footer {
          text-align: center;
          margin-top: 24px;
          font-family: 'Inter', sans-serif;
          font-size: 0.85rem;
          color: #6b7280;
        }
        .auth-footer a {
          color: #1a2744;
          font-weight: 700;
          text-decoration: none;
        }
        .auth-footer a:hover { color: #c9a84c; }
      `}</style>

      <div className="auth-wrapper">
        <div className="auth-orb-1" />
        <div className="auth-orb-2" />

        <div className="auth-card">
          <div className="text-center mb-3">
            <div className="auth-logo">⚖️ LawyerLink</div>
            <div className="mt-2">
              <span className="auth-role-badge">
                {rc.icon}&nbsp;{rc.label}
              </span>
            </div>
          </div>

          <h2 className="auth-heading">
            {isAdmin ? "Admin Sign In" : "Welcome Back"}
          </h2>
          <p className="auth-sub">
            {isAdmin
              ? "Secure access to the administrator dashboard"
              : "Sign in to continue to your dashboard"}
          </p>
          <div className="auth-divider" />

          {error && <div className="auth-error">⚠️ {error}</div>}

          <label className="auth-label">Email Address</label>
          <input
            className="auth-input"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
          />

          <label className="auth-label" style={{ marginTop: 4 }}>Password</label>
          <div className="password-wrapper" style={{ marginBottom: 18 }}>
            <input
              className="auth-input"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
            />
            <button className="pass-toggle" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          <button className="auth-btn" onClick={handleLogin} disabled={loading}>
            {loading ? <span className="spinner-border spinner-border-sm" /> : "Sign In →"}
          </button>

          {/* Hide signup link for Admin — admin account is fixed */}
          {!isAdmin && (
            <p className="auth-footer">
              No account yet?{" "}
              <Link to={`/signup?role=${role}`}>Create one</Link>
            </p>
          )}
        </div>
      </div>
    </>
  );
}
