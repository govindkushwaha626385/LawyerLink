import React, { useState } from "react";
import { askChatbot } from "../../utils/api";
import "./Chatbot.css";

export default function Chatbot() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const res = await askChatbot(input);
    const answer = res.answer || "No response from AI.";
    setHistory(prev => [...prev, { q: input, a: answer }]);
    setInput("");
    setLoading(false);
  };

  return (
    <div className="chatbot-container container py-4">
      <div className="chatbot-card shadow-lg p-0">
        <div className="chatbot-header text-center py-3">
          <h4 className="m-0">💬 Legal AI Assistant</h4>
          <p className="text-muted small m-0">Ask legal questions anytime</p>
        </div>

        <div className="chat-window p-3">
          {history.length === 0 && (
            <p className="text-center text-muted mt-4">
              👋 Start by typing your question below.
            </p>
          )}
          {history.map((h, i) => (
            <div key={i} className="chat-message mb-3">
              <div className="user-msg text-end">
                <div className="msg-bubble user-bubble">{h.q}</div>
              </div>
              <div className="bot-msg text-start">
                <div className="msg-bubble bot-bubble">{h.a}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="chat-input p-3 border-top">
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Type your legal question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button
              className="btn btn-primary"
              onClick={send}
              disabled={loading}
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
