import React, { useState, useRef } from "react";
import emailjs from "@emailjs/browser";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate, useLocation, Link } from "react-router-dom";

// ── EmailJS config ───────────────────────────────────
const EJS_SERVICE  = "service_2tvrzjy";
const EJS_TEMPLATE = "template_lrtrlbm";
const EJS_PUBLIC   = "iiTZNMe5xBgrLmn2L";

// ── Cloudinary config ──────────────────────────────────
const CLOUD_NAME    = "dzfoal3fg";
const UPLOAD_PRESET = "lawyerlink_documents";

async function uploadAvatar(file) {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", UPLOAD_PRESET);
  data.append("folder", "lawyerlink/avatars");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: data });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Image upload failed");
  return json.secure_url;
}

async function uploadCertificate(file) {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", UPLOAD_PRESET);
  data.append("folder", "lawyerlink/enrollment_certs");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: data });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Certificate upload failed");
  return json.secure_url;
}

export default function Signup() {
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [loadingText, setLoadingText]   = useState("Creating account...");
  const [error, setError]               = useState("");
  const [avatarFile, setAvatarFile]     = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [certFile, setCertFile]         = useState(null);
  const [certName, setCertName]         = useState("");
  const [formData, setFormData]         = useState({
    fullName: "", phone: "", address: "",
    experience: "", category: "", advocateNumber: "",
    registrationDate: "",
  });
  const [showOTP, setShowOTP]           = useState(false);
  const [expectedOTP, setExpectedOTP]   = useState("");
  const [enteredOTP, setEnteredOTP]     = useState("");

  const avatarInputRef = useRef(null);
  const certInputRef   = useRef(null);
  const location       = useLocation();
  const navigate       = useNavigate();
  const role           = new URLSearchParams(location.search).get("role") || "litigant";
  const isLawyer       = role === "lawyer";

  const handleChange = (e) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Profile photo must be under 5 MB."); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleSignup = async () => {
    if (!email || !password) { setError("Please enter email and password."); return; }
    setLoading(true); setLoadingText("Verifying Advocate Data..."); setError("");
    try {
      // ── Validate Advocate Registration (lawyer only) ──────────────
      if (isLawyer) {
        if (!formData.advocateNumber || !formData.registrationDate) {
          setError("Advocate Reg. Number and Registration Date are required.");
          setLoading(false); return;
        }
        if (!certFile) {
          setError("Please upload your Bar Council Enrollment Certificate (image format only).");
          setLoading(false); return;
        }

        /**
         * Normalize any date string to YYYY-MM-DD.
         * HTML <input type="date"> always returns YYYY-MM-DD internally,
         * but some browsers (Safari/mobile) may surface DD/MM/YYYY via .value.
         * We handle both formats so the comparison is always reliable.
         */
        const toISO = (dateStr) => {
          if (!dateStr) return "";
          const s = dateStr.trim();
          // Already YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
          // DD/MM/YYYY  →  YYYY-MM-DD
          const parts = s.split("/");
          if (parts.length === 3) {
            const [d, m, y] = parts;
            return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
          }
          return s;
        };

        const regNum       = formData.advocateNumber.trim().toUpperCase();
        const regDateISO   = toISO(formData.registrationDate); // normalize input

        const advSnap = await getDocs(
          query(collection(db, "advocates_master"),
            where("advocate_registration_number", "==", regNum))
        );
        if (advSnap.empty) {
          setError("❌ Advocate Registration Number not found in our records. Please check and try again.");
          setLoading(false); return;
        }
        const advData       = advSnap.docs[0].data();
        const storedDateISO = toISO(advData.registration_date); // normalize DB value

        if (storedDateISO !== regDateISO) {
          setError(`❌ Registration Date does not match our records for this Advocate Number. (Expected: ${storedDateISO})`);
          setLoading(false); return;
        }

        if (!advData.email_id) {
          setError("❌ No email found in master data for this Advocate Number. Cannot verify OTP.");
          setLoading(false); return;
        }

        // ── Generate OTP & send via EmailJS (no backend needed) ──
        setLoadingText("Sending OTP to your email...");
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        try {
          await emailjs.send(
            EJS_SERVICE,
            EJS_TEMPLATE,
            { otp, to_email: advData.email_id },
            EJS_PUBLIC
          );
          setExpectedOTP(otp);
          setShowOTP(true);
        } catch (ejsErr) {
          console.error("EmailJS error:", ejsErr);
          setError("❌ Failed to send OTP. Please try again.");
        }
        setLoading(false);
        return; // wait for OTP verification
      }

      // If Litigant, proceed directly
      await finalizeSignup();
    } catch (err) {
      setError(err.message.replace("Firebase: ", "").replace(" (auth/", " (").replace(/\.$/, ""));
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (enteredOTP !== expectedOTP) {
      setError("❌ Incorrect OTP. Please try again.");
      return;
    }
    setError("");
    setLoading(true);
    setShowOTP(false);
    await finalizeSignup();
  };

  const finalizeSignup = async () => {
    setLoadingText("Creating account...");
    try {
      // Upload avatar first (optional)
      let imageUrl = "";
      if (avatarFile) imageUrl = await uploadAvatar(avatarFile);

      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid    = result.user.uid;

      const userData = {
        uid, email: email.trim().toLowerCase(), role,
        fullName:  formData.fullName  || "",
        phone:     formData.phone     || "",
        address:   formData.address   || "",
        image:     imageUrl,
        createdAt: new Date().toISOString(),
      };

      if (isLawyer) {
        let certUrl = "";
        if (certFile) {
          setLoadingText("Uploading enrollment certificate...");
          certUrl = await uploadCertificate(certFile);
        }
        Object.assign(userData, {
          experience:            formData.experience       || "",
          category:              formData.category         || "",
          advocateNumber:        formData.advocateNumber.trim().toUpperCase(),
          registrationDate:      formData.registrationDate || "",
          casesHandled:          0,
          rating:                0,
          verified:              false,          // Admin must approve
          verificationStatus:    "pending",      // pending | approved | rejected
          enrollmentCertUrl:     certUrl,        // uploaded cert for admin review
          verificationSubmittedAt: new Date().toISOString(),
        });
      }

      await setDoc(doc(db, "users", uid), userData);
      navigate(isLawyer ? "/lawyer" : "/litigant");
    } catch (err) {
      setError(err.message.replace("Firebase: ", "").replace(" (auth/", " (").replace(/\.$/, ""));
    } finally {
      setLoading(false);
    }
  };

  const themeColor = isLawyer ? "#3b82f6" : "#c9a84c";
  const themeBg    = isLawyer ? "rgba(59,130,246,0.08)" : "rgba(201,168,76,0.1)";
  const themeBorder= isLawyer ? "rgba(59,130,246,0.2)"  : "rgba(201,168,76,0.25)";
  const themeText  = isLawyer ? "#1d4ed8" : "#92400e";
  const secBorder  = isLawyer ? "#dbeafe" : "#fef3c7";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap');

        .sw-wrapper {
          min-height: 100vh;
          background: linear-gradient(-45deg, #0f1d3a, #1a2744, #243460, #1a3a5c);
          background-size: 400% 400%;
          animation: swGrad 10s ease infinite;
          display: flex; align-items: flex-start; justify-content: center;
          padding: 40px 20px 60px; position: relative; overflow: hidden;
        }
        @keyframes swGrad { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }

        .sw-orb { position: fixed; border-radius: 50%; filter: blur(110px); pointer-events: none; }
        .sw-orb-1 { width:450px; height:450px; background:#c9a84c; opacity:.07; top:-120px; right:-120px; animation: swOrb 8s ease-in-out infinite; }
        .sw-orb-2 { width:320px; height:320px; background:#3b82f6; opacity:.07; bottom:-80px; left:-80px;  animation: swOrb 8s 3s ease-in-out infinite; }
        @keyframes swOrb { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-35px)} }

        .sw-card {
          background: rgba(255,255,255,0.97);
          border-radius: 28px; padding: 40px 44px;
          width: 100%; max-width: 500px;
          box-shadow: 0 28px 80px rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.4);
          animation: swFadeUp .5s ease both; position: relative; z-index: 1;
        }
        @keyframes swFadeUp { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }

        .sw-logo  { font-family:'Playfair Display',serif; font-size:1.5rem; font-weight:800; color:#1a2744; text-align:center; }
        .sw-badge {
          display:inline-flex; align-items:center; gap:5px;
          background:${themeBg}; color:${themeText}; border:1px solid ${themeBorder};
          border-radius:50px; padding:4px 14px;
          font-family:'Inter',sans-serif; font-size:.75rem; font-weight:700;
          letter-spacing:.5px; text-transform:uppercase;
        }
        .sw-heading { font-family:'Playfair Display',serif; font-size:1.6rem; font-weight:700; color:#1a2744; text-align:center; margin:14px 0 3px; }
        .sw-sub     { font-family:'Inter',sans-serif; font-size:.875rem; color:#6b7280; text-align:center; margin-bottom:20px; }
        .sw-divider { height:2.5px; width:48px; background:linear-gradient(90deg,#c9a84c,#e8c96d); border-radius:2px; margin:0 auto 22px; }

        /* ── Avatar picker ── */
        .sw-avatar-wrap { display:flex; flex-direction:column; align-items:center; margin-bottom:22px; gap:10px; }
        .sw-avatar-circle {
          width:88px; height:88px; border-radius:50%; cursor:pointer;
          border:3px dashed ${themeColor}; overflow:hidden;
          display:flex; align-items:center; justify-content:center;
          background:#f8faff; transition:border-color .2s, box-shadow .2s;
          position:relative;
        }
        .sw-avatar-circle:hover { border-style:solid; box-shadow:0 0 0 4px ${themeBg}; }
        .sw-avatar-img  { width:100%; height:100%; object-fit:cover; }
        .sw-avatar-icon { font-size:2rem; opacity:.4; }
        .sw-avatar-overlay {
          position:absolute; inset:0; background:rgba(0,0,0,0.35);
          display:flex; align-items:center; justify-content:center;
          opacity:0; transition:opacity .2s; border-radius:50%;
          font-size:.75rem; font-weight:700; color:white;
        }
        .sw-avatar-circle:hover .sw-avatar-overlay { opacity:1; }
        .sw-avatar-hint { font-family:'Inter',sans-serif; font-size:.72rem; color:#9ca3af; }

        /* ── Section label ── */
        .sw-section {
          font-family:'Inter',sans-serif; font-size:.7rem; font-weight:700;
          color:${themeText}; letter-spacing:1.2px; text-transform:uppercase;
          display:flex; align-items:center; gap:10px; margin:18px 0 12px;
        }
        .sw-section::after { content:''; flex:1; height:1px; background:${secBorder}; }

        /* ── Form helpers ── */
        .sw-row   { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .sw-field { display:flex; flex-direction:column; gap:5px; margin-bottom:12px; }
        .sw-label { font-family:'Inter',sans-serif; font-size:.78rem; font-weight:600; color:#374151; }
        .sw-input {
          width:100%; border:1.5px solid #e5e7eb; border-radius:11px;
          padding:10px 13px; font-family:'Inter',sans-serif; font-size:.875rem;
          color:#1a2744; outline:none; background:#fafafa; transition:all .2s;
        }
        .sw-input:focus { border-color:${themeColor}; background:white; box-shadow:0 0 0 3px ${themeBg}; }
        .sw-input::placeholder { color:#9ca3af; }

        .pw-wrap { position:relative; }
        .pw-wrap .sw-input { padding-right:42px; }
        .pw-toggle { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#9ca3af; }

        .sw-error  { background:#fef2f2; border:1px solid #fecaca; color:#dc2626; border-radius:10px; padding:10px 13px; font-family:'Inter',sans-serif; font-size:.82rem; font-weight:500; margin-bottom:14px; }

        .sw-btn {
          width:100%; padding:13px; border-radius:50px; border:none;
          background:linear-gradient(135deg,#1a2744,#243460); color:white;
          font-family:'Inter',sans-serif; font-size:.95rem; font-weight:700;
          cursor:pointer; transition:all .25s; display:flex; align-items:center; justify-content:center; gap:8px; margin-top:6px;
        }
        .sw-btn:hover:not(:disabled) { background:linear-gradient(135deg,#111b33,#1a2744); box-shadow:0 8px 24px rgba(26,39,68,.35); transform:translateY(-1px); }
        .sw-btn:disabled { opacity:.7; cursor:not-allowed; }

        .sw-footer { text-align:center; margin-top:20px; font-family:'Inter',sans-serif; font-size:.85rem; color:#6b7280; }
        .sw-footer a { color:#1a2744; font-weight:700; text-decoration:none; }
        .sw-footer a:hover { color:${themeColor}; }

        @media(max-width:480px) { .sw-row{grid-template-columns:1fr;} .sw-card{padding:32px 22px;} }
      `}</style>

      <div className="sw-wrapper">
        <div className="sw-orb sw-orb-1" />
        <div className="sw-orb sw-orb-2" />

        <div className="sw-card">
          {/* ── Header ── */}
          <div className="text-center mb-2">
            <div className="sw-logo">⚖️ LawyerLink</div>
            <div className="mt-2">
              <span className="sw-badge">
                {isLawyer ? "👨‍⚖️" : "⚖️"}&nbsp;{role.charAt(0).toUpperCase() + role.slice(1)} Sign Up
              </span>
            </div>
          </div>

          <h2 className="sw-heading">{isLawyer ? "Lawyer Sign Up" : "Litigant Sign Up"}</h2>
          <p className="sw-sub">
            {isLawyer
              ? "Create your lawyer profile and start managing cases"
              : "Join LawyerLink and connect with the right lawyer"}
          </p>
          <div className="sw-divider" />

          {/* ── Profile Picture (optional) ── */}
          <div className="sw-avatar-wrap">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
            <div className="sw-avatar-circle" onClick={() => avatarInputRef.current?.click()}>
              {avatarPreview
                ? <img src={avatarPreview} className="sw-avatar-img" alt="preview" />
                : <span className="sw-avatar-icon">📷</span>}
              <div className="sw-avatar-overlay">
                {avatarPreview ? "Change" : "Upload"}
              </div>
            </div>
            <span className="sw-avatar-hint">
              {avatarPreview ? "Click to change photo" : "Profile photo (optional)"}
            </span>
          </div>

          {error && <div className="sw-error">⚠️ {error}</div>}

          {/* ── Account Credentials ── */}
          <div className="sw-section">Account Credentials</div>

          <div className="sw-row">
            <div className="sw-field">
              <label className="sw-label">Email Address</label>
              <input className="sw-input" type="email" placeholder="your@email.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="sw-field">
              <label className="sw-label">Password</label>
              <div className="pw-wrap">
                <input className="sw-input" type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={password} onChange={e => setPassword(e.target.value)} />
                <button className="pw-toggle" type="button" onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          </div>

          {/* ── Personal Information ── */}
          <div className="sw-section">Personal Information</div>

          <div className="sw-row">
            <div className="sw-field">
              <label className="sw-label">Full Name</label>
              <input className="sw-input" type="text" placeholder="John Doe"
                name="fullName" value={formData.fullName} onChange={handleChange} />
            </div>
            <div className="sw-field">
              <label className="sw-label">Phone Number</label>
              <input className="sw-input" type="tel" placeholder="+91 9876543210"
                name="phone" value={formData.phone} onChange={handleChange} />
            </div>
          </div>

          <div className="sw-field">
            <label className="sw-label">Full Address</label>
            <textarea className="sw-input" rows="2" style={{ resize: "none" }}
              placeholder="House/Street, City, State, PIN"
              name="address" value={formData.address} onChange={handleChange} />
          </div>

          {/* ── Lawyer-only Fields ── */}
          {isLawyer && (
            <>
              <div className="sw-section">Professional Details</div>

              <div className="sw-row">
                <div className="sw-field">
                  <label className="sw-label">Years of Experience</label>
                  <input className="sw-input" type="number" min="0" placeholder="e.g. 5"
                    name="experience" value={formData.experience} onChange={handleChange} />
                </div>
                <div className="sw-field">
                  <label className="sw-label">Advocate Reg. Number <span style={{color:"#dc2626"}}>*</span></label>
                  <input className="sw-input" type="text" placeholder="e.g. MP/1024/2015"
                    name="advocateNumber" value={formData.advocateNumber} onChange={handleChange} />
                </div>
              </div>

              <div className="sw-field">
                <label className="sw-label">Bar Council Registration Date <span style={{color:"#dc2626"}}>*</span></label>
                <input className="sw-input" type="date" name="registrationDate"
                  value={formData.registrationDate} onChange={handleChange} />
                <span style={{ fontSize: ".7rem", color: "#6b7280", marginTop: 4 }}>
                  Must match the Bar Council records exactly.
                </span>
              </div>

              <div className="sw-field">
                <label className="sw-label">Specialization</label>
                <select className="sw-input" name="category"
                  value={formData.category} onChange={handleChange}>
                  <option value="">— Select specialization —</option>
                  {["Criminal Law","Civil Law","Corporate Law","Family Law",
                    "Property Law","Cyber Law","Labour Law","Tax Law","Constitutional Law"]
                .map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* ── Enrollment Certificate Upload ── */}
              <div className="sw-section">Enrollment Certificate <span style={{color:"#dc2626"}}>*</span></div>
              <div className="sw-field">
                <input
                  ref={certInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (!f.type.startsWith("image/")) { setError("Certificate must be an image (JPG, PNG)."); return; }
                    if (f.size > 10 * 1024 * 1024) { setError("Certificate must be under 10 MB."); return; }
                    setCertFile(f);
                    setCertName(f.name);
                    setError("");
                  }}
                />
                {certFile ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 12, padding: "12px 16px" }}>
                    <span style={{ fontSize: "1.5rem" }}>🖼️</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, color: "#15803d", fontSize: ".83rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{certName}</p>
                      <p style={{ margin: 0, fontSize: ".72rem", color: "#16a34a" }}>✅ Certificate selected</p>
                    </div>
                    <button type="button" onClick={() => { setCertFile(null); setCertName(""); certInputRef.current.value = ""; }}
                      style={{ background: "none", border: "none", color: "#dc2626", fontSize: ".75rem", fontWeight: 700, cursor: "pointer" }}>✕ Remove</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => certInputRef.current?.click()}
                    style={{ width: "100%", border: "2px dashed #93c5fd", borderRadius: 12, padding: "18px", background: "#eff6ff", cursor: "pointer", fontFamily: "'Inter',sans-serif", textAlign: "center" }}>
                    <p style={{ margin: "0 0 4px", fontSize: "1.4rem" }}>📋</p>
                    <p style={{ margin: 0, fontWeight: 700, color: "#1d4ed8", fontSize: ".84rem" }}>Upload Enrollment Certificate</p>
                    <p style={{ margin: "3px 0 0", fontSize: ".72rem", color: "#6b7280" }}>Image Only (JPG, PNG) · Max 10 MB · Required</p>
                  </button>
                )}
                <p style={{ fontSize: ".7rem", color: "#6b7280", marginTop: 6 }}>
                  📌 Your certificate will be reviewed by our team. Your account will be activated once approved (usually within 24 hours).
                </p>
              </div>
            </>
          )}

          <button className="sw-btn" onClick={handleSignup} disabled={loading}>
            {loading
              ? <><span className="spinner-border spinner-border-sm" /> {loadingText}</>
              : "Create Account →"}
          </button>

          <p className="sw-footer">
            Already have an account?{" "}
            <Link to={`/login?role=${role}`}>Sign in</Link>
          </p>
        </div>
      </div>

      {/* ── OTP Verification Modal ── */}
      {showOTP && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20
        }}>
          <div style={{
            background: "white", borderRadius: 24, padding: 32, width: "100%", maxWidth: 400,
            boxShadow: "0 24px 48px rgba(0,0,0,0.2)", textAlign: "center", animation: "swFadeIn 0.3s ease"
          }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>🛡️</div>
            <h3 style={{ margin: "0 0 8px", fontFamily: "'Playfair Display', serif", color: "#1a2744" }}>Verify Identity</h3>
            <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.5 }}>
              We've sent a 6-digit OTP to the email registered with this Advocate Number. Please enter it below.
            </p>
            
            {error && <div className="sw-error" style={{ marginBottom: 16, textAlign: "left" }}>{error}</div>}

            <input 
              type="text" 
              maxLength={6}
              value={enteredOTP}
              onChange={(e) => setEnteredOTP(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              style={{
                width: "100%", padding: "16px", borderRadius: 12, border: "2px solid #e5e7eb",
                fontSize: "1.5rem", letterSpacing: "8px", textAlign: "center", fontWeight: 700,
                color: "#1a2744", outline: "none", marginBottom: 24
              }}
            />

            <button 
              onClick={handleVerifyOTP} 
              disabled={loading || enteredOTP.length !== 6}
              style={{
                width: "100%", padding: "14px", borderRadius: 50, border: "none",
                background: "linear-gradient(135deg,#1a2744,#243460)", color: "white",
                fontWeight: 700, cursor: "pointer", opacity: (loading || enteredOTP.length !== 6) ? 0.7 : 1
              }}
            >
              {loading ? "Verifying..." : "Verify & Complete Signup"}
            </button>
            <button 
              onClick={() => { setShowOTP(false); setLoading(false); setError(""); }}
              style={{
                width: "100%", padding: "12px", borderRadius: 50, border: "none",
                background: "transparent", color: "#6b7280", fontWeight: 600,
                cursor: "pointer", marginTop: 8
              }}
            >
              Cancel
            </button>
          </div>
          <style>{`@keyframes swFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
      )}
    </>
  );
}
