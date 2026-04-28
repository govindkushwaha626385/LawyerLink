import React, { useState, useRef, useEffect } from "react";
// import { askChatbot } from "../../utils/api"; // ← old backend call

// ── Groq API config (free, fast — Llama 3.3 70B) ────────────────────
// Get your free key at: https://console.groq.com/keys
const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

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
      "Authorization": `Bearer ${GROQ_API_KEY}`,
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
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return (
    data.choices?.[0]?.message?.content ||
    "⚠️ I couldn't generate a response. Please try again."
  );
}
// ─────────────────────────────────────────────────────────────────────

export default function Chatbot() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Simple Markdown parser for bold text and bullet points
  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      const isBullet = line.trim().startsWith("* ") || line.trim().startsWith("- ");
      const content = isBullet ? line.trim().substring(2) : line;

      // Handle **bold** text
      const parts = content.split(/(\*\*.*?\*\*)/g).map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={j} style={{ color: "#111827", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={i} style={{ display: "flex", gap: "8px", marginTop: "6px", marginLeft: "4px" }}>
            <span style={{ color: "#c9a84c", fontWeight: "bold" }}>•</span>
            <span>{parts}</span>
          </div>
        );
      }
      return <div key={i} style={{ marginTop: i > 0 && content ? "8px" : "0" }}>{parts}</div>;
    });
  };

  const send = async () => {
    if (!input.trim()) return;
    const question = input.trim();
    setHistory(prev => [...prev, { q: question, a: null }]);
    setInput("");
    setLoading(true);
    try {
      const answer = await askAI(question);

      setHistory(prev => prev.map((h, i) => i === prev.length - 1 ? { ...h, a: answer } : h));
    } catch (err) {
      console.error("Groq error:", err.message);
      const userMsg = err.message.includes("invalid_api_key")
        ? "🔑 Invalid API key. Check GROQ_API_KEY in Chatbot.js."
        : err.message.includes("rate_limit")
          ? "⏱️ Rate limit reached. Try again in a few seconds."
          : `⚠️ ${err.message}`;
      setHistory(prev => prev.map((h, i) =>
        i === prev.length - 1 ? { ...h, a: userMsg } : h
      ));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  return (
    <>
      <style>{`
        .cb-wrapper {
          min-height: 100vh;
          background: linear-gradient(-45deg, #0f1d3a, #1a2744, #243460, #1a3a5c);
          background-size: 400% 400%;
          animation: cbGrad 10s ease infinite;
          display: flex; align-items: center; justify-content: center;
          padding: 24px 16px; font-family: 'Inter', sans-serif; position: relative; overflow: hidden;
        }
        @keyframes cbGrad { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .cb-orb1 { position: absolute; width: 400px; height: 400px; border-radius: 50%; background: #c9a84c; filter: blur(120px); opacity: 0.07; top: -100px; right: -100px; animation: orbF 8s ease-in-out infinite; }
        .cb-orb2 { position: absolute; width: 300px; height: 300px; border-radius: 50%; background: #3b82f6; filter: blur(120px); opacity: 0.07; bottom: -80px; left: -100px; animation: orbF 8s 3s ease-in-out infinite; }
        @keyframes orbF { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-30px)} }

        .cb-container {
          width: 100%; max-width: 680px; height: 85vh; max-height: 760px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 28px; display: flex; flex-direction: column;
          overflow: hidden; backdrop-filter: blur(20px);
          box-shadow: 0 32px 80px rgba(0,0,0,0.4);
          position: relative; z-index: 1;
          animation: cbFadeUp 0.5s ease both;
        }
        @keyframes cbFadeUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @media (max-width: 600px) { .cb-container { border-radius: 16px; height: 92vh; } }

        /* Header */
        .cb-header {
          padding: 22px 28px; border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; gap: 14px;
          background: rgba(255,255,255,0.03);
        }
        .cb-avatar {
          width: 44px; height: 44px; border-radius: 14px;
          background: linear-gradient(135deg, #c9a84c, #e8c96d);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.3rem; flex-shrink: 0;
        }
        .cb-header-title { font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 700; color: white; margin: 0; }
        .cb-header-sub { font-size: 0.75rem; color: rgba(255,255,255,0.5); margin: 2px 0 0; }
        .cb-status-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; margin-left: auto; box-shadow: 0 0 8px #22c55e; animation: blink 2s ease-in-out infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }

        /* Messages window */
        .cb-messages {
          flex: 1; overflow-y: auto; padding: 24px 20px; display: flex; flex-direction: column; gap: 16px;
        }
        .cb-messages::-webkit-scrollbar { width: 4px; }
        .cb-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

        /* Empty state */
        .cb-empty {
          flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center; padding: 20px; color: rgba(255,255,255,0.35);
        }
        .cb-empty-icon { font-size: 3rem; margin-bottom: 12px; }
        .cb-empty h4 { font-family: 'Playfair Display', serif; color: rgba(255,255,255,0.55); font-size: 1.1rem; margin-bottom: 8px; }
        .cb-empty p { font-size: 0.82rem; max-width: 280px; line-height: 1.6; }
        .cb-suggestions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 16px; }
        .cb-suggest-chip {
          background: rgba(201,168,76,0.12); border: 1px solid rgba(201,168,76,0.25);
          color: #e8c96d; border-radius: 50px; padding: 6px 14px;
          font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .cb-suggest-chip:hover { background: rgba(201,168,76,0.25); }

        /* Message rows */
        .cb-msg-row { display: flex; gap: 10px; }
        .cb-msg-row.user { flex-direction: row-reverse; }
        .cb-msg-icon { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0; align-self: flex-end; }
        .cb-user-icon { background: linear-gradient(135deg, #1a2744, #243460); }
        .cb-bot-icon { background: linear-gradient(135deg, #c9a84c, #e8c96d); }

        .cb-bubble {
          max-width: 75%; padding: 12px 16px; border-radius: 18px;
          font-size: 0.875rem; line-height: 1.65; word-break: break-word;
          animation: msgIn 0.3s ease both;
        }
        @keyframes msgIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .cb-user-bubble { background: rgba(255,255,255,0.12); color: white; border-bottom-right-radius: 4px; border: 1px solid rgba(255,255,255,0.1); }
        .cb-bot-bubble { background: rgba(255,255,255,0.93); color: #1a2744; border-bottom-left-radius: 4px; box-shadow: 0 4px 14px rgba(0,0,0,0.15); }

        /* Typing indicator */
        .cb-typing { display: flex; gap: 5px; align-items: center; padding: 14px 16px; }
        .cb-dot { width: 7px; height: 7px; background: #9ca3af; border-radius: 50%; animation: dot 1.2s infinite; }
        .cb-dot:nth-child(2) { animation-delay: 0.2s; }
        .cb-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes dot { 0%,80%,100%{transform:scale(0.7);opacity:0.4} 40%{transform:scale(1);opacity:1} }

        /* Input area */
        .cb-input-area { padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); }
        .cb-input-row { display: flex; gap: 10px; align-items: center; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 50px; padding: 8px 8px 8px 18px; }
        .cb-input {
          flex: 1; background: transparent; border: none; outline: none;
          font-family: 'Inter', sans-serif; font-size: 0.875rem; color: white;
        }
        .cb-input::placeholder { color: rgba(255,255,255,0.35); }
        .cb-send-btn {
          width: 38px; height: 38px; border-radius: 50%; border: none;
          background: linear-gradient(135deg, #c9a84c, #e8c96d);
          color: #1a2744; cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 1rem; transition: all 0.2s; font-weight: 700; flex-shrink: 0;
        }
        .cb-send-btn:hover:not(:disabled) { transform: scale(1.1); box-shadow: 0 4px 14px rgba(201,168,76,0.5); }
        .cb-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cb-input-hint { text-align: center; font-size: 0.72rem; color: rgba(255,255,255,0.25); margin-top: 8px; }
      `}</style>

      <div className="cb-wrapper">
        <div className="cb-orb1" /><div className="cb-orb2" />

        <div className="cb-container">
          {/* Header */}
          <div className="cb-header">
            <div className="cb-avatar">🤖</div>
            <div>
              <h4 className="cb-header-title">Legal AI Assistant</h4>
              <p className="cb-header-sub">Powered by Groq AI</p>
            </div>
            <div className="cb-status-dot" title="Online" />
          </div>

          {/* Messages */}
          <div className="cb-messages">
            {history.length === 0 ? (
              <div className="cb-empty">
                <div className="cb-empty-icon">⚖️</div>
                <h4>Ask your legal question</h4>
                <p>Get instant AI-powered answers about Indian law, rights, procedures, and more.</p>
                <div className="cb-suggestions">
                  {["What is FIR?", "Tenant rights in India", "Bail procedure", "How to file a case?"].map(s => (
                    <div key={s} className="cb-suggest-chip" onClick={() => { setInput(s); }}>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              history.map((h, i) => (
                <div key={i}>
                  {/* User message */}
                  <div className="cb-msg-row user" style={{ marginBottom: 12 }}>
                    <div className="cb-msg-icon cb-user-icon">👤</div>
                    <div className="cb-bubble cb-user-bubble">{h.q}</div>
                  </div>
                  {/* Bot message */}
                  {h.a !== null ? (
                    <div className="cb-msg-row">
                      <div className="cb-msg-icon cb-bot-icon">⚖️</div>
                      <div className="cb-bubble cb-bot-bubble">{renderMarkdown(h.a)}</div>
                    </div>
                  ) : (
                    <div className="cb-msg-row">
                      <div className="cb-msg-icon cb-bot-icon">⚖️</div>
                      <div className="cb-bubble cb-bot-bubble">
                        <div className="cb-typing">
                          <div className="cb-dot" /><div className="cb-dot" /><div className="cb-dot" />
                        </div>
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
              <input
                className="cb-input"
                placeholder="Ask your legal question..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !loading && send()}
              />
              <button className="cb-send-btn" onClick={send} disabled={loading || !input.trim()}>
                {loading ? <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} /> : "→"}
              </button>
            </div>
            <p className="cb-input-hint">Press Enter or click → to send</p>
          </div>
        </div>
      </div>
    </>
  );
}
