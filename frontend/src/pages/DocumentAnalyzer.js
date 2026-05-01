// src/pages/DocumentAnalyzer.js
import React, { useState, useRef } from "react";

const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const ANALYSIS_PROMPT = `You are a senior Indian legal analyst with 30+ years of experience.
Analyze the provided legal document and return ONLY a valid JSON object:
{
  "document_type": "<e.g. FIR, Court Order, Contract, Affidavit, Bail Application, Petition, Notice>",
  "summary": "<3-4 sentence plain-English summary>",
  "key_points": ["<point 1>", "<point 2>", "<point 3>", "<point 4>", "<point 5>"],
  "parties_involved": ["<party 1>", "<party 2>"],
  "important_dates": [{"label": "<label>", "date": "<date>"}],
  "risk_flags": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "legal_implications": ["<implication 1>", "<implication 2>", "<implication 3>"],
  "applicable_laws": ["<IPC/CPC section 1>", "<law 2>"],
  "action_items": ["<action 1>", "<action 2>", "<action 3>"],
  "overall_risk_level": "High",
  "lawyer_advice": "<specific advice for handling this document>"
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

async function analyzeImage(base64, mimeType) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `You are a senior Indian legal analyst. Analyze this legal document image and return ONLY a valid JSON object:\n${ANALYSIS_PROMPT.split("return ONLY a valid JSON object:")[1]}` },
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
  const [mode, setMode]         = useState("upload"); // "upload" | "paste"
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [dragging, setDragging] = useState(false);
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
    setLoading(true); setError(""); setResult(null);
    try {
      let analysis;
      if (mode === "paste") {
        if (!pasteText.trim() || pasteText.trim().length < 50) throw new Error("Please paste at least 50 characters of document text.");
        analysis = await analyzeText(pasteText);
      } else if (isImage(file)) {
        const b64 = await toBase64(file);
        analysis = await analyzeImage(b64, file.type);
      } else if (isText(file)) {
        const text = await readAsText(file);
        analysis = await analyzeText(text);
      } else if (isPdf(file)) {
        throw new Error("PDF text extraction requires copy-paste. Switch to 'Paste Text' mode, open the PDF, copy all text (Ctrl+A → Ctrl+C) and paste it there.");
      } else {
        throw new Error("Unsupported file type. Use images, text files, or switch to Paste Text mode for PDFs.");
      }
      setResult(analysis);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
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
            <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
              <button className={`da-mode-btn ${mode === "upload" ? "active" : ""}`} onClick={() => { setMode("upload"); setResult(null); setError(""); }}>📎 Upload File</button>
              <button className={`da-mode-btn ${mode === "paste"  ? "active" : ""}`} onClick={() => { setMode("paste");  setResult(null); setError(""); }}>📋 Paste Text</button>
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
                      <p style={{ fontWeight: 700, color: "#1a2744", margin: "0 0 4px" }}>Drop file here or click to browse</p>
                      <p style={{ fontSize: "0.78rem", color: "#9ca3af", margin: 0 }}>Images (JPG, PNG) · Text files (.txt) · Max 10 MB</p>
                      <p style={{ fontSize: "0.73rem", color: "#c9a84c", margin: "6px 0 0", fontWeight: 600 }}>📄 For PDFs: use "Paste Text" mode</p>
                    </>
                  )}
                  <input ref={inputRef} type="file" accept="image/*,.txt,.text" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
                </div>

                {/* Image Preview */}
                {preview && (
                  <div style={{ marginTop: 16, textAlign: "center" }}>
                    <img src={preview} alt="preview" style={{ maxHeight: 280, maxWidth: "100%", borderRadius: 12, border: "1px solid #e5e7eb", objectFit: "contain" }} />
                  </div>
                )}

                {/* PDF note */}
                {isPdf(file) && (
                  <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 10, padding: "11px 14px", marginTop: 14, fontSize: "0.82rem", color: "#92400e" }}>
                    💡 <strong>PDF detected:</strong> Open the PDF, press Ctrl+A, copy, then switch to <strong>Paste Text</strong> mode.
                  </div>
                )}

                <button className="da-analyze-btn" onClick={handleAnalyze} disabled={loading || !file || isPdf(file)}>
                  {loading ? "Analyzing..." : "🔍 Analyze Document"}
                </button>
              </>
            )}

            {/* Paste Mode */}
            {mode === "paste" && (
              <>
                <p style={{ fontSize: "0.83rem", color: "#6b7280", marginBottom: 8 }}>
                  Open your PDF/document, select all text (Ctrl+A), copy (Ctrl+C), and paste below:
                </p>
                <textarea
                  className="da-textarea"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste document content here... FIR, court order, contract, affidavit, bail application..."
                />
                <p style={{ fontSize: "0.72rem", color: "#9ca3af", textAlign: "right", margin: "4px 0 0" }}>{pasteText.length} characters</p>
                <button className="da-analyze-btn" onClick={handleAnalyze} disabled={loading || pasteText.trim().length < 50}>
                  {loading ? "Analyzing..." : "🔍 Analyze Document"}
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

          {/* Results */}
          {result && !loading && (
            <div>
              {/* Header */}
              <div className="da-card" style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.8px", margin: "0 0 4px" }}>Document Type</p>
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
              <Block title="Summary" icon="📋">
                <p style={{ fontSize: "0.88rem", color: "#374151", lineHeight: 1.75, margin: 0 }}>{result.summary}</p>
              </Block>

              <div className="da-result-grid">
                <Block title="Key Points" icon="🔑"><ListItems items={result.key_points} icon="→" /></Block>
                <Block title="Risk Flags" icon="⚠️"><ListItems items={result.risk_flags} icon="🔴" color="#dc2626" /></Block>
              </div>

              {(result.parties_involved || []).length > 0 && (
                <Block title="Parties Involved" icon="👥">
                  <div>{result.parties_involved.map((p, i) => <Tag key={i} text={p} />)}</div>
                </Block>
              )}

              {(result.important_dates || []).length > 0 && (
                <Block title="Important Dates & Deadlines" icon="📅">
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {result.important_dates.map((d, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", borderBottom: "1px solid #f0f0f0", paddingBottom: 6 }}>
                        <span style={{ color: "#6b7280" }}>{d.label}</span>
                        <strong style={{ color: "#1a2744" }}>{d.date}</strong>
                      </div>
                    ))}
                  </div>
                </Block>
              )}

              <div className="da-result-grid">
                <Block title="Legal Implications" icon="⚖️"><ListItems items={result.legal_implications} icon="→" /></Block>
                <Block title="Action Items" icon="🎯">
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(result.action_items || []).map((a, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ background: "#c9a84c", color: "white", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800, flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
                        <span style={{ fontSize: "0.84rem", color: "#1a2744", lineHeight: 1.55 }}>{a}</span>
                      </div>
                    ))}
                  </div>
                </Block>
              </div>

              <Block title="Applicable Laws & Sections" icon="📜">
                <div>{(result.applicable_laws || []).map((l, i) => <Tag key={i} text={l} color="#4338ca" bg="#eef2ff" />)}</div>
              </Block>

              {result.lawyer_advice && (
                <div style={{ background: "linear-gradient(135deg,#fef3c7,#fef9ee)", border: "2px solid #c9a84c", borderRadius: 14, padding: "18px 20px", marginBottom: 16 }}>
                  <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#92400e", margin: "0 0 8px" }}>💡 Lawyer's Advisory</p>
                  <p style={{ fontSize: "0.88rem", color: "#1a2744", lineHeight: 1.7, margin: 0, fontWeight: 500 }}>{result.lawyer_advice}</p>
                </div>
              )}

              <p style={{ textAlign: "center", color: "#9ca3af", fontSize: "0.73rem", lineHeight: 1.6 }}>
                ⚠️ AI analysis is for reference only and does not constitute legal advice. Always consult a qualified lawyer.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
