// src/pages/SmartMatch.js
import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import axios from "axios";

export default function SmartMatch() {
  const [problem, setProblem] = useState("");
  const [lawyers, setLawyers] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const q = query(collection(db, "users"), where("role", "==", "lawyer"));
      const snap = await getDocs(q);
      setLawyers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetch();
  }, []);

  const handleMatch = async () => {
    if (!problem.trim() || lawyers.length === 0) return;
    setLoading(true);
    setSearched(true);
    try {
      const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;
      const availableLawyers = lawyers.map(l => ({
        id: l.id,
        name: l.fullName || "Lawyer",
        category: l.category || "General Practice",
        experience: l.experience || 0,
        location: l.address?.split(",")[0] || "Unknown",
        verified: l.verified || false
      }));

      const systemPrompt = `You are an expert AI legal matchmaker.
Match the user's legal problem with the top 5 most suitable lawyers from the provided list.
Consider: user's specific intent, required specialization, years of experience, verified status, and location.
Output ONLY a valid JSON object containing a "matches" array.
Format: {"matches": [{"id": "lawyer_id_here", "score": 95, "reason": "Short explanation of why this lawyer is a perfect fit based on their specific profile."}]}`;

      const userPrompt = `User Problem: ${problem}\n\nAvailable Lawyers: ${JSON.stringify(availableLawyers)}`;

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      });

      const data = await res.json();
      const content = data.choices[0]?.message?.content;
      if (!content) throw new Error("No response from AI");
      
      const parsed = JSON.parse(content);
      const matched = (parsed.matches || []).map(m => {
        const lawyer = lawyers.find(l => l.id === m.id);
        if (!lawyer) return null;
        return { ...lawyer, score: m.score / 100, reason: m.reason };
      }).filter(Boolean);

      // Sort by score descending
      matched.sort((a, b) => b.score - a.score);

      setResults(matched.slice(0, 5)); // Keep top 5
    } catch (err) {
      console.error("Advanced match error:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    const r = parseFloat(rating) || 0;
    return "⭐".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));
  };

  const matchPercent = (score) => Math.round(Math.max(0, Math.min(100, score * 100)));

  return (
    <>
      <style>{`
        .sm-wrapper { min-height: 100vh; font-family: 'Inter', sans-serif; }
        .sm-hero {
          background: linear-gradient(-45deg, #0f1d3a, #1a2744, #243460, #1a3a5c);
          background-size: 400% 400%; animation: smGrad 10s ease infinite;
          padding: 64px 20px 52px; text-align: center; position: relative; overflow: hidden;
        }
        @keyframes smGrad { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .sm-orb { position: absolute; border-radius: 50%; filter: blur(100px); }
        .sm-orb1 { width: 350px; height: 350px; background: #c9a84c; opacity: 0.08; top: -80px; right: -80px; }
        .sm-orb2 { width: 280px; height: 280px; background: #3b82f6; opacity: 0.08; bottom: -60px; left: -60px; }
        .sm-hero-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(201,168,76,0.15); border: 1px solid rgba(201,168,76,0.3); color: #e8c96d; border-radius: 50px; padding: 5px 16px; font-size: 0.78rem; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 18px; }
        .sm-hero-title { font-family: 'Playfair Display', serif; font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 800; color: white; margin-bottom: 12px; }
        .sm-hero-title span { color: #c9a84c; }
        .sm-hero-sub { font-size: 0.95rem; color: rgba(255,255,255,0.6); max-width: 500px; margin: 0 auto 28px; line-height: 1.7; }
        .sm-input-box { max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; padding: 20px 22px; backdrop-filter: blur(12px); }
        .sm-textarea { display: block; width: 100%; background: transparent; border: none; outline: none; font-family: 'Inter', sans-serif; font-size: 0.9rem; color: white; resize: none; min-height: 80px; }
        .sm-textarea::placeholder { color: rgba(255,255,255,0.4); }
        .sm-input-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; flex-wrap: wrap; gap: 10px; }
        .sm-char { font-size: 0.72rem; color: rgba(255,255,255,0.35); }
        .sm-match-btn { background: linear-gradient(135deg, #c9a84c, #e8c96d); color: #1a2744; border: none; border-radius: 50px; padding: 11px 28px; font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
        .sm-match-btn:hover:not(:disabled) { box-shadow: 0 8px 24px rgba(201,168,76,0.45); transform: translateY(-1px); }
        .sm-match-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Results */
        .sm-main { max-width: 1100px; margin: 0 auto; padding: 48px 20px 60px; background: linear-gradient(135deg, #f0f4ff 0%, #f8f9fc 50%, #fdf8ee 100%); min-height: 400px; }
        .sm-results-title { font-family: 'Playfair Display', serif; font-size: 1.4rem; font-weight: 700; color: #1a2744; margin-bottom: 24px; text-align: center; }
        .sm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 22px; }
        .sm-card { background: white; border-radius: 22px; overflow: hidden; box-shadow: 0 4px 20px rgba(26,39,68,0.09); border: 1px solid rgba(26,39,68,0.04); transition: all 0.3s ease; }
        .sm-card:hover { transform: translateY(-6px); box-shadow: 0 18px 44px rgba(26,39,68,0.14); }
        .sm-card-rank-bar { height: 5px; background: linear-gradient(90deg, #c9a84c, #1a2744); }
        .sm-card-body { padding: 22px; }
        .sm-rank-badge { display: inline-flex; align-items: center; gap: 5px; background: #fef3c7; color: #92400e; border-radius: 50px; padding: 3px 12px; font-size: 0.73rem; font-weight: 700; margin-bottom: 14px; }
        .sm-match-score { float: right; background: #d1fae5; color: #065f46; border-radius: 50px; padding: 3px 12px; font-size: 0.73rem; font-weight: 700; }
        .sm-lawyer-name { font-family: 'Playfair Display', serif; font-size: 1.05rem; font-weight: 700; color: #1a2744; margin-bottom: 4px; clear: both; }
        .sm-lawyer-cat { font-size: 0.8rem; color: #6b7280; margin-bottom: 12px; }
        .sm-meta { font-size: 0.8rem; color: #6b7280; margin-bottom: 4px; }
        .sm-verified { display: inline-flex; align-items: center; gap: 4px; background: #d1fae5; color: #065f46; border-radius: 50px; padding: 2px 10px; font-size: 0.7rem; font-weight: 700; margin-bottom: 12px; }
        .sm-contact-row { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
        .sm-contact-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; border: 1.5px solid; border-radius: 50px; padding: 8px 12px; font-size: 0.78rem; font-weight: 700; cursor: pointer; text-decoration: none; transition: all 0.2s; min-width: 80px; }
        .sm-btn-email { color: #16a34a; border-color: #16a34a; }
        .sm-btn-email:hover { background: #16a34a; color: white; }
        .sm-btn-call { color: #1a2744; border-color: #1a2744; }
        .sm-btn-call:hover { background: #1a2744; color: white; }
        .sm-reason { font-size: 0.82rem; color: #374151; background: rgba(201,168,76,0.1); padding: 10px 14px; border-radius: 8px; margin-bottom: 14px; font-style: italic; line-height: 1.5; border-left: 3px solid #c9a84c; }
        .sm-empty { text-align: center; padding: 56px 20px; color: #9ca3af; }
        .sm-empty-icon { font-size: 3rem; margin-bottom: 14px; }
        .sm-empty h4 { font-family: 'Playfair Display', serif; color: #374151; margin-bottom: 8px; }
      `}</style>

      <div className="sm-wrapper">
        {/* Hero */}
        <div className="sm-hero">
          <div className="sm-orb sm-orb1" /><div className="sm-orb sm-orb2" />
          <div className="sm-hero-badge">🤖 AI-Powered Matching</div>
          <h1 className="sm-hero-title">Find Your <span>Perfect Lawyer</span></h1>
          <p className="sm-hero-sub">Describe your legal problem and our AI will recommend the best-matched lawyers from our verified network.</p>

          <div className="sm-input-box">
            <textarea
              className="sm-textarea"
              placeholder="e.g. I need help with a property dispute between family members. My brother has illegally occupied my ancestral land..."
              value={problem}
              onChange={e => setProblem(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <div className="sm-input-footer">
              <span className="sm-char">{problem.length}/500</span>
              <button className="sm-match-btn" onClick={handleMatch} disabled={loading || !problem.trim()}>
                {loading ? (
                  <><span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} /> Finding...</>
                ) : (
                  <>🔍 Find Matching Lawyers</>
                )}
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
              <p>Our AI will analyze your description and find the most relevant lawyers for your case.</p>
            </div>
          ) : loading ? (
            <div style={{ textAlign: "center", padding: "60px" }}>
              <div className="spinner-border" style={{ color: "#1a2744", width: 40, height: 40 }} />
              <p className="mt-3" style={{ color: "#6b7280" }}>AI is analyzing your problem...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="sm-empty">
              <div className="sm-empty-icon">🔍</div>
              <h4>No matches found</h4>
              <p>Try rephrasing your problem in more detail, or browse all lawyers in our catalog.</p>
            </div>
          ) : (
            <>
              <h2 className="sm-results-title">🎯 Top {results.length} Matched Lawyers</h2>
              <div className="sm-grid">
                {results.map((lawyer, i) => (
                  <div key={lawyer.id} className="sm-card">
                    <div className="sm-card-rank-bar" style={{ opacity: 1 - i * 0.25 }} />
                    <div className="sm-card-body">
                      <div>
                        <span className="sm-rank-badge">#{i + 1} Match</span>
                        <span className="sm-match-score">{matchPercent(lawyer.score)}% match</span>
                      </div>
                      {lawyer.verified && <span className="sm-verified">✅ Verified</span>}
                      <h3 className="sm-lawyer-name">{lawyer.fullName}</h3>
                      <p className="sm-lawyer-cat">{lawyer.category || "General Practice"}</p>
                      <p className="sm-meta">⏱️ {lawyer.experience || 0} years experience</p>
                      <p className="sm-meta">📍 {lawyer.address?.split(",")[0] || "India"}</p>
                      {lawyer.rating > 0 && <p className="sm-meta">{renderStars(lawyer.rating)} ({lawyer.rating})</p>}
                      {lawyer.reason && <div className="sm-reason">"{lawyer.reason}"</div>}
                      <div className="sm-contact-row">
                        <a href={`mailto:${lawyer.email}`} className="sm-contact-btn sm-btn-email">✉️ Email</a>
                        {lawyer.phone && <a href={`tel:${lawyer.phone}`} className="sm-contact-btn sm-btn-call">📞 Call</a>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
