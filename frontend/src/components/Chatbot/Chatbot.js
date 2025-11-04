import React, { useState, useRef, useEffect } from "react";
import { askChatbot } from "../../utils/api";
import "./Chatbot.css";

export default function Chatbot() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const send = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const res = await askChatbot(input);
    const answer = res.answer || "⚠️ Sorry, I couldn’t process that.";
    setHistory((prev) => [...prev, { q: input, a: answer }]);
    setInput("");
    setLoading(false);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  return (
    <div className="chatbot-wrapper d-flex align-items-center justify-content-center py-5 px-3">
      <div className="chatbot-card shadow-lg">
        <div className="chatbot-header text-center p-3">
          <h4 className="fw-bold text-primary mb-1">💬 Legal AI Assistant</h4>
          <p className="text-muted small mb-0">
            Ask your legal questions — get instant AI insights.
          </p>
        </div>

        <div className="chat-window p-3">
          {history.length === 0 && (
            <div className="text-center text-muted mt-5">
              <img
                src="https://cdn-icons-png.flaticon.com/512/4712/4712103.png"
                alt="Chatbot Illustration"
                width="100"
                className="mb-3"
              />
              <p>👋 Start by asking your first question below.</p>
            </div>
          )}

          {history.map((h, i) => (
            <div key={i} className="chat-message mb-3">
              <div className="user-msg text-end">
                <div className="msg-bubble user-bubble shadow-sm">
                  {h.q}
                </div>
              </div>
              <div className="bot-msg text-start mt-2">
                <div className="msg-bubble bot-bubble shadow-sm">
                  {h.a}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef}></div>
        </div>

        <div className="chat-input p-3 border-top bg-light">
          <div className="input-group">
            <input
              type="text"
              className="form-control rounded-start-pill"
              placeholder="Type your question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button
              className="btn btn-primary rounded-end-pill px-4"
              onClick={send}
              disabled={loading}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm"></span>
              ) : (
                "Send"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
