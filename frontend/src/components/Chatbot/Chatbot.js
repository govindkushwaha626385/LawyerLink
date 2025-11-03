// src/components/Chatbot/Chatbot.js
import React, { useState } from "react";
import { askChatbot } from "../../utils/api";

export default function Chatbot() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);

  const send = async () => {
    if (!input) return;
    const res = await askChatbot(input);
    const answer = res.answer || "No answer";
    setHistory(prev => [...prev, { q: input, a: answer }]);
    setInput("");
  };

  return (
    <div className="container mt-4">
      <h3>AI Chatbot</h3>
      <div className="chat-window mb-3">
        {history.map((h, i) => (
          <div key={i} className="mb-2">
            <div><strong>You:</strong> {h.q}</div>
            <div className="text-muted"><strong>Bot:</strong> {h.a}</div>
            <hr />
          </div>
        ))}
      </div>
      <div className="d-flex">
        <input className="form-control me-2" value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask legal question..." />
        <button className="btn btn-primary" onClick={send}>Send</button>
      </div>
    </div>
  );
}
