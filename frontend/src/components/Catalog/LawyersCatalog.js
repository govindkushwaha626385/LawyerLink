// src/components/Catalog/LawyersCatalog.js
import React, { useEffect, useState, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../../firebase";
import BookingModal from "../BookingModal";

export default function LawyersCatalog() {
  const [lawyers, setLawyers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [booking, setBooking] = useState(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchLawyers = async () => {
      const snapshot = await getDocs(collection(db, "users"));
      const lawyerList = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((u) => u.role === "lawyer")
        .filter((u) => u.verificationStatus === "approved" || (u.verified && !u.verificationStatus));
      setLawyers(lawyerList);
      setFiltered(lawyerList);
    };
    fetchLawyers();
  }, []);

  const handleFilter = useCallback(() => {
    let result = lawyers;
    if (search.trim()) result = result.filter(l => l.fullName?.toLowerCase().includes(search.toLowerCase()));
    if (category) result = result.filter(l => l.category === category);
    if (location.trim()) result = result.filter(l => l.address?.toLowerCase().includes(location.toLowerCase()));
    setFiltered(result);
  }, [lawyers, search, category, location]);

  useEffect(() => { handleFilter(); }, [handleFilter]);

  const initials = (name) => name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??";
  const pastelBg = (name) => {
    const colors = ["#eef2ff", "#f0fdf4", "#fff7ed", "#fdf4ff", "#f0f9ff", "#fef9c3"];
    const idx = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[idx];
  };
  const pastelText = (name) => {
    const colors = ["#4338ca", "#15803d", "#c2410c", "#9333ea", "#0369a1", "#854d0e"];
    const idx = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[idx];
  };

  return (
    <>
      <style>{`
        .cat-wrapper {
          min-height: 100vh;
          background: linear-gradient(135deg, #f0f4ff 0%, #f8f9fc 50%, #fdf8ee 100%);
          padding: 40px 20px 60px;
          font-family: 'Inter', sans-serif;
        }
        .cat-hero { text-align: center; margin-bottom: 36px; }
        .cat-hero-title { font-family: 'Playfair Display', serif; font-size: 2.2rem; font-weight: 800; color: #1a2744; margin-bottom: 10px; }
        .cat-hero-title span { color: #c9a84c; }
        .cat-hero-sub { font-size: 0.95rem; color: #6b7280; max-width: 500px; margin: 0 auto; }
        .cat-gold-bar { height: 3px; width: 56px; background: linear-gradient(90deg,#c9a84c,#e8c96d); border-radius: 2px; margin: 12px auto 0; }

        /* Filter bar */
        .cat-filter-bar {
          background: white; border-radius: 20px; padding: 24px 28px;
          box-shadow: 0 2px 16px rgba(26,39,68,0.07); margin-bottom: 32px;
          display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;
          border: 1px solid rgba(26,39,68,0.04);
        }
        @media (max-width: 700px) { .cat-filter-bar { grid-template-columns: 1fr; } }
        .cat-filter-input {
          width: 100%; border: 1.5px solid #e5e7eb; border-radius: 12px;
          padding: 10px 14px; font-family: 'Inter', sans-serif;
          font-size: 0.875rem; color: #1a2744; background: #fafafa;
          outline: none; transition: all 0.25s ease;
        }
        .cat-filter-input:focus { border-color: #1a2744; background: white; box-shadow: 0 0 0 3px rgba(26,39,68,0.06); }
        .cat-filter-input::placeholder { color: #9ca3af; }

        /* Stats row */
        .cat-stats { text-align: center; color: #6b7280; font-size: 0.85rem; margin-bottom: 24px; font-weight: 500; }
        .cat-stats strong { color: #1a2744; }

        /* Lawyer cards */
        .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 22px; }
        .cat-card {
          background: white; border-radius: 20px; overflow: hidden;
          box-shadow: 0 2px 14px rgba(26,39,68,0.07); border: 1px solid rgba(26,39,68,0.04);
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1); display: flex; flex-direction: column;
        }
        .cat-card:hover { transform: translateY(-7px); box-shadow: 0 18px 44px rgba(26,39,68,0.14); }
        .cat-card-top {
          padding: 28px 24px 20px; text-align: center;
          background: linear-gradient(135deg, #f8faff, #f0f4ff);
          border-bottom: 1px solid #f0f0f0;
        }
        .cat-avatar {
          width: 76px; height: 76px; border-radius: 50%; margin: 0 auto 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; font-weight: 800;
          border: 3px solid white;
          box-shadow: 0 4px 14px rgba(26,39,68,0.12);
        }
        .cat-name { font-family: 'Playfair Display', serif; font-size: 1.05rem; font-weight: 700; color: #1a2744; margin-bottom: 4px; }
        .cat-category {
          display: inline-block; background: #eef2ff; color: #4338ca;
          border-radius: 50px; padding: 3px 12px;
          font-size: 0.72rem; font-weight: 700; letter-spacing: 0.3px;
        }
        .cat-card-body { padding: 18px 24px; flex-grow: 1; }
        .cat-meta { font-size: 0.8rem; color: #6b7280; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
        .cat-advocate-id {
          margin-top: 12px; padding: 8px 14px;
          background: #fafafa; border-radius: 8px;
          font-size: 0.75rem; color: #9ca3af; border: 1px solid #f0f0f0;
        }
        .cat-advocate-id strong { color: #374151; }
        .cat-card-footer { padding: 16px 24px; border-top: 1px solid #f3f4f6; display: flex; gap: 8px; flex-wrap: wrap; }
        .cat-contact-btn {
          flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px;
          border-radius: 50px; padding: 8px 14px; font-size: 0.78rem; font-weight: 700;
          cursor: pointer; text-decoration: none; border: 1.5px solid; transition: all 0.2s;
          min-width: 80px;
        }
        .cat-btn-call { color: #1a2744; border-color: #1a2744; }
        .cat-btn-call:hover { background: #1a2744; color: white; }
        .cat-btn-email { color: #16a34a; border-color: #16a34a; }
        .cat-btn-email:hover { background: #16a34a; color: white; }
        .cat-btn-wa { color: #16a34a; border-color: #dcfce7; background: #f0fdf4; }
        .cat-btn-wa:hover { background: #16a34a; color: white; border-color: #16a34a; }
        .cat-btn-book { background: linear-gradient(135deg, #1a2744, #243460); color: white; border-color: transparent; width: 100%; margin-top: 6px; }
        .cat-btn-book:hover { box-shadow: 0 4px 14px rgba(26,39,68,0.25); transform: translateY(-1px); }

        /* Empty */
        .cat-empty { text-align: center; padding: 60px 20px; color: #9ca3af; }
        .cat-empty-icon { font-size: 3.5rem; margin-bottom: 14px; }
        .cat-empty h4 { font-family: 'Playfair Display', serif; color: #374151; }
      `}</style>

      <div className="cat-wrapper">
        <div className="container-lg">
          {/* Hero */}
          <div className="cat-hero">
            <h1 className="cat-hero-title">Find the Right <span>Lawyer</span></h1>
            <p className="cat-hero-sub">Browse verified legal professionals and connect instantly</p>
            <div className="cat-gold-bar" />
          </div>

          {/* Filter bar */}
          <div className="cat-filter-bar">
            <input className="cat-filter-input" type="text" placeholder="🔍 Search by name..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="cat-filter-input" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All Specializations</option>
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
            <input className="cat-filter-input" type="text" placeholder="📍 Search by location..."
              value={location} onChange={e => setLocation(e.target.value)} />
          </div>

          {/* Stats */}
          <p className="cat-stats">
            Showing <strong>{filtered.length}</strong> lawyer{filtered.length !== 1 ? "s" : ""}
            {(search || category || location) && " matching your filters"}
          </p>

          {/* Cards */}
          {filtered.length > 0 ? (
            <div className="cat-grid">
              {filtered.map((lawyer) => (
                <div key={lawyer.id} className="cat-card">
                  <div className="cat-card-top">
                    {lawyer.image ? (
                      <img src={lawyer.image} alt={lawyer.fullName}
                        style={{ width: 76, height: 76, borderRadius: "50%", objectFit: "cover", margin: "0 auto 14px", display: "block", border: "3px solid white", boxShadow: "0 4px 14px rgba(26,39,68,0.12)" }} />
                    ) : (
                      <div className="cat-avatar" style={{ background: pastelBg(lawyer.fullName), color: pastelText(lawyer.fullName) }}>
                        {initials(lawyer.fullName)}
                      </div>
                    )}
                    <h3 className="cat-name">{lawyer.fullName || "Unnamed Lawyer"}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
                      <span className="cat-category">{lawyer.category || "General Practice"}</span>
                      {lawyer.verified && (
                        <span style={{ background: "#d1fae5", color: "#065f46", borderRadius: "50px", padding: "2px 10px", fontSize: "0.7rem", fontWeight: 700 }}>✅ Verified</span>
                      )}
                    </div>
                  </div>

                  <div className="cat-card-body">
                    <p className="cat-meta">⏱️ <strong>{lawyer.experience || 0}</strong> years experience</p>
                    <p className="cat-meta">📍 {lawyer.address?.split(",")[0] || "Location not specified"}</p>
                    <p className="cat-meta">📧 {lawyer.email}</p>
                    {lawyer.phone && <p className="cat-meta">📞 {lawyer.phone}</p>}
                    {lawyer.rating > 0 && (
                      <p className="cat-meta">
                        {"⭐".repeat(Math.round(lawyer.rating))}{"☆".repeat(5 - Math.round(lawyer.rating))} <strong>{lawyer.rating}</strong>
                        <span style={{ color: "#9ca3af" }}> ({lawyer.reviewCount || 0} reviews)</span>
                      </p>
                    )}
                    <div className="cat-advocate-id">
                      Advocate ID: <strong>{lawyer.advocateNumber || "N/A"}</strong>
                      {lawyer.registrationDate && (
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 2 }}>
                          Reg. Date: <strong>{new Date(lawyer.registrationDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="cat-card-footer">
                    <a href={`mailto:${lawyer.email}`} className="cat-contact-btn cat-btn-email">✉️ Email</a>
                    {lawyer.phone && (
                      <>
                        <a href={`tel:${lawyer.phone}`} className="cat-contact-btn cat-btn-call">📞 Call</a>
                        <a href={`https://wa.me/${lawyer.phone.replace(/[^0-9]/g, "")}`}
                          target="_blank" rel="noopener noreferrer" className="cat-contact-btn cat-btn-wa">
                          💬 WhatsApp
                        </a>
                      </>
                    )}
                    {currentUser && (
                      <button onClick={() => setBooking(lawyer)} className="cat-contact-btn cat-btn-book">
                        📅 Book Consultation
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="cat-empty">
              <div className="cat-empty-icon">🔍</div>
              <h4>No lawyers found</h4>
              <p>Try adjusting your search filters.</p>
            </div>
          )}
        </div>
      </div>
      {booking && <BookingModal lawyer={booking} currentUser={currentUser} onClose={() => setBooking(null)} />}
    </>
  );
}
