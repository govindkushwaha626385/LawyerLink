// src/utils/api.js
const BASE_URL = "http://127.0.0.1:8000"; // ✅ your FastAPI backend URL

// --- AI Chatbot API ---
export async function askChatbot(question) {
  try {
    const res = await fetch(`${BASE_URL}/ask/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    return await res.json();
  } catch (error) {
    console.error("Chatbot API Error:", error);
    return { answer: "Sorry, the chatbot is unavailable right now." };
  }
}

// --- Case Recommendation API ---
export async function recommendCases(text, top_k = 5) {
  try {
    const res = await fetch(`${BASE_URL}/recommend/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, top_k }),
    });
    return await res.json();
  } catch (error) {
    console.error("Recommendation API Error:", error);
    return { results: [] };
  }
}
