// src/components/Case/DocAnalyzer.js
import React, { useState, useEffect } from "react";

import { extractTextFromPDF } from "../../utils/pdfParser";
import { toBase64, readAsText, isPdf, isImage, isText } from "../../utils/fileUtils";

const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;
const GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are an elite Indian legal analyst and corporate counsel with 30+ years of experience.
Analyze the provided legal document text (e.g., Vakalatnama, Plaint, Written Statement, Affidavit, FIR, Charge Sheet, Commercial Contract, etc.) and return ONLY a valid JSON object with this exact industry-standard structure:
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
  "overall_risk_level": "High" | "Medium" | "Low",
  "risk_assessment": ["<Critical Risk 1>", "<Critical Risk 2>"],
  "strategic_recommendations": ["<Actionable legal step 1>", "<Actionable legal step 2>"]
}`;

async function analyzeDocument(text) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: `Analyze this legal document:\n\n${text}` },
      ],
      temperature: 0.2,
      max_tokens: 1800,
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
          { type: "text", text: `You are a senior Indian legal analyst. Analyze this legal document image and return ONLY a valid JSON object:\n${SYSTEM_PROMPT.split("industry-standard structure:")[1]}` },
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

const riskColors = { High: "#dc2626", Medium: "#d97706", Low: "#16a34a" };
const riskBgs    = { High: "#fee2e2", Medium: "#fef3c7", Low: "#dcfce7" };

function Tag({ text, color = "#4338ca", bg = "#eef2ff" }) {
  return (
    <span style={{ background: bg, color, border: `1px solid ${color}22`, borderRadius: 6, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 600, display: "inline-block", margin: "3px 4px 3px 0" }}>
      {text}
    </span>
  );
}

function Block({ title, icon, children }) {
  return (
    <div style={{ background: "#f8faff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
      <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#9ca3af", margin: "0 0 10px" }}>{icon} {title}</p>
      {children}
    </div>
  );
}

function ListBlock({ items, icon = "•", color = "#374151" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {(items || []).map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ color: "#c9a84c", fontWeight: 700, flexShrink: 0 }}>{icon}</span>
          <span style={{ fontSize: "0.83rem", color, lineHeight: 1.55 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

export default function DocAnalyzer({ fileName, fileUrl, onClose }) {
  const [text, setText]       = useState("");
  const [file, setFile]       = useState(null);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (fileUrl) {
      const autoFetchAndAnalyze = async () => {
        setLoading(true); setError(""); setResult(null);
        try {
          // Cloudinary blocks direct CORS fetching for raw PDF files.
          // We use corsproxy.io to safely fetch the binary PDF blob without corruption.
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(fileUrl)}`;
          const response = await fetch(proxyUrl);
          
          if (!response.ok) throw new Error("Failed to fetch document from cloud.");
          const blob = await response.blob();
          
          let type = blob.type;
          const ext = fileName?.split('.').pop()?.toLowerCase();
          if (ext === 'pdf') type = "application/pdf";
          if (["jpg","jpeg","png"].includes(ext)) type = `image/${ext}`;
          if (ext === 'txt') type = "text/plain";
          
          const autoFile = new File([blob], fileName || "document", { type });
          setFile(autoFile);
          await performAnalysis(autoFile, null);
        } catch (e) {
          setError(`Auto-analysis failed: ${e.message}`);
          setLoading(false);
        }
      };
      autoFetchAndAnalyze();
    }
  }, [fileUrl, fileName]);

  const performAnalysis = async (targetFile, targetText) => {
    setLoading(true); setError(""); setResult(null);
    try {
      let r;
      if (targetFile) {
        if (isImage(targetFile)) {
          const b64 = await toBase64(targetFile);
          r = await analyzeImage(b64, targetFile.type);
        } else if (isPdf(targetFile)) {
          const extracted = await extractTextFromPDF(targetFile);
          if (!extracted || extracted.trim().length < 15) throw new Error("Could not extract text from this PDF.");
          r = await analyzeDocument(extracted);
        } else if (isText(targetFile)) {
          const extracted = await readAsText(targetFile);
          r = await analyzeDocument(extracted);
        } else {
          throw new Error("Unsupported file type. Use PDFs, Images, or Text files.");
        }
      } else {
        r = await analyzeDocument(targetText);
      }
      setResult(r);
    } catch (e) {
      setError(`AI analysis failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = () => {
    if (!file && (!text.trim() || text.trim().length < 50)) {
      setError("Please paste at least 50 characters or select a file to analyze.");
      return;
    }
    performAnalysis(file, text);
  };

  return (
    <>
      <style>{`
        .da-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1000; display:flex; justify-content:flex-end; }
        .da-panel { width:min(520px,100vw); height:100vh; background:white; box-shadow:-8px 0 40px rgba(0,0,0,0.15); display:flex; flex-direction:column; animation:daSlide .3s ease; }
        @keyframes daSlide { from{transform:translateX(100%)} to{transform:translateX(0)} }
        .da-header { background:linear-gradient(135deg,#1a2744,#243460); padding:20px 22px; flex-shrink:0; }
        .da-body { flex:1; overflow-y:auto; padding:20px 22px; }
        .da-textarea { width:100%; min-height:130px; border:1.5px solid #e5e7eb; border-radius:12px; padding:12px 14px; font-family:'Inter',sans-serif; font-size:0.83rem; color:#1a2744; resize:vertical; outline:none; transition:all .2s; background:#fafafa; box-sizing:border-box; }
        .da-textarea:focus { border-color:#1a2744; background:white; box-shadow:0 0 0 3px rgba(26,39,68,0.06); }
        .da-btn { background:linear-gradient(135deg,#c9a84c,#e8c96d); color:#1a2744; border:none; border-radius:50px; padding:11px 26px; font-size:0.85rem; font-weight:800; cursor:pointer; transition:all .2s; font-family:'Inter',sans-serif; width:100%; margin-top:10px; }
        .da-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 22px rgba(201,168,76,0.4); }
        .da-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .da-close { background:rgba(255,255,255,0.12); border:1.5px solid rgba(255,255,255,0.2); border-radius:50px; padding:5px 14px; color:rgba(255,255,255,0.8); font-size:0.8rem; cursor:pointer; font-family:'Inter',sans-serif; }
        .da-close:hover { background:rgba(255,255,255,0.22); color:white; }
        .da-dots span { display:inline-block; width:7px; height:7px; border-radius:50%; background:#c9a84c; margin:0 3px; animation:daBounce 1.2s infinite; }
        .da-dots span:nth-child(2){animation-delay:.2s} .da-dots span:nth-child(3){animation-delay:.4s}
        @keyframes daBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}}
      `}</style>

      <div className="da-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="da-panel">

          {/* Header */}
          <div className="da-header">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(201,168,76,0.2)", border: "1px solid rgba(201,168,76,0.35)", borderRadius: 50, padding: "3px 12px", marginBottom: 8 }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#e8c96d", letterSpacing: "0.8px" }}>🤖 AI ANALYZER</span>
                </div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", color: "white", fontSize: "1.1rem", margin: 0 }}>Document Analyzer</h2>
                {fileName && <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.75rem", margin: "4px 0 0", wordBreak: "break-all" }}>📄 {fileName}</p>}
              </div>
              <button className="da-close" onClick={onClose}>✕ Close</button>
            </div>
          </div>

          {/* Body */}
          <div className="da-body">

            {/* Input */}
            {!result && !loading && !fileUrl && (
              <div>
                <p style={{ fontSize: "0.83rem", color: "#374151", fontWeight: 600, marginBottom: 6 }}>
                  Option 1: Upload a document (PDF, Image, Text)
                </p>
                <div style={{ marginBottom: 20, border: "2px dashed #c7d2fe", borderRadius: 12, padding: 16, textAlign: "center", background: "#f8faff" }}>
                  <input type="file" id="da-file-upload" style={{ display: "none" }} accept="application/pdf,image/*,.txt" onChange={(e) => { setFile(e.target.files[0]); setText(""); }} />
                  <label htmlFor="da-file-upload" style={{ cursor: "pointer", display: "block" }}>
                    <span style={{ fontSize: "1.2rem" }}>📄</span>
                    <p style={{ margin: "6px 0 0", fontSize: "0.85rem", fontWeight: 700, color: "#1a2744" }}>{file ? file.name : "Click to select a file"}</p>
                    {!file && <p style={{ margin: 0, fontSize: "0.75rem", color: "#9ca3af" }}>Supports PDFs, Images, and Text files</p>}
                  </label>
                  {file && <button onClick={() => setFile(null)} style={{ background: "none", border: "none", color: "#dc2626", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", marginTop: 6 }}>Remove File</button>}
                </div>

                <div style={{ textAlign: "center", position: "relative", margin: "20px 0" }}>
                  <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: 0 }} />
                  <span style={{ background: "white", padding: "0 10px", color: "#9ca3af", fontSize: "0.8rem", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>OR</span>
                </div>

                <p style={{ fontSize: "0.83rem", color: "#374151", fontWeight: 600, marginBottom: 6 }}>
                  Option 2: Paste document text
                </p>
                <textarea
                  className="da-textarea"
                  value={text}
                  onChange={(e) => { setText(e.target.value); setFile(null); }}
                  placeholder="Paste document text here... e.g. FIR copy, court order, bail application, contract, affidavit..."
                  disabled={!!file}
                  style={{ opacity: file ? 0.5 : 1 }}
                />
                <p style={{ fontSize: "0.72rem", color: "#9ca3af", textAlign: "right", margin: "4px 0 0" }}>{text.length} characters</p>
                
                {error && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", color: "#991b1b", fontSize: "0.8rem", marginTop: 10 }}>⚠️ {error}</div>}
                
                <button className="da-btn" onClick={handleAnalyze} disabled={loading || (!file && !text.trim())}>
                  {loading ? "Analyzing..." : "🔍 Analyze Document"}
                </button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div className="da-dots" style={{ marginBottom: 16 }}><span /><span /><span /></div>
                <p style={{ fontWeight: 700, color: "#1a2744", margin: "0 0 6px" }}>AI is reading the document...</p>
                <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Identifying key points, risks & legal implications</p>
              </div>
            )}

            {/* Results */}
            {result && !loading && (
              <>
                {/* Top bar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.8px" }}>Jurisdiction: {result.jurisdiction || "Not Specified"}</span>
                    <p style={{ fontFamily: "'Playfair Display', serif", color: "#1a2744", fontWeight: 700, margin: "2px 0 0", fontSize: "1rem" }}>{result.document_type}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ background: riskBgs[result.overall_risk_level] || "#fef3c7", color: riskColors[result.overall_risk_level] || "#d97706", border: `1.5px solid ${riskColors[result.overall_risk_level] || "#d97706"}33`, borderRadius: 50, padding: "4px 14px", fontSize: "0.78rem", fontWeight: 700 }}>
                      {result.overall_risk_level} Risk
                    </span>
                    <button onClick={() => { setResult(null); setText(""); }} style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 50, padding: "4px 12px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", color: "#374151" }}>
                      ↩ Re-analyze
                    </button>
                  </div>
                </div>

                {/* Summary */}
                <Block title="Executive Summary" icon="📋">
                  <p style={{ fontSize: "0.84rem", color: "#374151", lineHeight: 1.7, margin: 0 }}>{result.executive_summary}</p>
                </Block>

                {/* Parties */}
                {(result.parties_involved || []).length > 0 && (
                  <Block title="Parties Involved" icon="👥">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {(result.parties_involved || []).map((p, i) => (
                        <Tag key={i} text={`${p.name} (${p.type})`} color="#1a2744" bg="#eef2ff" />
                      ))}
                    </div>
                  </Block>
                )}

                {/* Key Arguments / Claims */}
                {(result.key_arguments_or_claims || []).length > 0 && (
                  <Block title="Key Arguments / Claims" icon="⚖️">
                    <ListBlock items={result.key_arguments_or_claims} icon="→" />
                  </Block>
                )}

                {/* Statutory Provisions */}
                {(result.statutory_provisions || []).length > 0 && (
                  <Block title="Statutory Provisions" icon="📜">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {(result.statutory_provisions || []).map((l, i) => (
                        <Tag key={i} text={l} color="#4338ca" bg="#eef2ff" />
                      ))}
                    </div>
                  </Block>
                )}

                {/* Evidentiary Support */}
                {(result.evidentiary_support || []).length > 0 && (
                  <Block title="Evidentiary Support" icon="📎">
                    <ListBlock items={result.evidentiary_support} icon="•" color="#374151" />
                  </Block>
                )}

                {/* Important Dates */}
                {(result.critical_deadlines || []).length > 0 && (
                  <Block title="Critical Deadlines" icon="📅">
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {result.critical_deadlines.map((d, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                          <span style={{ color: "#6b7280" }}>{d.event}</span>
                          <strong style={{ color: "#1a2744" }}>{d.date}</strong>
                        </div>
                      ))}
                    </div>
                  </Block>
                )}

                {/* Risk Flags & Procedural Defects */}
                {((result.risk_assessment || []).length > 0 || (result.procedural_defects || []).length > 0) && (
                  <Block title="Risk Assessment & Defects" icon="⚠️">
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {result.risk_assessment?.length > 0 && (
                        <div>
                          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#991b1b", margin: "0 0 6px" }}>PRIMARY RISKS:</p>
                          <ListBlock items={result.risk_assessment} icon="🔴" color="#dc2626" />
                        </div>
                      )}
                      {result.procedural_defects?.length > 0 && (
                        <div>
                          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#d97706", margin: "0 0 6px" }}>PROCEDURAL DEFECTS:</p>
                          <ListBlock items={result.procedural_defects} icon="⚠️" color="#b45309" />
                        </div>
                      )}
                    </div>
                  </Block>
                )}

                {/* Strategic Recommendations */}
                {(result.strategic_recommendations || []).length > 0 && (
                  <Block title="Strategic Recommendations" icon="🎯">
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(result.strategic_recommendations || []).map((a, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ background: "#c9a84c", color: "white", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800, flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
                          <span style={{ fontSize: "0.83rem", color: "#1a2744", lineHeight: 1.55 }}>{a}</span>
                        </div>
                      ))}
                    </div>
                  </Block>
                )}

                <p style={{ fontSize: "0.7rem", color: "#9ca3af", textAlign: "center", lineHeight: 1.5, marginTop: 8 }}>
                  ⚠️ AI analysis is for reference only. Always verify with a qualified legal professional.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
