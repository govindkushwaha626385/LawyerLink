// src/components/Cases/CaseDetails.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db, auth } from "../../firebase";
import { doc, getDoc, collection, addDoc, query, getDocs, orderBy } from "firebase/firestore";
import { recommendCases, askChatbot } from "../../utils/api";

export default function CaseDetails() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [newUpdate, setNewUpdate] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatAnswer, setChatAnswer] = useState(null);

  useEffect(() => {
    (async () => {
      const d = await getDoc(doc(db, "cases", id));
      if (!d.exists()) return;
      setCaseData({ id: d.id, ...d.data() });

      const q = query(collection(db, `cases/${id}/updates`), orderBy("createdAt", "asc"));
      const snap = await getDocs(q);
      setUpdates(snap.docs.map(s => ({ id: s.id, ...s.data() })));
    })();
  }, [id]);

  const addUpdate = async () => {
    const user = auth.currentUser;
    if (!user) return alert("Login first");
    await addDoc(collection(db, `cases/${id}/updates`), {
      text: newUpdate,
      createdAt: new Date().toISOString(),
      authorId: user.uid
    });
    setNewUpdate("");
    // refresh
    const q = query(collection(db, `cases/${id}/updates`), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    setUpdates(snap.docs.map(s => ({ id: s.id, ...s.data() })));
  };

  const fetchRecommendations = async () => {
    if (!caseData) return;
    const resp = await recommendCases(caseData.description, 5);
    setRecommendations(resp.results || resp.results);
  };

  const askInContext = async () => {
    const prompt = `Case: ${caseData.title}\nDescription: ${caseData.description}\nQuestion: ${chatQuestion}`;
    const res = await askChatbot(prompt);
    setChatAnswer(res.answer || res);
  };

  if (!caseData) return <div className="container mt-4">Loading...</div>;

  return (
    <div className="container mt-4">
      <h3>{caseData.title}</h3>
      <p className="text-muted">Status: {caseData.status}</p>
      <p>{caseData.description}</p>

      <hr />
      <h5>Case Updates</h5>
      <div className="mb-3">
        {updates.map(u => (
          <div key={u.id} className="border rounded p-2 mb-2 bg-white">
            <div className="small text-muted">{u.createdAt}</div>
            <div>{u.text}</div>
          </div>
        ))}
      </div>

      <div className="mb-3">
        <textarea className="form-control mb-2" value={newUpdate} onChange={e=>setNewUpdate(e.target.value)} placeholder="Add update..." />
        <button className="btn btn-primary" onClick={addUpdate}>Post Update</button>
      </div>

      <hr />
      <h5>Recommended Cases</h5>
      <button className="btn btn-outline-secondary mb-2" onClick={fetchRecommendations}>Get Recommendations</button>
      <div className="row g-3">
        {recommendations.map((r, i) => (
          <div className="col-12 col-md-6" key={i}>
            <div className="card p-3">
              <div className="d-flex justify-content-between">
                <strong>{r.Case_ID}</strong>
                <span className="badge bg-success">{r.Score.toFixed(3)}</span>
              </div>
              <div className="mt-2"><b>Summary:</b> {r.Summary}</div>
              <div className="mt-2"><b>Judgment:</b> {r.Judgment}</div>
            </div>
          </div>
        ))}
      </div>

      <hr />
      <h5>AI Chatbot (context-aware)</h5>
      <textarea className="form-control mb-2" value={chatQuestion} onChange={e=>setChatQuestion(e.target.value)} placeholder="Ask about this case..." />
      <button className="btn btn-success mb-3" onClick={askInContext}>Ask Chatbot</button>
      {chatAnswer && <div className="card p-3"><b>Answer:</b><p>{chatAnswer}</p></div>}
    </div>
  );
}
