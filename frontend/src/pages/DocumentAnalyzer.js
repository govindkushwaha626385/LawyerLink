// src/pages/DocumentAnalyzer.js
import React, { useState, useRef } from "react";

import { extractTextFromPDF } from "../utils/pdfParser";

const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const ANALYSIS_PROMPT = `You are an elite Indian legal analyst and corporate counsel with 30+ years of experience.
Analyze the provided legal document (which could be a Vakalatnama, Plaint/Petition, Written Statement, Affidavit, Memo of Parties, Criminal Case Documents like FIR/Charge Sheet, etc.) and return ONLY a valid JSON object with this exact industry-standard structure:
{
  "document_type": "<Specific document type, e.g., FIR, Plaint, Commercial Lease, Bail Application, Notice>",
  "jurisdiction": "<Identified court, tribunal, governing law jurisdiction, or 'Not Specified'>",
  "executive_summary": "<Professional, concise 3-4 sentence summary of the core issue>",
  "parties_involved": [{"name": "<party name>", "type": "<e.g., Plaintiff, Defendant, Petitioner, Respondent>"}],
  "key_arguments_or_claims": ["<Argument/Claim 1>", "<Argument/Claim 2>"],
  "statutory_provisions": ["<e.g., Section 420 IPC, Order VII Rule 1 CPC>"],
  "evidentiary_support": ["<Evidence/Annexure 1 mentioned>", "<Evidence/Annexure 2 mentioned>"],
  "critical_deadlines": [{"event": "<e.g., Next Hearing, Reply filing>", "date": "<date/timeframe>"}],
  "procedural_defects": ["<Identified defects, e.g., missing signatures, incorrect format, missing annexures, etc.>"],
  "overall_risk_level": "High",
  "risk_assessment": ["<Critical Risk 1>", "<Critical Risk 2>"],
  "strategic_recommendations": ["<Actionable legal step 1>", "<Actionable legal step 2>"],
  "case_fields": {"title": "<suggested case title>", "category": "<Criminal/Civil/Family/Property/Labour/Consumer/Tax/Other>", "ipcSections": "<comma-separated IPC/BNS sections>"}
}`;

async function analyzeText(text) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: ANALYSIS_PROMPT },
        { role: "user", content: `Analyze this legal document:\n\n${text}` },
      ],
      temperature: 0.2, max_tokens: 1800,
      response_format: { type: "json_object" },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Analysis failed");
  return JSON.parse(data.choices[0].message.content);
}

async function compareDocuments(doc1, doc2) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: `You are a senior Indian legal analyst. Compare two legal documents and return ONLY a valid JSON object:
{
  "doc1_type": "<document type>",
  "doc2_type": "<document type>",
  "common_points": ["<common point 1>", "<common point 2>"],
  "conflicts": ["<conflict 1>", "<conflict 2>", "<conflict 3>"],
  "doc1_advantages": ["<advantage 1>", "<advantage 2>"],
  "doc2_advantages": ["<advantage 1>", "<advantage 2>"],
  "recommendation": "<which document is stronger and why>",
  "overall_assessment": "<2-3 sentence comparison summary>"
}` },
        { role: "user", content: `DOCUMENT 1:\n${doc1}\n\nDOCUMENT 2:\n${doc2}` },
      ],
      temperature: 0.2, max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Comparison failed");
  return JSON.parse(data.choices[0].message.content);
}

async function draftResponse(originalDoc, docType) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a senior Indian advocate. Draft a professional legal response/counter-document to the provided document. Use proper legal language, reference relevant sections of Indian law, and format it as a formal document. Return the draft as plain text." },
        { role: "user", content: `Draft a legal response to this ${docType || "legal document"}:\n\n${originalDoc}` },
      ],
      temperature: 0.4, max_tokens: 2000,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Draft failed");
  return data.choices[0].message.content;
}

async function analyzeImage(base64, mimeType) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `You are a senior Indian legal analyst. Analyze this legal document image and return ONLY a valid JSON object:\n${ANALYSIS_PROMPT.split("industry-standard structure:")[1]}` },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
        ],
      }],
      temperature: 0.2, max_tokens: 1800,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Image analysis failed");
  const content = data.choices[0].message.content;
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Could not parse AI response");
  return JSON.parse(match[0]);
}

const toBase64 = (file) => new Promise((res, rej) => {
  const reader = new FileReader();
  reader.onload = () => res(reader.result.split(",")[1]);
  reader.onerror = rej;
  reader.readAsDataURL(file);
});

const readAsText = (file) => new Promise((res, rej) => {
  const reader = new FileReader();
  reader.onload = () => res(reader.result);
  reader.onerror = rej;
  reader.readAsText(file);
});

const riskColor = { High: "#dc2626", Medium: "#d97706", Low: "#16a34a" };
const riskBg    = { High: "#fee2e2", Medium: "#fef3c7", Low: "#dcfce7" };

function Block({ title, icon, children }) {
  return (
    <div style={{ background: "#f8faff", border: "1px solid #e5e7eb", borderLeft: "3px solid #c9a84c", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
      <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#9ca3af", margin: "0 0 10px" }}>{icon} {title}</p>
      {children}
    </div>
  );
}

function Tag({ text, color = "#4338ca", bg = "#eef2ff" }) {
  return <span style={{ background: bg, color, border: `1px solid ${color}22`, borderRadius: 6, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 600, display: "inline-block", margin: "3px 4px 3px 0" }}>{text}</span>;
}

function ListItems({ items, icon = "→", color = "#374151" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {(items || []).map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ color: "#c9a84c", fontWeight: 700, flexShrink: 0 }}>{icon}</span>
          <span style={{ fontSize: "0.84rem", color, lineHeight: 1.6 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

export default function DocumentAnalyzer() {
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [pasteText, setPasteText] = useState("");
  const [mode, setMode]         = useState("upload"); // "upload" | "paste" | "compare"
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [dragging, setDragging] = useState(false);
  const [compareDoc2, setCompareDoc2] = useState("");
  const [compareResult, setCompareResult] = useState(null);
  const [draftText, setDraftText] = useState("");
  const [drafting, setDrafting]   = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const inputRef = useRef();

  const isImage = (f) => f && f.type.startsWith("image/");
  const isPdf   = (f) => f && f.type === "application/pdf";
  const isText  = (f) => f && (f.type === "text/plain" || f.name.endsWith(".txt"));

  const handleFile = (f) => {
    if (!f) return;
    setFile(f); setResult(null); setError("");
    if (isImage(f)) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleAnalyze = async () => {
    setLoading(true); setError(""); setResult(null); setCompareResult(null); setDraftText("");
    try {
      let analysis;
      if (mode === "compare") {
        if (!pasteText.trim() || !compareDoc2.trim()) throw new Error("Please paste both documents.");
        const cmp = await compareDocuments(pasteText, compareDoc2);
        setCompareResult(cmp);
        setLoading(false); return;
      } else if (mode === "paste") {
        if (!pasteText.trim() || pasteText.trim().length < 50) throw new Error("Please paste at least 50 characters.");
        analysis = await analyzeText(pasteText);
      } else if (isImage(file)) {
        const b64 = await toBase64(file);
        analysis = await analyzeImage(b64, file.type);
      } else if (isText(file)) {
        const text = await readAsText(file);
        analysis = await analyzeText(text);
      } else if (isPdf(file)) {
        const text = await extractTextFromPDF(file);
        if (!text || text.trim().length < 15) throw new Error("Could not extract text from this PDF. It might be scanned/image-based.");
        analysis = await analyzeText(text);
      } else {
        throw new Error("Unsupported file type. Use PDFs, images, or text files.");
      }
      setResult(analysis);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleDraft = async () => {
    if (!pasteText.trim()) return;
    setDrafting(true); setDraftText("");
    try {
      const draft = await draftResponse(pasteText, result?.document_type);
      setDraftText(draft);
    } catch (e) { setError(e.message); }
    finally { setDrafting(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;700;800&display=swap');
        .da-page { min-height: 100vh; background: linear-gradient(135deg, #f0f4ff, #f8f9fc 50%, #fdf8ee); padding: 36px 20px 60px; font-family: 'Inter', sans-serif; }
        .da-hero { background: linear-gradient(135deg, #1a2744, #243460); border-radius: 20px; padding: 32px 36px; margin-bottom: 28px; color: white; text-align: center; }
        .da-card { background: white; border-radius: 20px; box-shadow: 0 4px 24px rgba(26,39,68,0.08); border: 1px solid rgba(26,39,68,0.04); padding: 28px; margin-bottom: 24px; }
        .da-dropzone { border: 2.5px dashed #c7d2fe; border-radius: 16px; padding: 40px 24px; text-align: center; cursor: pointer; transition: all .25s; background: #f8faff; }
        .da-dropzone:hover, .da-dropzone.drag { border-color: #c9a84c; background: #fefdf5; }
        .da-mode-btn { background: #f3f4f6; border: 1.5px solid #e5e7eb; border-radius: 50px; padding: 8px 22px; font-size: .84rem; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; color: #374151; transition: all .2s; }
        .da-mode-btn.active { background: #1a2744; color: white; border-color: #1a2744; }
        .da-analyze-btn { background: linear-gradient(135deg,#c9a84c,#e8c96d); color: #1a2744; border: none; border-radius: 50px; padding: 13px 36px; font-size: .9rem; font-weight: 800; cursor: pointer; font-family: 'Inter', sans-serif; transition: all .25s; width: 100%; margin-top: 16px; }
        .da-analyze-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(201,168,76,0.4); }
        .da-analyze-btn:disabled { opacity: .6; cursor: not-allowed; }
        .da-textarea { width: 100%; min-height: 160px; border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 13px 15px; font-family: 'Inter', sans-serif; font-size: .84rem; color: #1a2744; resize: vertical; outline: none; transition: all .2s; background: #fafafa; box-sizing: border-box; }
        .da-textarea:focus { border-color: #1a2744; background: white; box-shadow: 0 0 0 3px rgba(26,39,68,0.06); }
        .da-dots span { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #c9a84c; margin: 0 3px; animation: daBounce 1.2s infinite; }
        .da-dots span:nth-child(2){animation-delay:.2s} .da-dots span:nth-child(3){animation-delay:.4s}
        @keyframes daBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-8px)}}
        .da-result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media(max-width:640px){ .da-result-grid { grid-template-columns: 1fr; } .da-hero{padding:22px 18px;} }
      `}</style>

      <div className="da-page">
        <div className="container-lg" style={{ maxWidth: 800 }}>

          {/* Hero */}
          <div className="da-hero">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(201,168,76,0.2)", border: "1px solid rgba(201,168,76,0.35)", borderRadius: 50, padding: "4px 16px", marginBottom: 14 }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#e8c96d", letterSpacing: "0.8px" }}>🤖 AI POWERED</span>
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.5rem,4vw,2rem)", margin: "0 0 10px" }}>
              Document Analyzer
            </h1>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.9rem", margin: 0, maxWidth: 500, marginInline: "auto" }}>
              Upload any legal document — FIR, court order, contract, affidavit — and get instant AI-powered analysis in plain English.
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="da-card">
            <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
              <button className={`da-mode-btn ${mode === "upload"  ? "active" : ""}`} onClick={() => { setMode("upload");  setResult(null); setCompareResult(null); setError(""); }}>📎 Upload File</button>
              <button className={`da-mode-btn ${mode === "paste"   ? "active" : ""}`} onClick={() => { setMode("paste");   setResult(null); setCompareResult(null); setError(""); }}>📋 Paste & Analyze</button>
              <button className={`da-mode-btn ${mode === "compare" ? "active" : ""}`} onClick={() => { setMode("compare"); setResult(null); setCompareResult(null); setError(""); }}>⚖️ Compare Docs</button>
            </div>

            {/* Upload Mode */}
            {mode === "upload" && (
              <>
                <div
                  className={`da-dropzone ${dragging ? "drag" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                >
                  <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>{file ? (isImage(file) ? "🖼️" : isPdf(file) ? "📄" : "📃") : "☁️"}</div>
                  {file ? (
                    <>
                      <p style={{ fontWeight: 700, color: "#1a2744", margin: "0 0 4px" }}>{file.name}</p>
                      <p style={{ fontSize: "0.78rem", color: "#9ca3af", margin: 0 }}>{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1a2744" }}>
                    Drop file here or click to browse
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: ".85rem", color: "#6b7280" }}>
                    PDFs, Images (JPG, PNG), Text files (.txt) · Max 10 MB
                  </p>
                  </>
                  )}
                  <input ref={inputRef} type="file" accept="image/*,.txt,.text,application/pdf" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
                </div>

                {/* Image Preview */}
                {preview && (
                  <div style={{ marginTop: 16, textAlign: "center" }}>
                    <img src={preview} alt="preview" style={{ maxHeight: 280, maxWidth: "100%", borderRadius: 12, border: "1px solid #e5e7eb", objectFit: "contain" }} />
                  </div>
                )}

                <button className="da-analyze-btn" onClick={handleAnalyze} disabled={loading || !file}>
                  {loading ? "Analyzing..." : "🔍 Analyze Document"}
                </button>
              </>
            )}

            {/* Paste Mode */}
            {mode === "paste" && (
              <>
                <p style={{ fontSize: ".83rem", color: "#6b7280", marginBottom: 8 }}>Open your PDF/document, select all text (Ctrl+A), copy (Ctrl+C), and paste below:</p>
                <textarea className="da-textarea" value={pasteText} onChange={e => setPasteText(e.target.value)}
                  placeholder="Paste document content here... FIR, court order, contract, affidavit..." />
                <p style={{ fontSize: ".72rem", color: "#9ca3af", textAlign: "right", margin: "4px 0 0" }}>{pasteText.length} characters</p>
                <button className="da-analyze-btn" onClick={handleAnalyze} disabled={loading || pasteText.trim().length < 50}>
                  {loading ? "Analyzing..." : "🔍 Analyze Document"}
                </button>
              </>
            )}

            {/* Compare Mode */}
            {mode === "compare" && (
              <>
                <p style={{ fontSize: ".83rem", color: "#6b7280", marginBottom: 12 }}>Paste two legal documents to compare them side-by-side:</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: ".72rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: ".6px", display: "block", marginBottom: 6 }}>Document 1</label>
                    <textarea className="da-textarea" value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder="Paste first document..." style={{ minHeight: 140 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: ".72rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: ".6px", display: "block", marginBottom: 6 }}>Document 2</label>
                    <textarea className="da-textarea" value={compareDoc2} onChange={e => setCompareDoc2(e.target.value)} placeholder="Paste second document..." style={{ minHeight: 140 }} />
                  </div>
                </div>
                <button className="da-analyze-btn" onClick={handleAnalyze} disabled={loading || !pasteText.trim() || !compareDoc2.trim()}>
                  {loading ? "Comparing..." : "⚖️ Compare Documents"}
                </button>
              </>
            )}

            {/* Error */}
            {error && (
              <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", color: "#991b1b", fontSize: "0.83rem", marginTop: 14, lineHeight: 1.6 }}>
                ⚠️ {error}
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="da-card" style={{ textAlign: "center", padding: "50px 20px" }}>
              <div className="da-dots" style={{ marginBottom: 18 }}><span /><span /><span /></div>
              <h4 style={{ fontFamily: "'Playfair Display', serif", color: "#1a2744", margin: "0 0 8px" }}>AI is analyzing your document...</h4>
              <p style={{ color: "#9ca3af", fontSize: "0.85rem", margin: 0 }}>Identifying key points, risks, legal implications & more</p>
            </div>
          )}

          {/* Compare Results */}
          {compareResult && !loading && (
            <div className="da-card">
              <h3 style={{ fontFamily: "'Playfair Display',serif", color: "#1a2744", marginBottom: 16, fontSize: "1.1rem" }}>⚖️ Document Comparison Report</h3>
              <p style={{ fontSize: ".88rem", color: "#374151", lineHeight: 1.7, marginBottom: 16 }}>{compareResult.overall_assessment}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div style={{ background: "#dcfce7", borderRadius: 12, padding: "14px 16px" }}>
                  <p style={{ fontWeight: 700, color: "#16a34a", fontSize: ".78rem", textTransform: "uppercase", margin: "0 0 8px" }}>✅ Doc 1 Advantages</p>
                  {(compareResult.doc1_advantages || []).map((a, i) => <p key={i} style={{ fontSize: ".82rem", color: "#374151", margin: "0 0 4px" }}>• {a}</p>)}
                </div>
                <div style={{ background: "#eef2ff", borderRadius: 12, padding: "14px 16px" }}>
                  <p style={{ fontWeight: 700, color: "#4338ca", fontSize: ".78rem", textTransform: "uppercase", margin: "0 0 8px" }}>✅ Doc 2 Advantages</p>
                  {(compareResult.doc2_advantages || []).map((a, i) => <p key={i} style={{ fontSize: ".82rem", color: "#374151", margin: "0 0 4px" }}>• {a}</p>)}
                </div>
              </div>
              {compareResult.conflicts?.length > 0 && (
                <Block title="Conflicts & Discrepancies" icon="⚡">
                  <ListItems items={compareResult.conflicts} icon="🔴" color="#dc2626" />
                </Block>
              )}
              <div style={{ background: "linear-gradient(135deg,#fef3c7,#fef9ee)", border: "2px solid #c9a84c", borderRadius: 12, padding: "14px 18px" }}>
                <p style={{ fontSize: ".72rem", fontWeight: 700, color: "#92400e", textTransform: "uppercase", margin: "0 0 6px" }}>📌 Recommendation</p>
                <p style={{ fontSize: ".88rem", color: "#1a2744", fontWeight: 600, margin: 0 }}>{compareResult.recommendation}</p>
              </div>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div>
              {/* Header */}
              <div className="da-card" style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.8px", margin: "0 0 4px" }}>Jurisdiction: {result.jurisdiction || "Not Specified"}</p>
                    <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#1a2744", margin: 0, fontSize: "1.3rem" }}>{result.document_type}</h2>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ background: riskBg[result.overall_risk_level] || "#fef3c7", color: riskColor[result.overall_risk_level] || "#d97706", border: `1.5px solid ${riskColor[result.overall_risk_level] || "#d97706"}33`, borderRadius: 50, padding: "5px 16px", fontSize: "0.82rem", fontWeight: 700 }}>
                      {result.overall_risk_level} Risk
                    </span>
                    <button onClick={() => { setResult(null); }} style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 50, padding: "5px 14px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", color: "#374151" }}>↩ New</button>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <Block title="Executive Summary" icon="📋">
                <p style={{ fontSize: "0.88rem", color: "#374151", lineHeight: 1.75, margin: 0 }}>{result.executive_summary}</p>
              </Block>

              <div className="da-result-grid">
                {(result.key_arguments_or_claims || []).length > 0 && (
                  <Block title="Key Arguments / Claims" icon="⚖️"><ListItems items={result.key_arguments_or_claims} icon="→" /></Block>
                )}
                {(result.evidentiary_support || []).length > 0 && (
                  <Block title="Evidentiary Support" icon="📎"><ListItems items={result.evidentiary_support} icon="•" color="#374151" /></Block>
                )}
              </div>

              {(result.parties_involved || []).length > 0 && (
                <Block title="Parties Involved" icon="👥">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {result.parties_involved.map((p, i) => <Tag key={i} text={`${p.name} (${p.type})`} />)}
                  </div>
                </Block>
              )}

              {(result.critical_deadlines || []).length > 0 && (
                <Block title="Critical Deadlines" icon="📅">
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {result.critical_deadlines.map((d, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", borderBottom: "1px solid #f0f0f0", paddingBottom: 6 }}>
                        <span style={{ color: "#6b7280" }}>{d.event}</span>
                        <strong style={{ color: "#1a2744" }}>{d.date}</strong>
                      </div>
                    ))}
                  </div>
                </Block>
              )}

              <div className="da-result-grid">
                {result.risk_assessment?.length > 0 && (
                  <Block title="Primary Risks" icon="⚠️"><ListItems items={result.risk_assessment} icon="🔴" color="#dc2626" /></Block>
                )}
                {result.procedural_defects?.length > 0 && (
                  <Block title="Procedural Defects" icon="⚠️"><ListItems items={result.procedural_defects} icon="⚠️" color="#b45309" /></Block>
                )}
              </div>

              <div className="da-result-grid">
                {(result.strategic_recommendations || []).length > 0 && (
                  <Block title="Strategic Recommendations" icon="🎯">
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(result.strategic_recommendations || []).map((a, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ background: "#c9a84c", color: "white", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800, flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
                          <span style={{ fontSize: "0.84rem", color: "#1a2744", lineHeight: 1.55 }}>{a}</span>
                        </div>
                      ))}
                    </div>
                  </Block>
                )}
                <Block title="Statutory Provisions" icon="📜">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(result.statutory_provisions || []).map((l, i) => <Tag key={i} text={l} color="#4338ca" bg="#eef2ff" />)}
                  </div>
                </Block>
              </div>

              {/* Auto-fill Case Fields Hint */}
              {result.case_fields?.title && (
                <div style={{ background: "#eef2ff", border: "1.5px solid #c7d2fe", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
                  <p style={{ fontSize: ".72rem", fontWeight: 700, color: "#4338ca", textTransform: "uppercase", letterSpacing: ".7px", margin: "0 0 8px" }}>🪄 Auto-Fill Case Suggestion</p>
                  <p style={{ fontSize: ".83rem", color: "#1a2744", margin: "0 0 4px" }}><strong>Suggested Title:</strong> {result.case_fields.title}</p>
                  <p style={{ fontSize: ".83rem", color: "#1a2744", margin: "0 0 4px" }}><strong>Category:</strong> {result.case_fields.category}</p>
                  <p style={{ fontSize: ".83rem", color: "#1a2744", margin: 0 }}><strong>IPC/BNS Sections:</strong> {result.case_fields.ipcSections}</p>
                  <p style={{ fontSize: ".72rem", color: "#6b7280", marginTop: 8 }}>💡 Use these details when adding a new case in your dashboard.</p>
                </div>
              )}

              {/* Draft Response */}
              {(mode === "paste" && pasteText.trim().length > 50) && (
                <div style={{ marginBottom: 16 }}>
                  <button onClick={handleDraft} disabled={drafting}
                    style={{ background: "linear-gradient(135deg,#1a2744,#243460)", color: "white", border: "none", borderRadius: 50, padding: "10px 24px", fontWeight: 700, fontSize: ".85rem", cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
                    {drafting ? "Drafting..." : "✍️ Draft AI Response / Counter-Document"}
                  </button>
                </div>
              )}

              {draftText && (
                <div style={{ background: "white", border: "1.5px solid #e5e7eb", borderRadius: 14, padding: "20px 22px", marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <p style={{ fontWeight: 700, color: "#1a2744", fontSize: ".9rem", margin: 0 }}>✍️ AI-Drafted Response</p>
                    <button onClick={() => { navigator.clipboard.writeText(draftText); setCopiedDraft(true); setTimeout(() => setCopiedDraft(false), 2000); }}
                      style={{ background: copiedDraft ? "#dcfce7" : "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 50, padding: "4px 14px", fontSize: ".75rem", fontWeight: 600, cursor: "pointer", color: copiedDraft ? "#16a34a" : "#374151" }}>
                      {copiedDraft ? "✅ Copied!" : "📋 Copy"}
                    </button>
                  </div>
                  <pre style={{ fontSize: ".82rem", color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "Georgia,serif", margin: 0, background: "#fafafa", borderRadius: 10, padding: "14px 16px", border: "1px solid #f0f0f0" }}>{draftText}</pre>
                </div>
              )}

              <p style={{ textAlign: "center", color: "#9ca3af", fontSize: ".73rem", lineHeight: 1.6 }}>
                ⚠️ AI analysis is for reference only and does not constitute legal advice. Always consult a qualified lawyer.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
