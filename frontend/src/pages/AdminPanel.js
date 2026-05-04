// src/pages/AdminPanel.js
import React, { useEffect, useState, useMemo } from "react";
import {
  collection, getDocs, doc, updateDoc, deleteDoc,
  query, where
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import AdminAnalytics from "../components/Admin/AdminAnalytics";
import AdminMasterData from "../components/Admin/AdminMasterData";

const ADMIN_EMAILS = ["govindkushwahabusiness@gmail.com"]; // ← add more admin emails here

const TABS = ["Overview", "Analytics", "Lawyers", "Litigants", "Cases", "Reviews", "Master Data"];

export default function AdminPanel() {
  const [activeTab, setActiveTab]     = useState("Overview");
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [lawyers, setLawyers]         = useState([]);
  const [litigants, setLitigants]     = useState([]);
  const [cases, setCases]             = useState([]);
  const [reviews, setReviews]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filterVerified, setFilterVerified] = useState("all"); // all | verified | pending
  const [filterStatus, setFilterStatus]     = useState("all");
  const [selectedLawyer, setSelectedLawyer] = useState(null);
  const [toast, setToast]             = useState("");
  const navigate = useNavigate();

  // Auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
      if (u && !ADMIN_EMAILS.includes(u.email)) navigate("/");
    });
    return () => unsub();
  }, [navigate]);

  // Fetch all data
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [lawyerSnap, litigantSnap, caseSnap, reviewSnap] = await Promise.all([
          getDocs(query(collection(db, "users"), where("role", "==", "lawyer"))),
          getDocs(query(collection(db, "users"), where("role", "==", "litigant"))),
          getDocs(collection(db, "cases")),
          getDocs(collection(db, "reviews")),
        ]);
        setLawyers(lawyerSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLitigants(litigantSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setCases(caseSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setReviews(reviewSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Admin fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // ── Actions ──────────────────────────────
  const toggleVerify = async (lawyerId, current) => {
    await updateDoc(doc(db, "users", lawyerId), { verified: !current });
    setLawyers(prev => prev.map(l => l.id === lawyerId ? { ...l, verified: !current } : l));
    showToast(current ? "✅ Verification revoked" : "✅ Lawyer verified successfully");
  };

  // updateCaseStatus removed (Change Status column was removed from UI)

  const deleteReview = async (reviewId) => {
    if (!window.confirm("Delete this review permanently?")) return;
    await deleteDoc(doc(db, "reviews", reviewId));
    setReviews(prev => prev.filter(r => r.id !== reviewId));
    showToast("🗑️ Review deleted");
  };

  // ── Export CSV ────────────────────────────
  const exportCSV = (data, filename) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]).filter(k => k !== "id");
    const rows = [
      keys.join(","),
      ...data.map(row => keys.map(k => `"${(row[k] ?? "").toString().replace(/"/g, '""')}"`).join(","))
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = filename;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Stats ─────────────────────────────────
  const stats = useMemo(() => ({
    totalLawyers:    lawyers.length,
    verified:        lawyers.filter(l => l.verified).length,
    pendingVerify:   lawyers.filter(l => !l.verified).length,
    totalLitigants:  litigants.length,
    totalCases:      cases.length,
    openCases:       cases.filter(c => c.status === "Open").length,
    inProgressCases: cases.filter(c => c.status === "In Progress").length,
    closedCases:     cases.filter(c => c.status === "Closed").length,
    totalReviews:    reviews.length,
    avgRating:       reviews.length
      ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
      : "—",
  }), [lawyers, litigants, cases, reviews]);

  // ── Filtered data ─────────────────────────
  const filteredLawyers = useMemo(() => {
    let data = lawyers;
    if (search) data = data.filter(l =>
      l.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.category?.toLowerCase().includes(search.toLowerCase())
    );
    if (filterVerified === "verified") data = data.filter(l => l.verified);
    if (filterVerified === "pending")  data = data.filter(l => !l.verified);
    return data;
  }, [lawyers, search, filterVerified]);

  const filteredLitigants = useMemo(() => {
    if (!search) return litigants;
    return litigants.filter(l =>
      l.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase())
    );
  }, [litigants, search]);

  const filteredCases = useMemo(() => {
    let data = cases;
    if (search) data = data.filter(c =>
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.clientEmail?.toLowerCase().includes(search.toLowerCase())
    );
    if (filterStatus !== "all") data = data.filter(c => c.status === filterStatus);
    return data;
  }, [cases, search, filterStatus]);

  const filteredReviews = useMemo(() => {
    if (!search) return reviews;
    return reviews.filter(r =>
      r.litigantEmail?.toLowerCase().includes(search.toLowerCase()) ||
      r.caseTitle?.toLowerCase().includes(search.toLowerCase())
    );
  }, [reviews, search]);

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", gap:12 }}>
      <div style={{ width:44, height:44, border:"3px solid #eef2ff", borderTop:"3px solid #1a2744", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <p style={{ color:"#9ca3af", fontFamily:"Inter,sans-serif", fontSize:"0.85rem" }}>Loading admin data…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );



  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700&display=swap');

        .adm { min-height:100vh; background:#f0f4ff; font-family:'Inter',sans-serif; padding:0 0 60px; }

        /* ── Top bar ── */
        .adm-topbar { background:linear-gradient(135deg,#1a2744 0%,#243460 100%); padding:24px 32px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
        .adm-topbar-left { display:flex; align-items:center; gap:14px; }
        .adm-logo { font-family:'Playfair Display',serif; font-size:1.4rem; font-weight:700; color:white; margin:0; }
        .adm-logo span { color:#c9a84c; }
        .adm-badge-admin { background:rgba(201,168,76,0.2); border:1px solid rgba(201,168,76,0.4); border-radius:50px; padding:3px 12px; font-size:0.72rem; font-weight:700; color:#c9a84c; text-transform:uppercase; letter-spacing:1px; }
        .adm-topbar-right { display:flex; align-items:center; gap:10px; }
        .adm-user-chip { background:rgba(255,255,255,0.1); border-radius:50px; padding:6px 14px; font-size:0.78rem; color:rgba(255,255,255,0.75); }

        /* ── Content ── */
        .adm-content { max-width:1300px; margin:0 auto; padding:32px 20px; }

        /* ── Tabs ── */
        .adm-tabs { display:flex; gap:4px; background:white; border-radius:16px; padding:6px; box-shadow:0 2px 12px rgba(26,39,68,0.07); margin-bottom:28px; overflow-x:auto; }
        .adm-tab { padding:9px 20px; border-radius:12px; font-size:0.84rem; font-weight:600; color:#6b7280; cursor:pointer; border:none; background:none; white-space:nowrap; transition:all 0.2s; font-family:'Inter',sans-serif; }
        .adm-tab.active { background:linear-gradient(135deg,#1a2744,#243460); color:white; box-shadow:0 4px 12px rgba(26,39,68,0.3); }
        .adm-tab:hover:not(.active) { background:#f0f4ff; color:#1a2744; }

        /* ── Stats grid ── */
        .adm-stats { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:14px; margin-bottom:28px; }
        .adm-stat { background:white; border-radius:18px; padding:20px 22px; box-shadow:0 2px 12px rgba(26,39,68,0.06); border:1px solid rgba(26,39,68,0.04); transition:transform .2s; }
        .adm-stat:hover { transform:translateY(-2px); }
        .adm-stat-icon { font-size:1.6rem; margin-bottom:8px; }
        .adm-stat-num { font-family:'Playfair Display',serif; font-size:2rem; font-weight:700; color:#1a2744; margin:0; line-height:1; }
        .adm-stat-label { font-size:0.72rem; color:#9ca3af; text-transform:uppercase; letter-spacing:0.6px; margin-top:4px; }
        .adm-stat.accent { background:linear-gradient(135deg,#1a2744,#243460); }
        .adm-stat.accent .adm-stat-num, .adm-stat.accent .adm-stat-label, .adm-stat.accent .adm-stat-icon { color:white; }
        .adm-stat.accent .adm-stat-label { opacity:0.65; }
        .adm-stat.gold { background:linear-gradient(135deg,#c9a84c,#e8c96d); }
        .adm-stat.gold .adm-stat-num, .adm-stat.gold .adm-stat-label { color:#1a2744; }

        /* ── Card ── */
        .adm-card { background:white; border-radius:20px; box-shadow:0 2px 14px rgba(26,39,68,0.07); border:1px solid rgba(26,39,68,0.04); overflow:hidden; }
        .adm-card-header { padding:18px 24px; border-bottom:1px solid #f3f4f6; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; }
        .adm-card-title { font-size:0.95rem; font-weight:700; color:#1a2744; margin:0; }
        .adm-card-body { padding:0; }

        /* ── Toolbar ── */
        .adm-toolbar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; padding:14px 24px; border-bottom:1px solid #f9fafb; }
        .adm-search-input { flex:1; min-width:200px; border:1.5px solid #e5e7eb; border-radius:50px; padding:8px 16px 8px 36px; font-family:'Inter',sans-serif; font-size:0.85rem; color:#1a2744; outline:none; background:#fafafa url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='M21 21l-4.35-4.35'/%3E%3C/svg%3E") no-repeat 12px center; transition:all .2s; }
        .adm-search-input:focus { border-color:#1a2744; background-color:white; box-shadow:0 0 0 3px rgba(26,39,68,0.06); }
        .adm-filter-select { border:1.5px solid #e5e7eb; border-radius:50px; padding:7px 14px; font-family:'Inter',sans-serif; font-size:0.82rem; color:#374151; outline:none; background:white; cursor:pointer; }
        .adm-export-btn { display:inline-flex; align-items:center; gap:5px; background:#f0f4ff; border:1.5px solid #c7d2fe; border-radius:50px; padding:7px 16px; font-size:0.8rem; font-weight:700; color:#4338ca; cursor:pointer; transition:all .2s; font-family:'Inter',sans-serif; border:none; }
        .adm-export-btn:hover { background:#e0e7ff; }

        /* ── Table ── */
        .adm-table { width:100%; border-collapse:collapse; }
        .adm-table th { text-align:left; font-size:0.68rem; text-transform:uppercase; letter-spacing:0.8px; color:#9ca3af; font-weight:700; padding:10px 18px; border-bottom:1px solid #f3f4f6; white-space:nowrap; }
        .adm-table td { padding:13px 18px; border-bottom:1px solid #f9fafb; font-size:0.84rem; color:#374151; vertical-align:middle; }
        .adm-table tr:last-child td { border-bottom:none; }
        .adm-table tbody tr { transition:background .15s; }
        .adm-table tbody tr:hover td { background:#fafbff; }

        /* ── Badges ── */
        .badge { display:inline-flex; align-items:center; gap:4px; border-radius:50px; padding:3px 11px; font-size:0.7rem; font-weight:700; white-space:nowrap; }
        .badge-verified  { background:#d1fae5; color:#065f46; }
        .badge-pending   { background:#fef3c7; color:#92400e; }
        .badge-open      { background:#dbeafe; color:#1e40af; }
        .badge-progress  { background:#fef3c7; color:#92400e; }
        .badge-closed    { background:#f3f4f6; color:#6b7280; }
        .badge-litigant  { background:#ede9fe; color:#5b21b6; }

        /* Avatars */
        .adm-avatar { width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:800; text-transform:uppercase; flex-shrink:0; }
        .adm-avatar-lawyer   { background:linear-gradient(135deg,#1a2744,#243460); color:white; }
        .adm-avatar-litigant { background:linear-gradient(135deg,#7c3aed,#a855f7); color:white; }
        .adm-name-cell { display:flex; align-items:center; gap:10px; }

        /* ── Action buttons ── */
        .btn-verify   { background:#d1fae5; color:#065f46; border:none; border-radius:50px; padding:5px 14px; font-size:0.75rem; font-weight:700; cursor:pointer; transition:all .2s; font-family:'Inter',sans-serif; }
        .btn-verify:hover { background:#a7f3d0; }
        .btn-revoke   { background:#fee2e2; color:#991b1b; border:none; border-radius:50px; padding:5px 14px; font-size:0.75rem; font-weight:700; cursor:pointer; transition:all .2s; font-family:'Inter',sans-serif; }
        .btn-revoke:hover { background:#fecaca; }
        .btn-delete   { background:#fff1f2; color:#e11d48; border:none; border-radius:50px; padding:5px 14px; font-size:0.75rem; font-weight:700; cursor:pointer; transition:all .2s; font-family:'Inter',sans-serif; }
        .btn-delete:hover { background:#ffe4e6; }

        /* ── Status select ── */
        .status-select { border:1.5px solid #e5e7eb; border-radius:50px; padding:4px 10px; font-family:'Inter',sans-serif; font-size:0.75rem; font-weight:600; outline:none; color:#374151; background:white; cursor:pointer; }

        /* ── Rating stars ── */
        .star-rating { color:#f59e0b; font-size:0.8rem; }

        /* ── Overview chart bars ── */
        .bar-track { height:8px; background:#f3f4f6; border-radius:4px; overflow:hidden; flex:1; }
        .bar-fill { height:100%; border-radius:4px; transition:width 1s ease; }

        /* ── Lawyer detail panel ── */
        .adm-detail-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:9900; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(3px); }
        .adm-detail-panel { background:white; border-radius:24px; width:100%; max-width:520px; box-shadow:0 28px 80px rgba(0,0,0,0.25); overflow:hidden; animation:slideUp .3s ease; }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .adm-detail-header { background:linear-gradient(135deg,#1a2744,#243460); padding:24px 28px; display:flex; align-items:center; gap:14px; }
        .adm-detail-avatar { width:52px; height:52px; border-radius:50%; background:rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; font-size:1.2rem; font-weight:800; color:white; text-transform:uppercase; }
        .adm-detail-name { font-family:'Playfair Display',serif; font-size:1.1rem; color:white; font-weight:700; margin:0 0 3px; }
        .adm-detail-sub { font-size:0.78rem; color:rgba(255,255,255,0.65); margin:0; }
        .adm-detail-body { padding:24px 28px; }
        .adm-detail-row { display:flex; justify-content:space-between; padding:9px 0; border-bottom:1px solid #f9fafb; font-size:0.85rem; }
        .adm-detail-row:last-child { border-bottom:none; }
        .adm-detail-key { color:#9ca3af; font-weight:600; }
        .adm-detail-val { color:#1a2744; font-weight:700; text-align:right; max-width:60%; word-break:break-word; }
        .adm-detail-close { width:100%; background:none; border:1.5px solid #e5e7eb; border-radius:12px; padding:10px; font-family:'Inter',sans-serif; font-size:0.85rem; font-weight:600; color:#374151; cursor:pointer; margin-top:6px; }
        .adm-detail-close:hover { background:#f3f4f6; }

        /* ── Toast ── */
        .adm-toast { position:fixed; bottom:28px; right:28px; background:#1a2744; color:white; border-radius:14px; padding:12px 20px; font-size:0.85rem; font-weight:600; font-family:'Inter',sans-serif; z-index:9999; box-shadow:0 8px 32px rgba(26,39,68,0.3); animation:toastIn .3s ease; }
        @keyframes toastIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

        /* ── Empty ── */
        .adm-empty { text-align:center; padding:48px 24px; color:#9ca3af; }

        /* ── Overview Section ── */
        .adm-overview-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        @media(max-width:700px) { .adm-overview-grid{grid-template-columns:1fr;} .adm-stats{grid-template-columns:repeat(2,1fr);} }
      `}</style>

      {/* Toast */}
      {toast && <div className="adm-toast">{toast}</div>}

      {/* Lawyer Detail Modal */}
      {selectedLawyer && (
        <div className="adm-detail-overlay" onClick={() => setSelectedLawyer(null)}>
          <div className="adm-detail-panel" onClick={e => e.stopPropagation()}>
            <div className="adm-detail-header">
              <div className="adm-detail-avatar">
                {(selectedLawyer.fullName || "L").charAt(0)}
              </div>
              <div>
                <p className="adm-detail-name">{selectedLawyer.fullName || "Unknown"}</p>
                <p className="adm-detail-sub">{selectedLawyer.email}</p>
              </div>
              {selectedLawyer.verified
                ? <span className="badge badge-verified" style={{marginLeft:"auto"}}>✅ Verified</span>
                : <span className="badge badge-pending" style={{marginLeft:"auto"}}>⏳ Pending</span>}
            </div>
            <div className="adm-detail-body">
              {[
                ["Specialization",    selectedLawyer.category || "—"],
                ["Advocate Number",   selectedLawyer.advocateNumber || "—"],
                ["Experience",        selectedLawyer.experience ? selectedLawyer.experience + " yrs" : "—"],
                ["Phone",             selectedLawyer.phone || "—"],
                ["City",              selectedLawyer.city || "—"],
                ["Court",             selectedLawyer.court || "—"],
                ["Languages",         selectedLawyer.languages || "—"],
                ["Rating",            selectedLawyer.rating ? `⭐ ${selectedLawyer.rating} (${selectedLawyer.reviewCount || 0} reviews)` : "No reviews"],
                ["Cases Handled",     cases.filter(c => c.lawyerEmail === selectedLawyer.email).length + " cases"],
              ].map(([k, v]) => (
                <div className="adm-detail-row" key={k}>
                  <span className="adm-detail-key">{k}</span>
                  <span className="adm-detail-val">{v}</span>
                </div>
              ))}
              <div style={{display:"flex", gap:8, marginTop:14}}>
                <button
                  className={selectedLawyer.verified ? "btn-revoke" : "btn-verify"}
                  style={{flex:1, padding:"10px"}}
                  onClick={() => { toggleVerify(selectedLawyer.id, selectedLawyer.verified); setSelectedLawyer({...selectedLawyer, verified:!selectedLawyer.verified}); }}
                >
                  {selectedLawyer.verified ? "Revoke Verification" : "✅ Verify Lawyer"}
                </button>
                <button className="adm-detail-close" style={{flex:1}} onClick={() => setSelectedLawyer(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="adm">
        {/* ── Top Bar ── */}
        <div className="adm-topbar">
          <div className="adm-topbar-left">
            <p className="adm-logo">Lawyer<span>Link</span></p>
            <span className="adm-badge-admin">Admin</span>
          </div>
          <div className="adm-topbar-right">
            <span className="adm-user-chip">👤 {currentUser?.email}</span>
          </div>
        </div>

        <div className="adm-content">

          {/* ── Tabs ── */}
          <div className="adm-tabs">
            {TABS.map(t => (
              <button key={t} className={`adm-tab ${activeTab === t ? "active" : ""}`}
                onClick={() => { setActiveTab(t); setSearch(""); }}>
                {t === "Overview"  && "📊 "}
                {t === "Lawyers"   && "⚖️ "}
                {t === "Litigants" && "👤 "}
                {t === "Cases"     && "📁 "}
                {t === "Reviews"   && "⭐ "}
                {t}
              </button>
            ))}
          </div>

          {/* ════════════════════════════════ OVERVIEW ════════════════════════════════ */}
          {activeTab === "Overview" && (
            <>
              {/* ── Stats ── */}
              <div className="adm-stats">
                <div className="adm-stat accent">
                  <div className="adm-stat-icon">⚖️</div>
                  <p className="adm-stat-num">{stats.totalLawyers}</p>
                  <p className="adm-stat-label">Total Lawyers</p>
                </div>
                <div className="adm-stat">
                  <div className="adm-stat-icon">✅</div>
                  <p className="adm-stat-num">{stats.verified}</p>
                  <p className="adm-stat-label">Verified</p>
                </div>
                <div className="adm-stat">
                  <div className="adm-stat-icon">⏳</div>
                  <p className="adm-stat-num">{stats.pendingVerify}</p>
                  <p className="adm-stat-label">Pending Verify</p>
                </div>
                <div className="adm-stat">
                  <div className="adm-stat-icon">👤</div>
                  <p className="adm-stat-num">{stats.totalLitigants}</p>
                  <p className="adm-stat-label">Litigants</p>
                </div>
                <div className="adm-stat">
                  <div className="adm-stat-icon">📁</div>
                  <p className="adm-stat-num">{stats.totalCases}</p>
                  <p className="adm-stat-label">Total Cases</p>
                </div>
                <div className="adm-stat gold">
                  <div className="adm-stat-icon">⭐</div>
                  <p className="adm-stat-num">{stats.avgRating}</p>
                  <p className="adm-stat-label">Avg Rating</p>
                </div>
                <div className="adm-stat">
                  <div className="adm-stat-icon">📝</div>
                  <p className="adm-stat-num">{stats.totalReviews}</p>
                  <p className="adm-stat-label">Reviews</p>
                </div>
                <div className="adm-stat">
                  <div className="adm-stat-icon">🟢</div>
                  <p className="adm-stat-num">{stats.openCases}</p>
                  <p className="adm-stat-label">Open Cases</p>
                </div>
              </div>

              {/* ── Case breakdown & Pending lawyers side by side ── */}
              <div className="adm-overview-grid">

                {/* Case Status Breakdown */}
                <div className="adm-card">
                  <div className="adm-card-header">
                    <p className="adm-card-title">📁 Case Status Breakdown</p>
                  </div>
                  <div style={{padding:"20px 24px", display:"flex", flexDirection:"column", gap:14}}>
                    {[
                      {label:"Open",        count:stats.openCases,       color:"#3b82f6", bg:"#dbeafe"},
                      {label:"In Progress", count:stats.inProgressCases, color:"#f59e0b", bg:"#fef3c7"},
                      {label:"Closed",      count:stats.closedCases,     color:"#6b7280", bg:"#f3f4f6"},
                    ].map(({label,count,color,bg}) => (
                      <div key={label}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                          <span style={{fontSize:".8rem",fontWeight:600,color:"#374151"}}>{label}</span>
                          <span style={{fontSize:".8rem",fontWeight:700,color}}>{count} &nbsp;
                            <span style={{color:"#9ca3af",fontWeight:400}}>
                              ({stats.totalCases ? Math.round(count/stats.totalCases*100) : 0}%)
                            </span>
                          </span>
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{
                            width: stats.totalCases ? `${count/stats.totalCases*100}%` : "0%",
                            background: color
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pending Verifications */}
                <div className="adm-card">
                  <div className="adm-card-header">
                    <p className="adm-card-title">⏳ Pending Verifications ({stats.pendingVerify})</p>
                    {stats.pendingVerify > 0 && (
                      <button className="btn-verify" onClick={() => setActiveTab("Lawyers")}>View All →</button>
                    )}
                  </div>
                  <div style={{maxHeight:200, overflowY:"auto"}}>
                    {lawyers.filter(l => !l.verified).length === 0 ? (
                      <div className="adm-empty" style={{padding:"28px"}}>
                        <p style={{margin:0,fontSize:".85rem"}}>🎉 All lawyers are verified!</p>
                      </div>
                    ) : (
                      lawyers.filter(l => !l.verified).slice(0,5).map(l => (
                        <div key={l.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 20px",borderBottom:"1px solid #f9fafb"}}>
                          <div className="adm-avatar adm-avatar-lawyer">{(l.fullName||"L").charAt(0)}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{margin:0,fontSize:".83rem",fontWeight:700,color:"#1a2744",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.fullName||"—"}</p>
                            <p style={{margin:0,fontSize:".72rem",color:"#9ca3af"}}>{l.category||"—"}</p>
                          </div>
                          <button className="btn-verify" onClick={() => toggleVerify(l.id, false)}>Verify</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ════ ANALYTICS ════ */}
          {activeTab === "Analytics" && (
            <div style={{ padding: "8px 0" }}>
              <AdminAnalytics lawyers={lawyers} litigants={litigants} cases={cases} reviews={reviews} />
            </div>
          )}

          {/* ════════════════════════════════ LAWYERS ════════════════════════════════ */}
          {activeTab === "Lawyers" && (
            <div className="adm-card">
              <div className="adm-card-header">
                <p className="adm-card-title">⚖️ Lawyers ({filteredLawyers.length})</p>
                <button className="adm-export-btn" onClick={() => exportCSV(lawyers, "lawyers.csv")}>
                  ⬇️ Export CSV
                </button>
              </div>
              <div className="adm-toolbar">
                <input className="adm-search-input" placeholder="Search name, email, specialization…"
                  value={search} onChange={e => setSearch(e.target.value)} />
                <select className="adm-filter-select" value={filterVerified} onChange={e => setFilterVerified(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="verified">✅ Verified</option>
                  <option value="pending">⏳ Pending</option>
                </select>
              </div>
              <div className="adm-card-body" style={{overflowX:"auto"}}>
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Lawyer</th>
                      <th>Specialization</th>
                      <th>Advocate #</th>
                      <th>Experience</th>
                      <th>Cases</th>
                      <th>Rating</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLawyers.map(l => (
                      <tr key={l.id}>
                        <td>
                          <div className="adm-name-cell">
                            <div className="adm-avatar adm-avatar-lawyer">{(l.fullName||"L").charAt(0)}</div>
                            <div>
                              <p style={{margin:0,fontWeight:700,color:"#1a2744",fontSize:".84rem"}}>{l.fullName||"—"}</p>
                              <p style={{margin:0,fontSize:".72rem",color:"#9ca3af"}}>{l.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>{l.category||"—"}</td>
                        <td style={{fontFamily:"monospace",fontSize:".78rem"}}>{l.advocateNumber||"—"}</td>
                        <td>{l.experience ? l.experience+" yrs" : "—"}</td>
                        <td>
                          <span className="badge badge-open">
                            {cases.filter(c => c.lawyerEmail === l.email).length}
                          </span>
                        </td>
                        <td>
                          <span className="star-rating">{"⭐".repeat(Math.round(l.rating||0))||"—"}</span>
                          <span style={{fontSize:".72rem",color:"#9ca3af",marginLeft:4}}>
                            {l.rating ? `${l.rating} (${l.reviewCount||0})` : ""}
                          </span>
                        </td>
                        <td>
                          {l.verified
                            ? <span className="badge badge-verified">✅ Verified</span>
                            : <span className="badge badge-pending">⏳ Pending</span>}
                        </td>
                        <td>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            <button
                              className={l.verified ? "btn-revoke" : "btn-verify"}
                              onClick={() => toggleVerify(l.id, l.verified)}>
                              {l.verified ? "Revoke" : "✅ Verify"}
                            </button>
                            <button className="adm-export-btn" style={{padding:"5px 12px",fontSize:".73rem"}}
                              onClick={() => setSelectedLawyer(l)}>
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredLawyers.length === 0 && (
                      <tr><td colSpan="7" style={{textAlign:"center",color:"#9ca3af",padding:"36px"}}>No lawyers found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════════════════ LITIGANTS ════════════════════════════════ */}
          {activeTab === "Litigants" && (
            <div className="adm-card">
              <div className="adm-card-header">
                <p className="adm-card-title">👤 Litigants ({filteredLitigants.length})</p>
                <button className="adm-export-btn" onClick={() => exportCSV(litigants, "litigants.csv")}>⬇️ Export CSV</button>
              </div>
              <div className="adm-toolbar">
                <input className="adm-search-input" placeholder="Search name or email…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="adm-card-body" style={{overflowX:"auto"}}>
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Litigant</th>
                      <th>Phone</th>
                      <th>City</th>
                      <th>Joined</th>
                      <th>Cases</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLitigants.map(l => (
                      <tr key={l.id}>
                        <td>
                          <div className="adm-name-cell">
                            <div className="adm-avatar adm-avatar-litigant">{(l.fullName||"L").charAt(0)}</div>
                            <div>
                              <p style={{margin:0,fontWeight:700,color:"#1a2744",fontSize:".84rem"}}>{l.fullName||"—"}</p>
                              <p style={{margin:0,fontSize:".72rem",color:"#9ca3af"}}>{l.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>{l.phone||"—"}</td>
                        <td>{l.city||"—"}</td>
                        <td style={{fontSize:".78rem",color:"#9ca3af"}}>
                          {l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td>
                          <span className="badge badge-litigant">
                            {cases.filter(c => c.clientEmail === l.email).length} cases
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredLitigants.length === 0 && (
                      <tr><td colSpan="5" style={{textAlign:"center",color:"#9ca3af",padding:"36px"}}>No litigants found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════════════════ CASES ════════════════════════════════ */}
          {activeTab === "Cases" && (
            <div className="adm-card">
              <div className="adm-card-header">
                <p className="adm-card-title">📁 Cases ({filteredCases.length})</p>
                <button className="adm-export-btn" onClick={() => exportCSV(cases, "cases.csv")}>⬇️ Export CSV</button>
              </div>
              <div className="adm-toolbar">
                <input className="adm-search-input" placeholder="Search case title or client email…"
                  value={search} onChange={e => setSearch(e.target.value)} />
                <select className="adm-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="Open">🟢 Open</option>
                  <option value="In Progress">🟡 In Progress</option>
                  <option value="Closed">⚫ Closed</option>
                </select>
              </div>
              <div className="adm-card-body" style={{overflowX:"auto"}}>
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Case Title</th>
                      <th>Client</th>
                      <th>Lawyer</th>
                      <th>Type</th>
                      <th>AI Prediction</th>
                      <th>Next Hearing</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map(c => (
                      <tr key={c.id}>
                        <td style={{fontWeight:700,color:"#1a2744",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title||"—"}</td>
                        <td style={{fontSize:".78rem",color:"#6b7280"}}>{c.clientEmail||"—"}</td>
                        <td style={{fontSize:".78rem",color:"#6b7280"}}>{c.lawyerEmail||"—"}</td>
                        <td>{c.caseType||"—"}</td>
                        <td>
                          {c.aiPrediction ? (
                            <span style={{ background: "rgba(201,168,76,0.15)", color: "#b48b2d", padding: "4px 10px", borderRadius: "50px", fontSize: "0.7rem", fontWeight: 700, border: "1px solid rgba(201,168,76,0.3)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              🤖 {c.aiPrediction.verdict_prediction}
                            </span>
                          ) : (
                            <span style={{ fontSize: ".75rem", color: "#9ca3af" }}>—</span>
                          )}
                        </td>
                        <td style={{fontSize:".78rem"}}>{c.next_hearing_date||c.nextHearingDate||"—"}</td>
                        <td>
                          <span className={`badge ${
                            c.status==="Open" ? "badge-open" :
                            c.status==="In Progress" ? "badge-progress" : "badge-closed"
                          }`}>{c.status||"—"}</span>
                        </td>
                      </tr>
                    ))}
                    {filteredCases.length === 0 && (
                      <tr><td colSpan="7" style={{textAlign:"center",color:"#9ca3af",padding:"36px"}}>No cases found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════════════════ REVIEWS ════════════════════════════════ */}
          {activeTab === "Reviews" && (
            <div className="adm-card">
              <div className="adm-card-header">
                <p className="adm-card-title">⭐ Reviews ({filteredReviews.length})</p>
                <button className="adm-export-btn" onClick={() => exportCSV(reviews, "reviews.csv")}>⬇️ Export CSV</button>
              </div>
              <div className="adm-toolbar">
                <input className="adm-search-input" placeholder="Search by client email or case…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="adm-card-body" style={{overflowX:"auto"}}>
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Case</th>
                      <th>Rating</th>
                      <th>Review</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReviews.map(r => (
                      <tr key={r.id}>
                        <td style={{fontSize:".78rem",color:"#6b7280"}}>{r.litigantEmail||"—"}</td>
                        <td style={{fontWeight:600,color:"#1a2744",fontSize:".82rem",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.caseTitle||"—"}</td>
                        <td>
                          <span className="star-rating">{"⭐".repeat(r.rating||0)}</span>
                          <span style={{fontSize:".72rem",color:"#9ca3af",marginLeft:4}}>{r.rating}/5</span>
                        </td>
                        <td style={{fontSize:".8rem",color:"#374151",maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {r.comment||<span style={{color:"#d1d5db",fontStyle:"italic"}}>No comment</span>}
                        </td>
                        <td style={{fontSize:".75rem",color:"#9ca3af"}}>
                          {r.timestamp?.toDate?.()?.toLocaleDateString("en-IN") || "—"}
                        </td>
                        <td>
                          <button className="btn-delete" onClick={() => deleteReview(r.id)}>
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredReviews.length === 0 && (
                      <tr><td colSpan="6" style={{textAlign:"center",color:"#9ca3af",padding:"36px"}}>No reviews found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════════════════ MASTER DATA ════════════════════════════════ */}
          {activeTab === "Master Data" && (
            <AdminMasterData />
          )}

        </div>
      </div>
    </>
  );
}
