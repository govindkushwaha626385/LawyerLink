import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";

async function sendConsultationEmail(lawyerEmail, lawyerName, booking) {
  try {
    await fetch(`${BACKEND}/send-consultation-email/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lawyerEmail, lawyerName, booking }),
    });
  } catch (_) {}
}

export default function BookingModal({ lawyer, onClose, currentUser }) {
  const [form, setForm] = useState({
    name: currentUser?.displayName || "",
    email: currentUser?.email || "",
    phone: "",
    date: "",
    time: "",
    caseType: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.date || !form.message) return;
    setSubmitting(true);
    try {
      const lName = lawyer.fullName || lawyer.name || "Lawyer";
      const booking = {
        lawyerId: lawyer.id,
        lawyerName: lName,
        lawyerEmail: lawyer.email,
        litigantName: form.name,
        litigantEmail: form.email,
        litigantPhone: form.phone,
        preferredDate: form.date,
        preferredTime: form.time,
        caseType: form.caseType,
        message: form.message,
        status: "pending",
        litigantId: currentUser?.uid || null,
        createdAt: serverTimestamp(),
        conversation: [],
      };
      await addDoc(collection(db, "consultations"), booking);
      await sendConsultationEmail(lawyer.email, lName, { ...booking, createdAt: new Date().toISOString() });
      setDone(true);
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "white", borderRadius: 20, width: "min(520px,100%)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
        <div style={{ background: "linear-gradient(135deg,#1a2744,#243460)", padding: "24px 28px", borderRadius: "20px 20px 0 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", margin: "0 0 4px" }}>📅 Book Consultation</p>
              <h3 style={{ fontFamily: "'Playfair Display',serif", color: "white", margin: 0, fontSize: "1.15rem" }}>with {lawyer.fullName || lawyer.name}</h3>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: ".8rem", margin: "4px 0 0" }}>{lawyer.category || "Legal Expert"}</p>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.2)", borderRadius: 50, padding: "4px 12px", color: "rgba(255,255,255,0.8)", cursor: "pointer", fontSize: ".8rem" }}>✕</button>
          </div>
        </div>

        <div style={{ padding: "24px 28px" }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>✅</div>
              <h4 style={{ fontFamily: "'Playfair Display',serif", color: "#1a2744", margin: "0 0 8px" }}>Booking Sent!</h4>
              <p style={{ color: "#6b7280", fontSize: ".88rem" }}>
                {lawyer.fullName || lawyer.name} has been notified by email. They will review your request and respond shortly.
              </p>
              <button onClick={onClose} style={{ marginTop: 16, background: "linear-gradient(135deg,#1a2744,#243460)", color: "white", border: "none", borderRadius: 50, padding: "10px 28px", fontWeight: 700, cursor: "pointer" }}>Close</button>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                {[
                  { label: "Your Name *", key: "name", type: "text", placeholder: "Full name" },
                  { label: "Your Email *", key: "email", type: "email", placeholder: "your@email.com" },
                  { label: "Phone", key: "phone", type: "tel", placeholder: "+91 XXXXX XXXXX" },
                  { label: "Case Type", key: "caseType", type: "text", placeholder: "e.g. Property, Criminal" },
                  { label: "Preferred Date *", key: "date", type: "date" },
                  { label: "Preferred Time", key: "time", type: "time" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: ".72rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: ".6px" }}>{f.label}</label>
                    <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder}
                      style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "9px 12px", fontSize: ".85rem", fontFamily: "Inter,sans-serif", outline: "none", boxSizing: "border-box", marginTop: 4 }} />
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: ".72rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: ".6px" }}>Describe Your Legal Issue *</label>
                <textarea value={form.message} onChange={e => set("message", e.target.value)} rows={4} placeholder="Briefly describe your legal problem and what help you need..."
                  style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", fontSize: ".85rem", fontFamily: "Inter,sans-serif", outline: "none", resize: "vertical", boxSizing: "border-box", marginTop: 4 }} />
              </div>
              <button onClick={handleSubmit} disabled={submitting || !form.name || !form.email || !form.date || !form.message}
                style={{ width: "100%", background: "linear-gradient(135deg,#c9a84c,#e8c96d)", color: "#1a2744", border: "none", borderRadius: 50, padding: "13px", fontWeight: 800, fontSize: ".9rem", cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
                {submitting ? "Sending..." : "📅 Send Consultation Request"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
