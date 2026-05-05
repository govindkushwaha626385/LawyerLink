import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) { setUserData(snap.data()); setForm(snap.data()); }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    if (e.target.name === "languages") {
      const options = Array.from(e.target.selectedOptions, option => option.value);
      setForm({ ...form, languages: options });
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };
  const handleUpdate = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(docRef, form);
      setUserData(form);
      setEditing(false);
    } catch (err) {
      alert("Error updating profile ❌");
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div className="spinner-border" style={{ color: "#1a2744" }} role="status" />
      <p className="mt-3" style={{ color: "#6b7280", fontFamily: "Inter,sans-serif" }}>Loading profile...</p>
    </div>
  );

  if (!userData) return (
    <div style={{ textAlign: "center", padding: "60px", fontFamily: "Inter,sans-serif", color: "#6b7280" }}>No user data found.</div>
  );

  const isLawyer = userData.role === "lawyer";

  const InfoRow = ({ label, value }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 16 }}>
      <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.8px", color: "#9ca3af", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1a2744" }}>{value || "—"}</span>
    </div>
  );

  return (
    <>
      <style>{`
        .pr-wrapper {
          min-height: 100vh;
          background: linear-gradient(135deg, #f0f4ff 0%, #f8f9fc 50%, #fdf8ee 100%);
          padding: 40px 20px 60px; font-family: 'Inter', sans-serif;
        }
        .pr-container { max-width: 760px; margin: 0 auto; }

        /* Avatar card */
        .pr-avatar-card {
          background: linear-gradient(-45deg, #0f1d3a, #1a2744, #243460);
          background-size: 400% 400%; animation: prGrad 10s ease infinite;
          border-radius: 24px; padding: 44px 32px; text-align: center; margin-bottom: 24px;
          position: relative; overflow: hidden; box-shadow: 0 8px 32px rgba(26,39,68,0.2);
        }
        @keyframes prGrad { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .pr-avatar {
          width: 96px; height: 96px; border-radius: 50%; margin: 0 auto 16px;
          border: 4px solid rgba(201,168,76,0.5); display: flex; align-items: center; justify-content: center;
          font-size: 2.2rem; overflow: hidden;
          background: linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05));
        }
        .pr-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .pr-name { font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 700; color: white; margin-bottom: 6px; }
        .pr-role-badge {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(201,168,76,0.15); border: 1px solid rgba(201,168,76,0.3);
          color: #e8c96d; border-radius: 50px; padding: 4px 14px;
          font-size: 0.75rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
        }
        .pr-email-chip {
          display: inline-flex; align-items: center; gap: 6px; margin-top: 10px;
          background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6);
          border-radius: 50px; padding: 4px 14px; font-size: 0.78rem;
        }

        /* Info card */
        .pr-card {
          background: white; border-radius: 24px; padding: 32px;
          box-shadow: 0 2px 16px rgba(26,39,68,0.07); border: 1px solid rgba(26,39,68,0.04);
          margin-bottom: 20px;
        }
        .pr-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 26px; }
        .pr-card-title { font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 700; color: #1a2744; margin: 0; display: flex; align-items: center; gap: 8px; }
        .pr-edit-btn { background: transparent; border: 1.5px solid #1a2744; border-radius: 50px; padding: 7px 18px; font-size: 0.8rem; font-weight: 700; color: #1a2744; cursor: pointer; transition: all 0.2s; }
        .pr-edit-btn:hover { background: #1a2744; color: white; }
        .pr-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 32px; }
        @media (max-width: 540px) { .pr-info-grid { grid-template-columns: 1fr; } }

        .pr-divider { height: 1px; background: #f3f4f6; margin: 18px 0; }
        .pr-section-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1px; color: #c9a84c; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .pr-section-label::after { content: ''; flex: 1; height: 1px; background: #fef3c7; }

        /* Edit form */
        .pr-input { display: block; width: 100%; border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 9px 13px; font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #1a2744; background: #fafafa; outline: none; transition: all 0.25s; margin-bottom: 14px; }
        .pr-input:focus { border-color: #1a2744; background: white; box-shadow: 0 0 0 3px rgba(26,39,68,0.06); }
        .pr-label { display: block; font-size: 0.75rem; font-weight: 600; color: #6b7280; margin-bottom: 5px; letter-spacing: 0.2px; }
        .pr-edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
        @media (max-width: 540px) { .pr-edit-grid { grid-template-columns: 1fr; } }

        .pr-action-row { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; }
        .pr-btn-cancel { background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 50px; padding: 9px 22px; font-size: 0.85rem; font-weight: 600; color: #374151; cursor: pointer; transition: all 0.2s; }
        .pr-btn-cancel:hover { background: #f3f4f6; }
        .pr-btn-save { background: linear-gradient(135deg, #1a2744, #243460); border: none; border-radius: 50px; padding: 9px 24px; font-size: 0.85rem; font-weight: 700; color: white; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
        .pr-btn-save:hover { box-shadow: 0 6px 18px rgba(26,39,68,0.3); transform: translateY(-1px); }
        .pr-btn-save:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>

      <div className="pr-wrapper">
        <div className="pr-container">
          {/* Avatar card */}
          <div className="pr-avatar-card">
            <div className="pr-avatar">
              {userData.image
                ? <img src={userData.image} alt="Profile" />
                : "👤"}
            </div>
            <h2 className="pr-name">{userData.fullName || "Your Name"}</h2>
            <span className="pr-role-badge">
              {isLawyer ? "👨‍⚖️" : "⚖️"} {userData.role?.toUpperCase()}
            </span>
            {isLawyer && (
              <div style={{ marginTop: 6 }}>
                {(userData.verificationStatus === "approved" || (userData.verified && !userData.verificationStatus)) ? (
                  <span style={{ background: "#d1fae5", color: "#065f46", borderRadius: "50px", padding: "3px 14px", fontSize: "0.78rem", fontWeight: 700 }}>
                    ✅ Verified Lawyer
                  </span>
                ) : userData.verificationStatus === "rejected" ? (
                  <span style={{ background: "#fee2e2", color: "#991b1b", borderRadius: "50px", padding: "3px 14px", fontSize: "0.78rem", fontWeight: 700 }}>
                    ❌ Verification Rejected
                  </span>
                ) : (
                  <span style={{ background: "#fef9c3", color: "#854d0e", borderRadius: "50px", padding: "3px 14px", fontSize: "0.78rem", fontWeight: 700 }}>
                    ⏳ Verification Pending
                  </span>
                )}
              </div>
            )}
            {isLawyer && userData.rating > 0 && (
              <div style={{ marginTop: 8, fontSize: "0.82rem", color: "#6b7280" }}>
                {"⭐".repeat(Math.round(userData.rating))}{"☆".repeat(5 - Math.round(userData.rating))}&nbsp;
                <strong style={{ color: "#1a2744" }}>{userData.rating}</strong>
                <span> ({userData.reviewCount || 0} reviews)</span>
              </div>
            )}
            <div><span className="pr-email-chip">✉️ {userData.email}</span></div>
          </div>

          {/* Info / Edit card */}
          <div className="pr-card">
            <div className="pr-card-header">
              <h3 className="pr-card-title">👤 Profile Details</h3>
              {!editing && (
                <button className="pr-edit-btn" onClick={() => setEditing(true)}>✏️ Edit Profile</button>
              )}
            </div>

            {editing ? (
              <>
                <div className="pr-section-label">Personal Information</div>
                <div className="pr-edit-grid">
                  <div>
                    <label className="pr-label">Full Name</label>
                    <input className="pr-input" name="fullName" value={form.fullName || ""} onChange={handleChange} placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="pr-label">Phone Number</label>
                    <input className="pr-input" name="phone" value={form.phone || ""} onChange={handleChange} placeholder="+91 9876543210" />
                  </div>
                </div>
                <div>
                  <label className="pr-label">Address</label>
                  <input className="pr-input" name="address" value={form.address || ""} onChange={handleChange} placeholder="City, State" />
                </div>
                <div>
                  <label className="pr-label">Email (cannot be changed)</label>
                  <input className="pr-input" value={form.email || ""} disabled style={{ opacity: 0.6 }} />
                </div>

                {isLawyer && (
                  <>
                    <div className="pr-divider" />
                    <div className="pr-section-label">Professional Details</div>
                    <div className="pr-edit-grid">
                      <div>
                        <label className="pr-label">Years of Experience</label>
                        <input className="pr-input" type="number" name="experience" value={form.experience || ""} onChange={handleChange} placeholder="e.g. 5" />
                      </div>
                      <div>
                        <label className="pr-label">Advocate Number (cannot be changed)</label>
                        <input className="pr-input" value={form.advocateNumber || ""} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
                      </div>
                    </div>
                    {form.registrationDate && (
                      <div>
                        <label className="pr-label">Bar Council Registration Date (cannot be changed)</label>
                        <input className="pr-input" value={new Date(form.registrationDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
                      </div>
                    )}
                    <div className="pr-edit-grid">
                      <div>
                        <label className="pr-label">City</label>
                        <input className="pr-input" name="city" value={form.city || ""} onChange={handleChange} placeholder="e.g. Delhi" />
                      </div>
                      <div>
                        <label className="pr-label">Primary Court</label>
                        <input className="pr-input" name="court" value={form.court || ""} onChange={handleChange} placeholder="e.g. Delhi High Court" />
                      </div>
                    </div>
                    <div>
                      <label className="pr-label">Languages Spoken (Cmd/Ctrl + Click to select multiple)</label>
                      <select className="pr-input" name="languages" multiple style={{ height: "100px", padding: "8px" }} value={form.languages || []} onChange={handleChange}>
                        {["English", "Hindi", "Marathi", "Gujarati", "Tamil", "Telugu", "Bengali", "Kannada", "Malayalam", "Punjabi", "Urdu"]
                      .map(l => <option key={l} value={l} style={{ padding: "4px 8px", cursor: "pointer" }}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="pr-label">Specialization / Category</label>
                      <select className="pr-input" name="category" value={form.category || ""} onChange={handleChange}>
                        <option value="">Select</option>
                        <option value="Criminal Law">Criminal Law</option>
                        <option value="Civil Law">Civil Law</option>
                        <option value="Corporate Law">Corporate Law</option>
                        <option value="Family Law">Family Law</option>
                        <option value="Property Law">Property Law</option>
                        <option value="Cyber Law">Cyber Law</option>
                        <option value="Labour Law">Labour Law</option>
                        <option value="Tax Law">Tax Law</option>
                        <option value="Constitutional Law">Constitutional Law</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="pr-action-row">
                  <button className="pr-btn-cancel" onClick={() => { setEditing(false); setForm(userData); }}>Cancel</button>
                  <button className="pr-btn-save" onClick={handleUpdate} disabled={saving}>
                    {saving ? <span className="spinner-border spinner-border-sm" /> : "💾 Save Changes"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="pr-section-label">Personal Information</div>
                <div className="pr-info-grid">
                  <InfoRow label="Full Name" value={userData.fullName} />
                  <InfoRow label="Phone" value={userData.phone} />
                  <InfoRow label="Address" value={userData.address} />
                  <InfoRow label="Member Since" value={userData.createdAt ? new Date(userData.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : null} />
                </div>

                {isLawyer && (
                  <>
                    <div className="pr-divider" />
                    <div className="pr-section-label">Professional Details</div>
                    <div className="pr-info-grid">
                      <InfoRow label="Experience" value={userData.experience ? `${userData.experience} years` : null} />
                      <InfoRow label="Advocate Number" value={userData.advocateNumber} />
                      <InfoRow label="Specialization" value={userData.category} />
                      <InfoRow label="Cases Handled" value={userData.casesHandled || "0"} />
                      <InfoRow label="City" value={userData.city} />
                      <InfoRow label="Primary Court" value={userData.court} />
                      <InfoRow label="Languages" value={userData.languages?.length ? userData.languages.join(", ") : null} />
                      {userData.registrationDate && (
                        <InfoRow
                          label="Bar Council Registration Date"
                          value={new Date(userData.registrationDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                        />
                      )}
                      {userData.verified && (
                        <InfoRow label="Verification Status" value="✅ Verified by Bar Council" />
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
