// src/components/Chatbot/Chatbot.js
import React, { useState, useRef, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase";

const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;
const GROQ_MODEL   = "llama-3.3-70b-versatile";
const GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions";

function buildSystemPrompt(jurisdiction, caseContext) {
  let prompt = `You are the Principal Legal AI Consultant for LawyerLink, an expert in Indian jurisprudence — BNS, BNSS, BSA, IPC, CrPC, CPC, and fundamental rights under the Constitution of India.`;
  if (jurisdiction) prompt += `\n\nJURISDICTION: The user is based in ${jurisdiction}. Reference relevant ${jurisdiction} state laws, local court procedures, and High Court rules where applicable.`;
  if (caseContext) prompt += `\n\nACTIVE CASE CONTEXT:\n${caseContext}\nWhen the user asks about "my case" or "this case", refer to the above details specifically.`;
  prompt += `

RESPONSE RULES:
• Keep every answer to 5-7 sentences max. Be precise and structured.
• Use bullet points for procedural steps or key sections.
• Cite specific sections (BNS/IPC/CPC) when relevant.
• At the end of each answer, provide exactly 3 concise follow-up questions as JSON:
  FOLLOWUPS:["Question 1?","Question 2?","Question 3?"]
• Always end with: "Consult a qualified lawyer for case-specific advice."`;
  return prompt;
}

async function askAI(messages) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: 0.3, max_tokens: 450 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data.choices?.[0]?.message?.content || "⚠️ No response generated.";
}

function parseFollowups(text) {
  try {
    const match = text.match(/FOLLOWUPS:\s*(\[.*?\])/s);
    if (match) return JSON.parse(match[1]);
  } catch (_) {}
  return [];
}

function stripFollowups(text) {
  return text.replace(/FOLLOWUPS:\s*\[.*?\]/s, "").trim();
}

function renderMarkdown(text) {
  if (!text) return null;
  return text.split("\n").map((line, i) => {
    const isBullet = line.trim().startsWith("* ") || line.trim().startsWith("- ");
    const content  = isBullet ? line.trim().substring(2) : line;
    const parts    = content.split(/(\*\*.*?\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={j} style={{ color: "#111827", fontWeight: 700 }}>{p.slice(2, -2)}</strong>
        : p
    );
    if (isBullet) return (
      <div key={i} style={{ display: "flex", gap: 8, marginTop: 6, marginLeft: 4 }}>
        <span style={{ color: "#c9a84c", fontWeight: "bold" }}>•</span>
        <span>{parts}</span>
      </div>
    );
    return <div key={i} style={{ marginTop: i > 0 && content ? 8 : 0 }}>{parts}</div>;
  });
}

const INDIAN_STATES = ["Delhi","Maharashtra","Karnataka","Tamil Nadu","West Bengal","Gujarat","Rajasthan","Uttar Pradesh","Punjab","Kerala","Haryana","Bihar","Telangana","Madhya Pradesh","Andhra Pradesh"];

const QUICK_QUESTIONS = [
  "What is an FIR and how to file it?",
  "Tenant rights under Indian law",
  "Bail procedure in India",
  "How to file a consumer complaint?",
  "My case hearing date is approaching — what should I prepare?",
];

export default function Chatbot() {
  const [input, setInput]           = useState("");
  const [history, setHistory]       = useState([]); // [{q, a, followups}]
  const [loading, setLoading]       = useState(false);
  const [jurisdiction, setJurisdiction] = useState("");
  const [showJurisPanel, setShowJurisPanel] = useState(false);
  const [caseContext, setCaseContext]   = useState(null);
  const [loadingCases, setLoadingCases] = useState(false);
  const [savedId, setSavedId]           = useState(null);
  const chatEndRef = useRef(null);
  const user = auth.currentUser;

  // Build Groq conversation history for context window
  const buildMessages = (history, systemPrompt) => [
    { role: "system", content: systemPrompt },
    ...history.flatMap(h => [
      { role: "user",      content: h.q },
      ...(h.a ? [{ role: "assistant", content: h.a_raw || h.a }] : []),
    ]),
  ];

  const send = async (question = input.trim()) => {
    if (!question) return;
    setHistory(prev => [...prev, { q: question, a: null, followups: [] }]);
    setInput("");
    setLoading(true);
    try {
      const sysPrompt = buildSystemPrompt(jurisdiction, caseContext);
      const msgs      = buildMessages(history, sysPrompt);
      msgs.push({ role: "user", content: question });
      const raw       = await askAI(msgs);
      const followups = parseFollowups(raw);
      const answer    = stripFollowups(raw);
      setHistory(prev => prev.map((h, i) =>
        i === prev.length - 1 ? { ...h, a: answer, a_raw: raw, followups } : h
      ));
    } catch (err) {
      const msg = err.message.includes("invalid_api_key") ? "🔑 Invalid API key."
        : err.message.includes("rate_limit") ? "⏱️ Rate limit. Try again."
        : `⚠️ ${err.message}`;
      setHistory(prev => prev.map((h, i) => i === prev.length - 1 ? { ...h, a: msg, followups: [] } : h));
    } finally {
      setLoading(false);
    }
  };

  const loadCaseContext = async () => {
    if (!user) return;
    setLoadingCases(true);
    try {
      const snap = await getDocs(query(collection(db, "cases"), where("lawyerId", "==", user.uid)));
      const snap2 = await getDocs(query(collection(db, "cases"), where("litigantId", "==", user.uid)));
      const all = [...snap.docs, ...snap2.docs].map(d => d.data());
      if (all.length === 0) { setCaseContext("No cases found."); return; }
      // Use most recent case
      const c = all[0];
      const ctx = `Title: ${c.title}\nCategory: ${c.category}\nStatus: ${c.status}\nNext Hearing: ${c.next_hearing_date || "—"}\nDescription: ${c.description || "—"}\nIPC Sections: ${c.ipcSections || "—"}`;
      setCaseContext(ctx);
    } catch (e) { console.error(e); }
    finally { setLoadingCases(false); }
  };

  const saveConversation = async () => {
    if (!user || history.length === 0) return;
    const ref = await addDoc(collection(db, "chatHistory", user.uid, "conversations"), {
      messages: history.map(h => ({ q: h.q, a: h.a || "" })),
      jurisdiction,
      savedAt: serverTimestamp(),
    });
    setSavedId(ref.id);
    setTimeout(() => setSavedId(null), 3000);
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history, loading]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;700;800&display=swap');
        .cb-wrapper{min-height:100vh;background:linear-gradient(-45deg,#0f1d3a,#1a2744,#243460,#1a3a5c);background-size:400% 400%;animation:cbGrad 10s ease infinite;display:flex;align-items:center;justify-content:center;padding:24px 16px;font-family:'Inter',sans-serif;position:relative;overflow:hidden;}
        @keyframes cbGrad{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        .cb-orb1{position:absolute;width:400px;height:400px;border-radius:50%;background:#c9a84c;filter:blur(120px);opacity:.07;top:-100px;right:-100px;}
        .cb-orb2{position:absolute;width:300px;height:300px;border-radius:50%;background:#3b82f6;filter:blur(120px);opacity:.07;bottom:-80px;left:-100px;}
        .cb-container{width:100%;max-width:720px;height:88vh;max-height:800px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:28px;display:flex;flex-direction:column;overflow:hidden;backdrop-filter:blur(20px);box-shadow:0 32px 80px rgba(0,0,0,.4);position:relative;z-index:1;}
        .cb-header{padding:16px 22px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.03);flex-wrap:wrap;}
        .cb-avatar{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#c9a84c,#e8c96d);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;}
        .cb-header-title{font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;color:white;margin:0;}
        .cb-header-sub{font-size:.72rem;color:rgba(255,255,255,.5);margin:2px 0 0;}
        .cb-status-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;animation:blink 2s infinite;box-shadow:0 0 8px #22c55e;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
        .cb-header-actions{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;}
        .cb-hbtn{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:50px;padding:5px 13px;font-size:.72rem;font-weight:600;color:rgba(255,255,255,.75);cursor:pointer;transition:all .2s;font-family:'Inter',sans-serif;}
        .cb-hbtn:hover{background:rgba(255,255,255,.16);}
        .cb-hbtn.active{background:rgba(201,168,76,.25);border-color:rgba(201,168,76,.5);color:#e8c96d;}
        .cb-messages{flex:1;overflow-y:auto;padding:20px 18px;display:flex;flex-direction:column;gap:14px;}
        .cb-messages::-webkit-scrollbar{width:4px;}
        .cb-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px;}
        .cb-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:20px;color:rgba(255,255,255,.35);}
        .cb-empty-icon{font-size:3rem;margin-bottom:12px;}
        .cb-empty h4{font-family:'Playfair Display',serif;color:rgba(255,255,255,.55);font-size:1.05rem;margin-bottom:8px;}
        .cb-empty p{font-size:.8rem;max-width:280px;line-height:1.6;}
        .cb-suggestions{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:14px;}
        .cb-chip{background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.25);color:#e8c96d;border-radius:50px;padding:6px 14px;font-size:.72rem;font-weight:600;cursor:pointer;transition:all .2s;text-align:left;}
        .cb-chip:hover{background:rgba(201,168,76,.25);}
        .cb-msg-row{display:flex;gap:10px;}
        .cb-msg-row.user{flex-direction:row-reverse;}
        .cb-msg-icon{width:30px;height:30px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:.85rem;flex-shrink:0;align-self:flex-end;}
        .cb-user-icon{background:linear-gradient(135deg,#1a2744,#243460);}
        .cb-bot-icon{background:linear-gradient(135deg,#c9a84c,#e8c96d);}
        .cb-bubble{max-width:76%;padding:11px 15px;border-radius:18px;font-size:.865rem;line-height:1.65;word-break:break-word;}
        .cb-user-bubble{background:rgba(255,255,255,.12);color:white;border-bottom-right-radius:4px;border:1px solid rgba(255,255,255,.1);}
        .cb-bot-bubble{background:rgba(255,255,255,.94);color:#1a2744;border-bottom-left-radius:4px;box-shadow:0 4px 14px rgba(0,0,0,.15);}
        .cb-followups{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}
        .cb-followup{background:rgba(26,39,68,.08);border:1px solid rgba(26,39,68,.15);color:#374151;border-radius:50px;padding:4px 12px;font-size:.7rem;font-weight:600;cursor:pointer;transition:all .2s;}
        .cb-followup:hover{background:#1a2744;color:white;}
        .cb-typing{display:flex;gap:5px;align-items:center;padding:12px 14px;}
        .cb-dot{width:7px;height:7px;background:#9ca3af;border-radius:50%;animation:dot 1.2s infinite;}
        .cb-dot:nth-child(2){animation-delay:.2s}.cb-dot:nth-child(3){animation-delay:.4s}
        @keyframes dot{0%,80%,100%{transform:scale(.7);opacity:.4}40%{transform:scale(1);opacity:1}}
        .cb-input-area{padding:14px 18px;border-top:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);}
        .cb-input-row{display:flex;gap:10px;align-items:center;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:50px;padding:8px 8px 8px 16px;}
        .cb-input{flex:1;background:transparent;border:none;outline:none;font-family:'Inter',sans-serif;font-size:.875rem;color:white;}
        .cb-input::placeholder{color:rgba(255,255,255,.35);}
        .cb-send-btn{width:36px;height:36px;border-radius:50%;border:none;background:linear-gradient(135deg,#c9a84c,#e8c96d);color:#1a2744;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.95rem;transition:all .2s;font-weight:700;flex-shrink:0;}
        .cb-send-btn:hover:not(:disabled){transform:scale(1.1);box-shadow:0 4px 14px rgba(201,168,76,.5);}
        .cb-send-btn:disabled{opacity:.5;cursor:not-allowed;}
        .cb-hint{text-align:center;font-size:.68rem;color:rgba(255,255,255,.22);margin-top:7px;}
        .cb-juris-panel{position:absolute;top:70px;right:16px;background:rgba(20,32,60,.97);border:1px solid rgba(255,255,255,.15);border-radius:16px;padding:16px;z-index:10;backdrop-filter:blur(20px);min-width:200px;}
        .cb-context-badge{background:rgba(201,168,76,.2);border:1px solid rgba(201,168,76,.4);border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:.72rem;color:#e8c96d;line-height:1.5;}
      `}</style>

      <div className="cb-wrapper">
        <div className="cb-orb1" /><div className="cb-orb2" />

        <div className="cb-container">
          {/* Header */}
          <div className="cb-header">
            <div className="cb-avatar">⚖️</div>
            <div>
              <h4 className="cb-header-title">Legal AI Assistant</h4>
              <p className="cb-header-sub">
                {jurisdiction ? `📍 ${jurisdiction}` : "India"} · {caseContext ? "Case-Aware Mode 🟢" : "General Mode"}
              </p>
            </div>
            <div className="cb-status-dot" title="Online" />
            <div className="cb-header-actions">
              <button className={`cb-hbtn ${caseContext ? "active" : ""}`}
                onClick={caseContext ? () => setCaseContext(null) : loadCaseContext} disabled={loadingCases}>
                {loadingCases ? "Loading..." : caseContext ? "🗂 Case: ON" : "🗂 Load Case"}
              </button>
              <button className={`cb-hbtn ${showJurisPanel ? "active" : ""}`}
                onClick={() => setShowJurisPanel(p => !p)}>
                📍 {jurisdiction || "Jurisdiction"}
              </button>
              {history.length > 0 && (
                <button className="cb-hbtn" onClick={saveConversation}>
                  {savedId ? "✅ Saved!" : "💾 Save"}
                </button>
              )}
              {history.length > 0 && (
                <button className="cb-hbtn" onClick={() => setHistory([])}>🗑 Clear</button>
              )}
            </div>

            {/* Jurisdiction Panel */}
            {showJurisPanel && (
              <div className="cb-juris-panel">
                <p style={{ color: "rgba(255,255,255,.55)", fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".7px", margin: "0 0 10px" }}>Select State / UT</p>
                {["", ...INDIAN_STATES].map(s => (
                  <div key={s || "all"} onClick={() => { setJurisdiction(s); setShowJurisPanel(false); }}
                    style={{ padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontSize: ".8rem", color: jurisdiction === s ? "#e8c96d" : "rgba(255,255,255,.7)", background: jurisdiction === s ? "rgba(201,168,76,.15)" : "transparent", marginBottom: 2 }}>
                    {s || "🇮🇳 All India (Default)"}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="cb-messages">
            {caseContext && history.length === 0 && (
              <div className="cb-context-badge">
                🗂 Case context loaded. You can now ask "What should I prepare for my hearing?" or "Analyze my case."
              </div>
            )}
            {history.length === 0 ? (
              <div className="cb-empty">
                <div className="cb-empty-icon">⚖️</div>
                <h4>Ask your legal question</h4>
                <p>Get instant AI-powered answers about Indian law, rights, and procedures.</p>
                <div className="cb-suggestions">
                  {QUICK_QUESTIONS.map(s => (
                    <div key={s} className="cb-chip" onClick={() => send(s)}>{s}</div>
                  ))}
                </div>
              </div>
            ) : (
              history.map((h, i) => (
                <div key={i}>
                  <div className="cb-msg-row user" style={{ marginBottom: 10 }}>
                    <div className="cb-msg-icon cb-user-icon">👤</div>
                    <div className="cb-bubble cb-user-bubble">{h.q}</div>
                  </div>
                  {h.a !== null ? (
                    <div className="cb-msg-row">
                      <div className="cb-msg-icon cb-bot-icon">⚖️</div>
                      <div>
                        <div className="cb-bubble cb-bot-bubble">{renderMarkdown(h.a)}</div>
                        {h.followups?.length > 0 && (
                          <div className="cb-followups">
                            {h.followups.map((fq, fi) => (
                              <button key={fi} className="cb-followup" onClick={() => send(fq)}>{fq}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="cb-msg-row">
                      <div className="cb-msg-icon cb-bot-icon">⚖️</div>
                      <div className="cb-bubble cb-bot-bubble">
                        <div className="cb-typing"><div className="cb-dot" /><div className="cb-dot" /><div className="cb-dot" /></div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="cb-input-area">
            <div className="cb-input-row">
              <input className="cb-input" placeholder="Ask your legal question..." value={input}
                onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !loading && send()} />
              <button className="cb-send-btn" onClick={() => send()} disabled={loading || !input.trim()}>
                {loading ? <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} /> : "→"}
              </button>
            </div>
            <p className="cb-hint">Enter to send · Load Case for case-aware answers · Save to keep this conversation</p>
          </div>
        </div>
      </div>
    </>
  );
}
