import React, { useState, useRef, useEffect } from "react";

// ── Groq API config ──────────────────────────────────────────────────
const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;
const GROQ_MODEL   = "llama-3.3-70b-versatile";
const GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are the Principal Legal AI Consultant for LawyerLink, specializing in Indian jurisprudence. Provide precise, objective, and highly structured guidance on Indian law, including the Bharatiya Nyaya Sanhita (BNS), Bharatiya Nagarik Suraksha Sanhita (BNSS), Bharatiya Sakshya Adhiniyam (BSA), court procedures, FIR protocols, and fundamental rights.

OPERATIONAL DIRECTIVES:
• Brevity Protocol: Strictly limit every response to a maximum of 6-7 sentences.
• Structural Hierarchy: Use bullet points to delineate key facts, procedural steps, and specific legal sections.
• Formatting Constraints: Do not generate dense or lengthy paragraphs.
• Professional Tone: Maintain an authoritative, neutral, and precise legal vocabulary.

MANDATORY CLOSING:
"Consult a qualified lawyer for case-specific advice."`;

async function askAI(question) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: question },
      ],
      temperature: 0.3,
      max_tokens: 300,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data.choices?.[0]?.message?.content || "⚠️ Try again.";
}

// ── Markdown renderer ────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return null;
  return text.split("\n").map((line, i) => {
    const isBullet = line.trim().startsWith("* ") || line.trim().startsWith("- ") || line.trim().startsWith("• ");
    const content = isBullet ? line.trim().replace(/^[*\-•]\s/, "") : line;
    const parts = content.split(/(\*\*.*?\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      return part;
    });
    if (isBullet) {
      return (
        <div key={i} style={{ display: "flex", gap: 6, marginTop: 4, marginLeft: 2 }}>
          <span style={{ color: "#c9a84c", fontWeight: 700 }}>•</span>
          <span>{parts}</span>
        </div>
      );
    }
    return <div key={i} style={{ marginTop: i > 0 && content ? 6 : 0 }}>{parts}</div>;
  });
}

// ── Widget ────────────────────────────────────────────────────────────
export default function ChatbotWidget() {
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const endRef                = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history, loading]);

  const send = async () => {
    if (!input.trim()) return;
    const q = input.trim();
    setHistory(prev => [...prev, { q, a: null }]);
    setInput("");
    setLoading(true);
    try {
      const answer = await askAI(q);
      setHistory(prev => prev.map((h, i) => (i === prev.length - 1 ? { ...h, a: answer } : h)));
    } catch (err) {
      setHistory(prev =>
        prev.map((h, i) => (i === prev.length - 1 ? { ...h, a: `⚠️ ${err.message}` } : h))
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        /* ── Floating Action Button ───────────────────────── */
        .cw-fab {
          position: fixed; bottom: 28px; right: 28px; z-index: 9999;
          width: 60px; height: 60px; border-radius: 50%;
          background: linear-gradient(135deg, #1a2744, #243460);
          border: none; cursor: pointer;
          box-shadow: 0 8px 28px rgba(26,39,68,0.45);
          display: flex; align-items: center; justify-content: center;
          transition: all 0.3s ease;
          animation: cwPulse 2.5s ease-in-out infinite;
        }
        .cw-fab:hover { transform: scale(1.12); box-shadow: 0 12px 36px rgba(26,39,68,0.55); }
        @keyframes cwPulse {
          0%,100%{ box-shadow: 0 8px 28px rgba(26,39,68,0.45); }
          50%{ box-shadow: 0 8px 28px rgba(201,168,76,0.4); }
        }
        .cw-fab-icon { font-size: 1.6rem; transition: transform 0.3s; }
        .cw-fab-badge {
          position: absolute; top: -2px; right: -2px;
          width: 16px; height: 16px; border-radius: 50%;
          background: #22c55e; border: 2px solid white;
          animation: cwBlink 2s infinite;
        }
        @keyframes cwBlink { 0%,100%{opacity:1} 50%{opacity:0.5} }

        /* ── Chat Panel ───────────────────────────────────── */
        .cw-panel {
          position: fixed; bottom: 100px; right: 28px; z-index: 9998;
          width: 380px; max-height: 520px;
          background: #fff; border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.25);
          display: flex; flex-direction: column;
          overflow: hidden;
          animation: cwSlideUp 0.35s cubic-bezier(0.16,1,0.3,1) both;
          border: 1px solid rgba(26,39,68,0.08);
        }
        @keyframes cwSlideUp {
          from { opacity:0; transform: translateY(20px) scale(0.95); }
          to   { opacity:1; transform: translateY(0) scale(1); }
        }

        /* ── Header ──────────────────────────────────────── */
        .cw-header {
          background: linear-gradient(135deg, #1a2744, #243460);
          padding: 16px 18px; display: flex; align-items: center; gap: 12px;
          flex-shrink: 0;
        }
        .cw-hdr-avatar {
          width: 38px; height: 38px; border-radius: 12px;
          background: linear-gradient(135deg, #c9a84c, #e8c96d);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem; flex-shrink: 0;
        }
        .cw-hdr-title { font-family: 'Playfair Display',serif; font-size: 0.95rem; font-weight: 700; color: #fff; margin: 0; }
        .cw-hdr-sub   { font-size: 0.68rem; color: rgba(255,255,255,0.5); margin: 2px 0 0; }
        .cw-hdr-dot   { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; margin-left: auto; box-shadow: 0 0 6px #22c55e; }
        .cw-close-btn {
          background: rgba(255,255,255,0.1); border: none; color: rgba(255,255,255,0.6);
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.9rem; cursor: pointer; transition: all 0.2s; margin-left: 8px;
        }
        .cw-close-btn:hover { background: rgba(255,255,255,0.2); color: white; }

        /* ── Messages ─────────────────────────────────────── */
        .cw-messages {
          flex: 1; overflow-y: auto; padding: 16px 14px;
          display: flex; flex-direction: column; gap: 12px;
          background: #f8f9fc;
        }
        .cw-messages::-webkit-scrollbar { width: 3px; }
        .cw-messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }

        .cw-empty { text-align: center; padding: 30px 16px; color: #9ca3af; }
        .cw-empty-icon { font-size: 2.2rem; margin-bottom: 8px; }
        .cw-empty h4 { font-family: 'Playfair Display',serif; color: #374151; font-size: 0.95rem; margin-bottom: 6px; }
        .cw-empty p { font-size: 0.78rem; line-height: 1.5; }
        .cw-chips { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 12px; }
        .cw-chip {
          background: rgba(201,168,76,0.12); border: 1px solid rgba(201,168,76,0.25);
          color: #92400e; border-radius: 50px; padding: 4px 12px;
          font-size: 0.7rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .cw-chip:hover { background: rgba(201,168,76,0.25); }

        .cw-row { display: flex; gap: 8px; animation: cwMsgIn 0.25s ease both; }
        .cw-row.user { flex-direction: row-reverse; }
        @keyframes cwMsgIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

        .cw-icon {
          width: 28px; height: 28px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; flex-shrink: 0; align-self: flex-end;
        }
        .cw-icon-user { background: linear-gradient(135deg, #1a2744, #243460); }
        .cw-icon-bot  { background: linear-gradient(135deg, #c9a84c, #e8c96d); }

        .cw-bubble {
          max-width: 78%; padding: 10px 14px; border-radius: 16px;
          font-family: 'Inter',sans-serif; font-size: 0.82rem; line-height: 1.55;
          word-break: break-word;
        }
        .cw-bubble-user {
          background: #1a2744; color: white;
          border-bottom-right-radius: 4px;
        }
        .cw-bubble-bot {
          background: white; color: #1a2744;
          border-bottom-left-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .cw-typing { display: flex; gap: 4px; align-items: center; padding: 6px 0; }
        .cw-tdot { width: 6px; height: 6px; background: #9ca3af; border-radius: 50%; animation: cwDot 1.2s infinite; }
        .cw-tdot:nth-child(2) { animation-delay: 0.2s; }
        .cw-tdot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes cwDot { 0%,80%,100%{transform:scale(0.7);opacity:0.4} 40%{transform:scale(1);opacity:1} }

        /* ── Input ────────────────────────────────────────── */
        .cw-input-area {
          padding: 12px 14px; border-top: 1px solid #e5e7eb;
          background: white; flex-shrink: 0;
        }
        .cw-input-row {
          display: flex; gap: 8px; align-items: center;
          background: #f3f4f6; border: 1px solid #e5e7eb;
          border-radius: 50px; padding: 6px 6px 6px 16px;
        }
        .cw-input {
          flex: 1; background: transparent; border: none; outline: none;
          font-family: 'Inter',sans-serif; font-size: 0.82rem; color: #1a2744;
        }
        .cw-input::placeholder { color: #9ca3af; }
        .cw-send {
          width: 34px; height: 34px; border-radius: 50%; border: none;
          background: linear-gradient(135deg, #c9a84c, #e8c96d);
          color: #1a2744; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.9rem; font-weight: 700; flex-shrink: 0;
          transition: all 0.2s;
        }
        .cw-send:hover:not(:disabled) { transform: scale(1.08); box-shadow: 0 4px 12px rgba(201,168,76,0.4); }
        .cw-send:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Responsive ───────────────────────────────────── */
        @media (max-width: 480px) {
          .cw-panel {
            right: 0; left: 0; bottom: 0; top: 0;
            width: 100%; max-height: 100%;
            border-radius: 0;
            animation: cwFadeIn 0.25s ease both;
          }
          @keyframes cwFadeIn { from{opacity:0} to{opacity:1} }
          .cw-fab { bottom: 18px; right: 18px; width: 54px; height: 54px; }
          .cw-fab-icon { font-size: 1.4rem; }
        }
      `}</style>

      {/* ── FAB Button ────────────────────────────────── */}
      <button className="cw-fab" onClick={() => setOpen(o => !o)} title="Legal AI Assistant">
        <span className="cw-fab-icon">{open ? "✕" : "⚖️"}</span>
        {!open && <span className="cw-fab-badge" />}
      </button>

      {/* ── Chat Panel ────────────────────────────────── */}
      {open && (
        <div className="cw-panel">
          {/* Header */}
          <div className="cw-header">
            <div className="cw-hdr-avatar">🤖</div>
            <div>
              <h4 className="cw-hdr-title">Legal AI Assistant</h4>
              <p className="cw-hdr-sub">Powered by Groq AI</p>
            </div>
            <div className="cw-hdr-dot" />
            <button className="cw-close-btn" onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Messages */}
          <div className="cw-messages">
            {history.length === 0 ? (
              <div className="cw-empty">
                <div className="cw-empty-icon">⚖️</div>
                <h4>Legal AI Assistant</h4>
                <p>Ask any legal question about Indian law, IPC sections, rights & more.</p>
                <div className="cw-chips">
                  {["What is FIR?", "Bail process", "Tenant rights", "IPC 302"].map(s => (
                    <div key={s} className="cw-chip" onClick={() => setInput(s)}>{s}</div>
                  ))}
                </div>
              </div>
            ) : (
              history.map((h, i) => (
                <div key={i}>
                  <div className="cw-row user" style={{ marginBottom: 8 }}>
                    <div className="cw-icon cw-icon-user">👤</div>
                    <div className="cw-bubble cw-bubble-user">{h.q}</div>
                  </div>
                  {h.a !== null ? (
                    <div className="cw-row">
                      <div className="cw-icon cw-icon-bot">⚖️</div>
                      <div className="cw-bubble cw-bubble-bot">{renderMarkdown(h.a)}</div>
                    </div>
                  ) : (
                    <div className="cw-row">
                      <div className="cw-icon cw-icon-bot">⚖️</div>
                      <div className="cw-bubble cw-bubble-bot">
                        <div className="cw-typing">
                          <div className="cw-tdot" /><div className="cw-tdot" /><div className="cw-tdot" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="cw-input-area">
            <div className="cw-input-row">
              <input
                className="cw-input"
                placeholder="Ask a legal question..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !loading && send()}
              />
              <button className="cw-send" onClick={send} disabled={loading || !input.trim()}>
                {loading ? "…" : "→"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
