// src/pages/CasePredictor.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function analyzeCaseWithAI(prompt) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert Indian legal analyst and senior advocate with 30+ years of experience in the Supreme Court and High Courts of India.
Analyze the given case data thoroughly and return ONLY a valid JSON object.
Your analysis must consider all provided data: case description, documents, hearing notes, timeline events, case category, status, and all other fields.
Be analytical, specific, and reference actual Indian law (IPC, CPC, CrPC, BNS, etc.).`,
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "AI analysis failed");
  return JSON.parse(data.choices[0].message.content);
}

function buildPrompt(c) {
  const docs = (c.documents || []).map((d, i) => `${i + 1}. ${d.name || d.fileName || "Document"} (${d.type || "file"})`).join("\n") || "None";
  const notes = (c.hearingNotes || []).map((n, i) => `${i + 1}. ${typeof n === "string" ? n : n.note || ""}`).join("\n") || "None";
  const events = (c.events || []).map(e => `- [${e.type || "event"}] ${e.description || e.text || ""} (${e.date || ""})`).join("\n") || "None";

  return `Analyze this Indian legal case comprehensively and return a JSON object with EXACTLY this structure:

{
  "verdict_prediction": "Win" | "Settle" | "Partial Win" | "Dismiss",
  "win_probability": <number 0-100>,
  "confidence_level": "High" | "Medium" | "Low",
  "case_strength": <number 0-100>,
  "evidence_strength": <number 0-100>,
  "legal_basis_strength": <number 0-100>,
  "estimated_duration": "<e.g. 6-12 months>",
  "summary": "<2-3 sentence overall analysis>",
  "key_strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "key_risks": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "applicable_laws": ["<law/section 1>", "<law/section 2>", "<law/section 3>"],
  "opposing_arguments": ["<opposing arg 1>", "<opposing arg 2>", "<opposing arg 3>"],
  "counter_strategies": ["<strategy to counter arg 1>", "<strategy 2>", "<strategy 3>"],
  "similar_precedents": [{"case": "<case name>", "court": "<court>", "year": "<year>", "relevance": "<why relevant>"}],
  "hearing_analysis": "<analysis of hearing notes and what they indicate>",
  "document_assessment": "<assessment of available documents and any gaps>",
  "timeline_insights": "<insights from the case timeline and progression>",
  "judge_considerations": "<what factors a judge would likely focus on>",
  "settlement_advice": "<advice on whether to settle or fight>",
  "critical_next_step": "<single most important action to take right now>"
}

CASE DATA:
Title:              ${c.title || "—"}
Case ID:            ${c.case_id || "—"}
Category:           ${c.category || "—"}
Status:             ${c.status || "—"}
Case Stage:         ${c.stage || "—"}
Priority:           ${c.priority || "—"}
Description:        ${c.description || "Not provided"}
Client:             ${c.clientName || "—"} (${c.clientEmail || "—"})
Lawyer:             ${c.lawyerName || "—"}
Next Hearing:       ${c.next_hearing_date || "Not set"}
Case Filing Date:   ${c.filingDate || "—"}
Court:              ${c.courtName || "—"}
IPC / BNS Sections: ${c.ipcSections || "Not specified"}
FIR Number:         ${c.firNumber || "N/A"}
Opposing Party:     ${c.opposingParty || "—"}
Opposing Counsel:   ${c.opposingCounsel || "Not known"}
Advocate Number:    ${c.advocateNumber || "—"}
Created:            ${c.date || "—"}

DOCUMENTS (${(c.documents || []).length} total):
${docs}

HEARING NOTES (${(c.hearingNotes || []).length} total):
${notes}

CASE TIMELINE EVENTS (${(c.events || []).length} total):
${events}`;
}

function GaugeBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>{label}</span>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color }}>{value}%</span>
      </div>
      <div style={{ background: "#e5e7eb", borderRadius: 50, height: 8, overflow: "hidden" }}>
        <div style={{
          width: `${value}%`, height: "100%", borderRadius: 50,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          transition: "width 1s ease",
        }} />
      </div>
    </div>
  );
}

function VerdictOrb({ verdict, probability }) {
  const map = {
    "Win": { color: "#16a34a", bg: "#dcfce7", icon: "🏆" },
    "Partial Win": { color: "#d97706", bg: "#fef3c7", icon: "⚖️" },
    "Settle": { color: "#2563eb", bg: "#dbeafe", icon: "🤝" },
    "Dismiss": { color: "#dc2626", bg: "#fee2e2", icon: "❌" },
  };
  const v = map[verdict] || map["Settle"];
  return (
    <div style={{ textAlign: "center", padding: "32px 20px" }}>
      <div style={{
        width: 140, height: 140, borderRadius: "50%",
        background: `conic-gradient(${v.color} ${probability * 3.6}deg, #e5e7eb 0deg)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px", boxShadow: `0 8px 28px ${v.color}33`,
        position: "relative",
      }}>
        <div style={{
          width: 112, height: 112, borderRadius: "50%",
          background: "white", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: "1.8rem" }}>{v.icon}</span>
          <span style={{ fontSize: "1.4rem", fontWeight: 800, color: v.color, lineHeight: 1 }}>{probability}%</span>
        </div>
      </div>
      <div style={{
        display: "inline-block", background: v.bg, color: v.color,
        borderRadius: 50, padding: "6px 20px", fontWeight: 700, fontSize: "1rem",
        border: `1.5px solid ${v.color}33`,
      }}>
        Predicted: {verdict}
      </div>
    </div>
  );
}

function Section({ title, children, icon }) {
  return (
    <div style={{
      background: "white", borderRadius: 16, padding: "22px 24px",
      boxShadow: "0 2px 14px rgba(26,39,68,0.07)", marginBottom: 20,
      border: "1px solid rgba(26,39,68,0.04)",
    }}>
      <h3 style={{
        fontFamily: "'Playfair Display', serif", fontSize: "1rem",
        color: "#1a2744", marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
      }}>
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

function ListItems({ items, color = "#1a2744", icon = "•" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {(items || []).map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ color, fontWeight: 700, marginTop: 1, flexShrink: 0 }}>{icon}</span>
          <span style={{ fontSize: "0.85rem", color: "#374151", lineHeight: 1.6 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

export default function CasePredictor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]); // prediction history from Firestore
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const snap = await getDoc(doc(db, "cases", id));
        if (snap.exists()) setCaseData({ id: snap.id, ...snap.data() });
        // Load prediction history
        const histSnap = await getDocs(query(collection(db, "cases", id, "predictions"), orderBy("analyzedAt", "desc")));
        setHistory(histSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { setError("Failed to load case."); }
      finally { setFetching(false); }
    };
    fetchCase();
  }, [id]);

  const runAnalysis = async () => {
    if (!caseData) return;
    setLoading(true); setError(""); setAnalysis(null);
    try {
      const result = await analyzeCaseWithAI(buildPrompt(caseData));
      setAnalysis(result);
      // Save to Firestore (case-level predictions subcollection + summary on case doc)
      try {
        await addDoc(collection(db, "cases", id, "predictions"), {
          ...result,
          analyzedAt: new Date().toISOString(),
          caseTitle: caseData.title,
        });
        await updateDoc(doc(db, "cases", id), {
          aiPrediction: {
            verdict_prediction: result.verdict_prediction,
            win_probability: result.win_probability,
            confidence_level: result.confidence_level,
            case_strength: result.case_strength,
            analyzedAt: new Date().toISOString(),
          },
        });
        // Refresh history
        const histSnap = await getDocs(query(collection(db, "cases", id, "predictions"), orderBy("analyzedAt", "desc")));
        setHistory(histSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (_) { /* non-critical */ }
    } catch (e) {
      setError(`AI analysis failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    if (!analysis || !caseData) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html><head><title>AI Prediction Report - ${caseData.title}</title>
      <style>body{font-family:Arial,sans-serif;margin:40px;color:#1a2744}h1{color:#1a2744}h2{color:#243460;border-bottom:2px solid #c9a84c;padding-bottom:6px}p,li{line-height:1.7;color:#374151}table{width:100%;border-collapse:collapse}td{padding:10px;border-bottom:1px solid #e5e7eb}@media print{button{display:none}}</style></head>
      <body>
      <h1>⚖️ LawyerLink — AI Case Outcome Report</h1>
      <p><strong>Case:</strong> ${caseData.title} (${caseData.case_id})<br>
      <strong>Category:</strong> ${caseData.category}<br>
      <strong>Generated:</strong> ${new Date().toLocaleString("en-IN")}</p>
      <h2>Prediction Summary</h2>
      <table><tr><td><strong>Verdict</strong></td><td>${analysis.verdict_prediction}</td></tr>
      <tr><td><strong>Win Probability</strong></td><td>${analysis.win_probability}%</td></tr>
      <tr><td><strong>Confidence</strong></td><td>${analysis.confidence_level}</td></tr>
      <tr><td><strong>Case Strength</strong></td><td>${analysis.case_strength}%</td></tr>
      <tr><td><strong>Duration</strong></td><td>${analysis.estimated_duration}</td></tr></table>
      <h2>Summary</h2><p>${analysis.summary}</p>
      <h2>Key Strengths</h2><ul>${(analysis.key_strengths || []).map(s => `<li>${s}</li>`).join("")}</ul>
      <h2>Key Risks</h2><ul>${(analysis.key_risks || []).map(s => `<li>${s}</li>`).join("")}</ul>
      <h2>Opposing Arguments</h2><ul>${(analysis.opposing_arguments || []).map(s => `<li>${s}</li>`).join("")}</ul>
      <h2>Counter Strategies</h2><ul>${(analysis.counter_strategies || []).map(s => `<li>${s}</li>`).join("")}</ul>
      <h2>Applicable Laws</h2><p>${(analysis.applicable_laws || []).join(" · ")}</p>
      <h2>Recommended Actions</h2><ol>${(analysis.recommended_actions || []).map(s => `<li>${s}</li>`).join("")}</ol>
      <h2>Settlement Advice</h2><p>${analysis.settlement_advice}</p>
      <h2>Critical Next Step</h2><p><strong>${analysis.critical_next_step}</strong></p>
      <hr><p style="font-size:11px;color:#9ca3af">This report is AI-generated and for informational purposes only. Not legal advice. © LawyerLink</p>
      <button onclick="window.print()">🖨️ Print / Save PDF</button>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
  };

  const confidenceColor = { High: "#16a34a", Medium: "#d97706", Low: "#dc2626" };

  if (fetching) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
      <div className="spinner-border" style={{ color: "#1a2744" }} />
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;700;800&display=swap');
        .cp-wrapper { min-height: 100vh; background: linear-gradient(135deg, #f0f4ff, #f8f9fc 50%, #fdf8ee); padding: 32px 20px 60px; font-family: 'Inter', sans-serif; }
        .cp-hero { background: linear-gradient(135deg, #1a2744, #243460); border-radius: 20px; padding: 28px 32px; margin-bottom: 24px; color: white; }
        .cp-analyze-btn {
          background: linear-gradient(135deg, #c9a84c, #e8c96d); color: #1a2744;
          border: none; border-radius: 50px; padding: 13px 32px;
          font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 800;
          cursor: pointer; transition: all 0.25s; display: inline-flex; align-items: center; gap: 8px;
        }
        .cp-analyze-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(201,168,76,0.45); }
        .cp-analyze-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .cp-back-btn { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.1); border: 1.5px solid rgba(255,255,255,0.2); border-radius: 50px; padding: 7px 16px; font-size: 0.82rem; font-weight: 600; color: rgba(255,255,255,0.8); cursor: pointer; transition: all 0.2s; margin-bottom: 16px; }
        .cp-back-btn:hover { background: rgba(255,255,255,0.2); color: white; }
        .cp-verdict-card { background: white; border-radius: 20px; box-shadow: 0 4px 24px rgba(26,39,68,0.1); margin-bottom: 20px; overflow: hidden; border: 1px solid rgba(26,39,68,0.04); }
        .cp-loading-dots span { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #c9a84c; margin: 0 3px; animation: cpBounce 1.2s infinite; }
        .cp-loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .cp-loading-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes cpBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
        .cp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 700px) { .cp-grid { grid-template-columns: 1fr; } .cp-hero { padding: 20px; } }
        .cp-detail-text { font-size: 0.85rem; color: #374151; line-height: 1.7; }
        .cp-critical { background: linear-gradient(135deg, #fef3c7, #fef9ee); border: 2px solid #c9a84c; border-radius: 14px; padding: 18px 20px; }
      `}</style>

      <div className="cp-wrapper">
        <div className="container-lg">

          {/* Hero */}
          <div className="cp-hero">
            <button className="cp-back-btn" onClick={() => navigate(-1)}>← Back to Case</button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(201,168,76,0.2)", border: "1px solid rgba(201,168,76,0.4)", borderRadius: 50, padding: "4px 14px", marginBottom: 10 }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#e8c96d", letterSpacing: "0.8px", textTransform: "uppercase" }}>🤖 AI Prediction Engine</span>
                </div>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.3rem, 3vw, 1.8rem)", fontWeight: 700, margin: 0, marginBottom: 6 }}>
                  Case Outcome Predictor
                </h1>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem", margin: 0 }}>
                  {caseData?.title || "—"} · {caseData?.case_id || "—"}
                </p>
              </div>
              <button className="cp-analyze-btn" onClick={runAnalysis} disabled={loading}>
                {loading ? (
                  <><div className="spinner-border spinner-border-sm" style={{ width: 16, height: 16 }} /> Analyzing...</>
                ) : (
                  <>🔮 {history.length > 0 ? "Re-Run Analysis" : "Run AI Analysis"}</>
                )}
              </button>
            </div>
            {/* History + PDF bar */}
            {history.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => setShowHistory(h => !h)} style={{ background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.2)", borderRadius: 50, padding: "6px 16px", color: "rgba(255,255,255,0.8)", fontSize: ".78rem", fontWeight: 600, cursor: "pointer" }}>
                  📊 {history.length} Past Prediction{history.length > 1 ? "s" : ""} {showHistory ? "▲" : "▼"}
                </button>
                {analysis && (
                  <button onClick={exportPDF} style={{ background: "linear-gradient(135deg,#c9a84c,#e8c96d)", border: "none", borderRadius: 50, padding: "6px 16px", color: "#1a2744", fontSize: ".78rem", fontWeight: 700, cursor: "pointer" }}>
                    📄 Export PDF Report
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Prediction History Timeline */}
          {showHistory && history.length > 0 && (
            <div style={{ background: "white", borderRadius: 16, padding: "22px 24px", boxShadow: "0 2px 14px rgba(26,39,68,.07)", marginBottom: 20, border: "1px solid rgba(26,39,68,.04)" }}>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", color: "#1a2744", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>📊 Prediction History — How This Case Has Evolved</h3>
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
                {history.map((h, i) => {
                  const vMap = { Win: "#16a34a", "Partial Win": "#d97706", Settle: "#2563eb", Dismiss: "#dc2626" };
                  const col = vMap[h.verdict_prediction] || "#1a2744";
                  return (
                    <div key={h.id} style={{ background: "#f8faff", border: `2px solid ${col}33`, borderRadius: 14, padding: "14px 18px", minWidth: 180, flexShrink: 0 }}>
                      <p style={{ fontSize: ".68rem", color: "#9ca3af", margin: "0 0 6px", fontWeight: 700, textTransform: "uppercase" }}>Run #{history.length - i}</p>
                      <p style={{ fontWeight: 800, color: col, fontSize: "1.1rem", margin: 0 }}>{h.win_probability}%</p>
                      <p style={{ fontSize: ".78rem", color: col, fontWeight: 700, margin: "2px 0" }}>{h.verdict_prediction}</p>
                      <p style={{ fontSize: ".7rem", color: "#9ca3af", margin: 0 }}>{new Date(h.analyzedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div className="cp-loading-dots" style={{ marginBottom: 20 }}>
                <span /><span /><span />
              </div>
              <h4 style={{ fontFamily: "'Playfair Display', serif", color: "#1a2744", marginBottom: 8 }}>
                AI is analyzing your case...
              </h4>
              <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                Reading all case data, documents, hearing notes, and timeline events
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 12, padding: "14px 18px", color: "#991b1b", fontSize: "0.875rem", marginBottom: 20 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Empty State */}
          {!loading && !analysis && !error && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
              <div style={{ fontSize: "4rem", marginBottom: 16 }}>🔮</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", color: "#1a2744", marginBottom: 8 }}>
                Ready to Predict
              </h3>
              <p style={{ fontSize: "0.9rem", maxWidth: 420, margin: "0 auto" }}>
                Click <strong>"Run AI Analysis"</strong> to generate a comprehensive legal outcome prediction based on all available case data.
              </p>
              <div style={{ marginTop: 28, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                {["📋 Case Details", "📄 Documents", "📝 Hearing Notes", "📅 Timeline", "⚖️ Legal Basis"].map(item => (
                  <span key={item} style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 50, padding: "5px 14px", fontSize: "0.78rem", fontWeight: 600, color: "#92400e" }}>{item}</span>
                ))}
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <>
              {/* Verdict Card */}
              <div className="cp-verdict-card">
                <div style={{ display: "flex", flexWrap: "wrap" }}>
                  {/* Verdict Orb */}
                  <div style={{ flex: "0 0 280px", borderRight: "1px solid #f0f0f0", padding: "20px 0" }}>
                    <VerdictOrb verdict={analysis.verdict_prediction} probability={analysis.win_probability} />
                  </div>

                  {/* Strength Bars */}
                  <div style={{ flex: 1, padding: "28px 28px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <h3 style={{ fontFamily: "'Playfair Display', serif", color: "#1a2744", margin: 0 }}>Strength Analysis</h3>
                      <span style={{
                        background: `${confidenceColor[analysis.confidence_level]}15`,
                        color: confidenceColor[analysis.confidence_level],
                        border: `1.5px solid ${confidenceColor[analysis.confidence_level]}33`,
                        borderRadius: 50, padding: "4px 14px", fontSize: "0.78rem", fontWeight: 700,
                      }}>
                        {analysis.confidence_level} Confidence
                      </span>
                    </div>
                    <GaugeBar label="Overall Case Strength" value={analysis.case_strength} color="#1a2744" />
                    <GaugeBar label="Evidence Strength" value={analysis.evidence_strength} color="#c9a84c" />
                    <GaugeBar label="Legal Basis Strength" value={analysis.legal_basis_strength} color="#4f46e5" />
                    <div style={{ marginTop: 16, fontSize: "0.82rem", color: "#6b7280" }}>
                      ⏱️ Estimated Duration: <strong style={{ color: "#1a2744" }}>{analysis.estimated_duration}</strong>
                    </div>
                  </div>
                </div>

                {/* Summary Bar */}
                <div style={{ borderTop: "1px solid #f0f0f0", padding: "18px 28px", background: "#fafbff" }}>
                  <p style={{ fontSize: "0.88rem", color: "#374151", lineHeight: 1.7, margin: 0 }}>
                    <strong style={{ color: "#1a2744" }}>AI Summary: </strong>{analysis.summary}
                  </p>
                </div>
              </div>

              {/* Critical Next Step */}
              {analysis.critical_next_step && (
                <div className="cp-critical" style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>⚡</span>
                    <div>
                      <p style={{ fontWeight: 700, color: "#92400e", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.8px", margin: "0 0 4px" }}>Critical Next Step</p>
                      <p style={{ color: "#1a2744", fontSize: "0.9rem", fontWeight: 600, margin: 0 }}>{analysis.critical_next_step}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Opposing Arguments + Counter Strategies */}
              {analysis.opposing_arguments?.length > 0 && (
                <div className="cp-grid">
                  <Section title="Opposing Side's Arguments" icon="⚔️">
                    <ListItems items={analysis.opposing_arguments} color="#dc2626" icon="🔴" />
                  </Section>
                  <Section title="Counter Strategies" icon="🛡️">
                    <ListItems items={analysis.counter_strategies || []} color="#16a34a" icon="✅" />
                  </Section>
                </div>
              )}

              {/* Similar Precedents */}
              {analysis.similar_precedents?.length > 0 && (
                <Section title="Similar Precedent Cases" icon="🏛️">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
                    {analysis.similar_precedents.map((p, i) => (
                      <div key={i} style={{ background: "#f8faff", border: "1px solid #e5e7eb", borderLeft: "3px solid #4338ca", borderRadius: 10, padding: "12px 14px" }}>
                        <p style={{ fontWeight: 700, color: "#1a2744", fontSize: ".85rem", margin: "0 0 2px" }}>{p.case}</p>
                        <p style={{ fontSize: ".72rem", color: "#4338ca", fontWeight: 600, margin: "0 0 6px" }}>{p.court} · {p.year}</p>
                        <p style={{ fontSize: ".78rem", color: "#374151", margin: 0, lineHeight: 1.55 }}>{p.relevance}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Main Grid */}
              <div className="cp-grid">
                <Section title="Key Strengths" icon="💪">
                  <ListItems items={analysis.key_strengths} color="#16a34a" icon="✅" />
                </Section>
                <Section title="Key Risks" icon="⚠️">
                  <ListItems items={analysis.key_risks} color="#dc2626" icon="🔴" />
                </Section>
                <Section title="Applicable Laws & Sections" icon="📜">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(analysis.applicable_laws || []).map((law, i) => (
                      <span key={i} style={{
                        background: "rgba(79,70,229,0.08)", color: "#4338ca",
                        border: "1px solid rgba(79,70,229,0.2)", borderRadius: 8,
                        padding: "5px 12px", fontSize: "0.78rem", fontWeight: 600,
                      }}>{law}</span>
                    ))}
                  </div>
                </Section>
                <Section title="Settlement Advice" icon="🤝">
                  <p className="cp-detail-text">{analysis.settlement_advice}</p>
                </Section>
              </div>

              {/* Recommended Actions */}
              <Section title="Recommended Actions for Lawyer" icon="🎯">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                  {(analysis.recommended_actions || []).map((action, i) => (
                    <div key={i} style={{
                      background: "#f8faff", border: "1px solid #e5e7eb",
                      borderLeft: "3px solid #c9a84c", borderRadius: 10, padding: "12px 14px",
                    }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#c9a84c", letterSpacing: "0.6px" }}>STEP {i + 1}</span>
                      <p style={{ fontSize: "0.85rem", color: "#1a2744", margin: "4px 0 0", lineHeight: 1.55 }}>{action}</p>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Deep Analysis Grid */}
              <div className="cp-grid">
                <Section title="Hearing Notes Analysis" icon="📝">
                  <p className="cp-detail-text">{analysis.hearing_analysis}</p>
                </Section>
                <Section title="Document Assessment" icon="📄">
                  <p className="cp-detail-text">{analysis.document_assessment}</p>
                </Section>
                <Section title="Timeline Insights" icon="📅">
                  <p className="cp-detail-text">{analysis.timeline_insights}</p>
                </Section>
                <Section title="Judge's Likely Focus" icon="⚖️">
                  <p className="cp-detail-text">{analysis.judge_considerations}</p>
                </Section>
              </div>

              {/* Disclaimer */}
              <div style={{ textAlign: "center", padding: "16px 20px", color: "#9ca3af", fontSize: "0.75rem", lineHeight: 1.6 }}>
                ⚠️ This AI prediction is for informational purposes only and does not constitute legal advice.<br />
                Always consult a qualified lawyer before making any legal decisions.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
