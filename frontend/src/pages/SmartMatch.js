// src/pages/SmartMatch.js
import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../firebase";
import BookingModal from "../components/BookingModal";

const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;
const BACKEND = "http://127.0.0.1:8000";

// ── Main Component ───────────────────────────────────────────────
// ── AI Match ────────────────────────────────────────────────────
async function runAIMatch(problem, lawyers) {
  const payload = lawyers.map(l => ({
    id: l.id,
    name: l.fullName || "Lawyer",
    category: l.category || "General Practice",
    experience: l.experience || 0,
    location: l.address?.split(",")[0] || "India",
    verified: l.verified || false,
    rating: l.rating || 0,
  }));

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert AI legal matchmaker for India.
Analyze the user's legal problem and match them with the top 5 most suitable lawyers.
Consider: specialization match, experience, location, verified status, rating.
Return ONLY valid JSON: {"matches":[{"id":"...","score":95,"reason":"Strong match because: Criminal law expert, 12+ years, Delhi HC specialist. Handles exactly these types of cases.","strengths":["IPC expert","High Court experience","Bilingual"]}]}`,
        },
        { role: "user", content: `Problem: ${problem}\n\nLawyers: ${JSON.stringify(payload)}` },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

export default function SmartMatch() {
  const [problem, setProblem]   = useState("");
  const [lawyers, setLawyers]   = useState([]);
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const [booking, setBooking]   = useState(null); // lawyer to book
  const currentUser = auth.currentUser;

  // Filters
  const [filterLocation, setFilterLocation] = useState("");
  const [filterExp, setFilterExp]           = useState("");
  const [filterVerified, setFilterVerified] = useState(false);

  useEffect(() => {
    const fetch_ = async () => {
      const q = query(collection(db, "users"), where("role", "==", "lawyer"));
      const snap = await getDocs(q);
      setLawyers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetch_();
  }, []);

  const handleMatch = async () => {
    if (!problem.trim() || lawyers.length === 0) return;
    setLoading(true); setSearched(true);
    try {
      let pool = [...lawyers];
      if (filterVerified) pool = pool.filter(l => l.verified);
      if (filterLocation) pool = pool.filter(l => l.address?.toLowerCase().includes(filterLocation.toLowerCase()));
      if (filterExp)      pool = pool.filter(l => (l.experience || 0) >= parseInt(filterExp));

      const parsed   = await runAIMatch(problem, pool);
      const matched  = (parsed.matches || []).map(m => {
        const l = lawyers.find(x => x.id === m.id);
        if (!l) return null;
        return { ...l, aiScore: m.score, reason: m.reason, strengths: m.strengths || [] };
      }).filter(Boolean).sort((a, b) => b.aiScore - a.aiScore).slice(0, 5);
      setResults(matched);
    } catch (e) { console.error(e); setResults([]); }
    finally { setLoading(false); }
  };

  const locations = [...new Set(lawyers.map(l => l.address?.split(",")[0]).filter(Boolean))];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;700;800&display=swap');
        .sm-wrap { min-height:100vh; font-family:'Inter',sans-serif; }
        .sm-hero { background:linear-gradient(-45deg,#0f1d3a,#1a2744,#243460,#1a3a5c); background-size:400% 400%; animation:smGrad 10s ease infinite; padding:56px 20px 44px; text-align:center; position:relative; overflow:hidden; }
        @keyframes smGrad{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        .sm-orb{position:absolute;border-radius:50%;filter:blur(100px);}
        .sm-orb1{width:350px;height:350px;background:#c9a84c;opacity:.08;top:-80px;right:-80px;}
        .sm-orb2{width:280px;height:280px;background:#3b82f6;opacity:.08;bottom:-60px;left:-60px;}
        .sm-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.3);color:#e8c96d;border-radius:50px;padding:5px 16px;font-size:.78rem;font-weight:600;letter-spacing:.8px;text-transform:uppercase;margin-bottom:16px;}
        .sm-title{font-family:'Playfair Display',serif;font-size:clamp(1.8rem,4vw,2.8rem);font-weight:800;color:white;margin-bottom:10px;}
        .sm-title span{color:#c9a84c;}
        .sm-sub{font-size:.92rem;color:rgba(255,255,255,.6);max-width:480px;margin:0 auto 24px;line-height:1.7;}
        .sm-box{max-width:640px;margin:0 auto;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:20px 22px;backdrop-filter:blur(12px);}
        .sm-ta{display:block;width:100%;background:transparent;border:none;outline:none;font-family:'Inter',sans-serif;font-size:.9rem;color:white;resize:none;min-height:80px;}
        .sm-ta::placeholder{color:rgba(255,255,255,.35);}
        .sm-filters{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0;}
        .sm-filter-select{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);border-radius:50px;padding:6px 14px;font-size:.78rem;color:white;font-family:'Inter',sans-serif;outline:none;cursor:pointer;}
        .sm-filter-check{display:flex;align-items:center;gap:6px;font-size:.78rem;color:rgba(255,255,255,.75);cursor:pointer;}
        .sm-footer{display:flex;justify-content:space-between;align-items:center;margin-top:12px;flex-wrap:wrap;gap:10px;}
        .sm-char{font-size:.72rem;color:rgba(255,255,255,.35);}
        .sm-btn{background:linear-gradient(135deg,#c9a84c,#e8c96d);color:#1a2744;border:none;border-radius:50px;padding:11px 28px;font-size:.9rem;font-weight:700;cursor:pointer;transition:all .2s;font-family:'Inter',sans-serif;}
        .sm-btn:hover:not(:disabled){box-shadow:0 8px 24px rgba(201,168,76,.45);transform:translateY(-1px);}
        .sm-btn:disabled{opacity:.6;cursor:not-allowed;}
        .sm-main{max-width:1100px;margin:0 auto;padding:44px 20px 60px;background:linear-gradient(135deg,#f0f4ff,#f8f9fc 50%,#fdf8ee);}
        .sm-results-title{font-family:'Playfair Display',serif;font-size:1.35rem;font-weight:700;color:#1a2744;margin-bottom:22px;text-align:center;}
        .sm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:22px;}
        .sm-card{background:white;border-radius:22px;overflow:hidden;box-shadow:0 4px 20px rgba(26,39,68,.09);border:1px solid rgba(26,39,68,.04);transition:all .3s;}
        .sm-card:hover{transform:translateY(-6px);box-shadow:0 18px 44px rgba(26,39,68,.14);}
        .sm-rank-bar{height:5px;}
        .sm-body{padding:20px 22px;}
        .sm-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
        .sm-rank{background:#fef3c7;color:#92400e;border-radius:50px;padding:3px 12px;font-size:.72rem;font-weight:700;}
        .sm-score{border-radius:50px;padding:3px 12px;font-size:.72rem;font-weight:700;}
        .sm-name{font-family:'Playfair Display',serif;font-size:1.05rem;font-weight:700;color:#1a2744;margin-bottom:3px;}
        .sm-cat{font-size:.8rem;color:#6b7280;margin-bottom:10px;}
        .sm-meta{font-size:.78rem;color:#6b7280;margin-bottom:3px;}
        .sm-verified{display:inline-flex;align-items:center;gap:4px;background:#dcfce7;color:#16a34a;border-radius:50px;padding:2px 10px;font-size:.7rem;font-weight:700;margin-bottom:8px;}
        .sm-winrate{display:inline-flex;align-items:center;gap:4px;background:#eef2ff;color:#4338ca;border-radius:50px;padding:2px 10px;font-size:.7rem;font-weight:700;margin-bottom:8px;margin-left:6px;}
        .sm-reason{font-size:.81rem;color:#374151;background:rgba(201,168,76,.08);padding:10px 13px;border-radius:8px;margin:10px 0;font-style:italic;line-height:1.55;border-left:3px solid #c9a84c;}
        .sm-strengths{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px;}
        .sm-strength{background:#f0f4ff;color:#4338ca;border-radius:50px;padding:2px 10px;font-size:.68rem;font-weight:600;}
        .sm-actions{display:flex;gap:8px;flex-wrap:wrap;}
        .sm-btn-sm{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;border:1.5px solid;border-radius:50px;padding:8px 10px;font-size:.77rem;font-weight:700;cursor:pointer;text-decoration:none;transition:all .2s;background:none;font-family:'Inter',sans-serif;min-width:60px;}
        .sm-btn-consult{color:white;background:linear-gradient(135deg,#1a2744,#243460);border-color:transparent;}
        .sm-btn-consult:hover{box-shadow:0 6px 18px rgba(26,39,68,.3);}
        .sm-btn-email{color:#16a34a;border-color:#16a34a;}
        .sm-btn-email:hover{background:#16a34a;color:white;}
        .sm-empty{text-align:center;padding:56px 20px;color:#9ca3af;}
        .sm-empty-icon{font-size:3rem;margin-bottom:14px;}
        .sm-empty h4{font-family:'Playfair Display',serif;color:#374151;margin-bottom:8px;}
        .sm-loading-dots span{display:inline-block;width:8px;height:8px;border-radius:50%;background:#c9a84c;margin:0 3px;animation:smBounce 1.2s infinite;}
        .sm-loading-dots span:nth-child(2){animation-delay:.2s}.sm-loading-dots span:nth-child(3){animation-delay:.4s}
        @keyframes smBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-8px)}}
      `}</style>

      <div className="sm-wrap">
        {/* Hero */}
        <div className="sm-hero">
          <div className="sm-orb sm-orb1" /><div className="sm-orb sm-orb2" />
          <div className="sm-badge">🤖 AI-Powered Legal Matching</div>
          <h1 className="sm-title">Find Your <span>Perfect Lawyer</span></h1>
          <p className="sm-sub">Describe your legal problem. Our AI analyzes expertise, experience, and fit to recommend the best lawyers for your case.</p>

          <div className="sm-box">
            <textarea className="sm-ta" rows={4} maxLength={600} placeholder="e.g. I need help with a property dispute — my brother illegally occupied ancestral land worth ₹50L in Delhi..."
              value={problem} onChange={e => setProblem(e.target.value)} />

            {/* Filters */}
            <div className="sm-filters">
              <select className="sm-filter-select" value={filterLocation} onChange={e => setFilterLocation(e.target.value)}>
                <option value="">📍 Any Location</option>
                {locations.slice(0, 12).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select className="sm-filter-select" value={filterExp} onChange={e => setFilterExp(e.target.value)}>
                <option value="">⏱ Any Experience</option>
                <option value="1">1+ years</option>
                <option value="3">3+ years</option>
                <option value="5">5+ years</option>
                <option value="10">10+ years</option>
              </select>
              <label className="sm-filter-check">
                <input type="checkbox" checked={filterVerified} onChange={e => setFilterVerified(e.target.checked)} />
                ✅ Verified Only
              </label>
            </div>

            <div className="sm-footer">
              <span className="sm-char">{problem.length}/600</span>
              <button className="sm-btn" onClick={handleMatch} disabled={loading || !problem.trim()}>
                {loading ? "Finding..." : "🔍 Find Matching Lawyers"}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="sm-main">
          {!searched ? (
            <div className="sm-empty">
              <div className="sm-empty-icon">🤖</div>
              <h4>Describe your legal problem above</h4>
              <p>AI will analyze and rank lawyers by specialization, experience, location and verified status.</p>
            </div>
          ) : loading ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div className="sm-loading-dots" style={{ marginBottom: 20 }}><span /><span /><span /></div>
              <h4 style={{ fontFamily: "'Playfair Display',serif", color: "#1a2744", margin: "0 0 8px" }}>AI is analyzing your case...</h4>
              <p style={{ color: "#9ca3af", fontSize: ".85rem" }}>Matching with {lawyers.length} verified lawyers</p>
            </div>
          ) : results.length === 0 ? (
            <div className="sm-empty">
              <div className="sm-empty-icon">🔍</div>
              <h4>No matches found</h4>
              <p>Try broadening your filters or rephrasing the problem with more detail.</p>
            </div>
          ) : (
            <>
              <h2 className="sm-results-title">🎯 Top {results.length} AI-Matched Lawyers</h2>
              <div className="sm-grid">
                {results.map((l, i) => {
                  const scoreColor = l.aiScore >= 85 ? "#16a34a" : l.aiScore >= 70 ? "#d97706" : "#dc2626";
                  const scoreBg    = l.aiScore >= 85 ? "#dcfce7" : l.aiScore >= 70 ? "#fef3c7" : "#fee2e2";
                  const barColor   = i === 0 ? "linear-gradient(90deg,#c9a84c,#1a2744)" : i === 1 ? "linear-gradient(90deg,#1a2744,#4338ca)" : "linear-gradient(90deg,#374151,#6b7280)";
                  const winRate    = l.aiPrediction ? `${l.aiPrediction.win_probability}% predicted win` : null;
                  return (
                    <div key={l.id} className="sm-card">
                      <div className="sm-rank-bar" style={{ background: barColor }} />
                      <div className="sm-body">
                        <div className="sm-top">
                          <span className="sm-rank">#{i + 1} Match</span>
                          <span className="sm-score" style={{ background: scoreBg, color: scoreColor }}>{l.aiScore}% match</span>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          {l.verified && <span className="sm-verified">✅ Verified</span>}
                          {winRate && <span className="sm-winrate">🏆 {winRate}</span>}
                        </div>
                        <h3 className="sm-name">{l.fullName}</h3>
                        <p className="sm-cat">{l.category || "General Practice"}</p>
                        <p className="sm-meta">⏱️ {l.experience || 0} years experience</p>
                        <p className="sm-meta">📍 {l.address?.split(",")[0] || "India"}</p>
                        {l.rating > 0 && <p className="sm-meta">⭐ {l.rating}/5 rating</p>}
                        {l.reason && <div className="sm-reason">"{l.reason}"</div>}
                        {l.strengths?.length > 0 && (
                          <div className="sm-strengths">
                            {l.strengths.slice(0, 3).map((s, j) => <span key={j} className="sm-strength">✓ {s}</span>)}
                          </div>
                        )}
                        <div className="sm-actions">
                          <button className="sm-btn-sm sm-btn-consult" onClick={() => setBooking(l)}>📅 Book Consultation</button>
                          <a href={`mailto:${l.email}`} className="sm-btn-sm sm-btn-email">✉️ Email</a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {booking && <BookingModal lawyer={booking} currentUser={currentUser} onClose={() => setBooking(null)} />}
    </>
  );
}
