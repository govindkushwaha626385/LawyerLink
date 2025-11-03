// src/utils/api.js
const BASE = "http://127.0.0.1:8000";

export async function recommendCases(text, top_k = 5) {
  const res = await fetch(`${BASE}/recommend/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, top_k })
  });
  if (!res.ok) throw new Error("Recommendation failed");
  return res.json();
}

export async function askChatbot(question) {
  const res = await fetch(`${BASE}/ask/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question })
  });
  if (!res.ok) throw new Error("Chatbot error");
  return res.json();
}
