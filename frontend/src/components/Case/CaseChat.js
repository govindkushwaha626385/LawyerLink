// src/components/Case/CaseChat.js
import React, { useEffect, useState, useRef } from "react";
import {
  collection, addDoc, query, onSnapshot,
  serverTimestamp, doc, getDoc
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { createNotification } from "../../utils/notifications";

export default function CaseChat({ caseId, caseData }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [caseInfo, setCaseInfo] = useState(caseData || null);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const endRef = useRef(null);

  // ✅ Fix 1: Listen for auth state instead of using auth.currentUser directly
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setCurrentUser(u));
    return () => unsub();
  }, []);

  // ✅ Fix 2: Fetch case info if not provided as prop
  useEffect(() => {
    if (!caseId || caseInfo) return;
    const fetchCase = async () => {
      const snap = await getDoc(doc(db, "cases", caseId));
      if (snap.exists()) setCaseInfo({ id: snap.id, ...snap.data() });
    };
    fetchCase();
  }, [caseId, caseInfo]);

  // ✅ Fix 3: Use onSnapshot WITHOUT orderBy to avoid null-timestamp errors on new messages
  // Sort client-side instead — much more reliable
  useEffect(() => {
    if (!caseId) return;

    // Query WITHOUT ordering — avoids Firestore index errors and null-timestamp issues
    const q = query(collection(db, "messages", caseId, "chats"));
    const unsub = onSnapshot(q,
      (snap) => {
        const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort client-side: null timestamps (optimistic) go to end
        msgs.sort((a, b) => {
          const ta = a.timestamp?.seconds ?? Infinity;
          const tb = b.timestamp?.seconds ?? Infinity;
          return ta - tb;
        });
        setMessages(msgs);
      },
      (err) => {
        console.error("Chat listener error:", err);
      }
    );
    return () => unsub();
  }, [caseId]);

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !currentUser) return;
    setSending(true);
    const text = input.trim();
    setInput(""); // clear immediately for UX
    try {
      const senderName =
        currentUser.displayName ||
        currentUser.email?.split("@")[0] ||
        "User";

      await addDoc(collection(db, "messages", caseId, "chats"), {
        senderId: currentUser.uid,
        senderEmail: currentUser.email,
        senderName,
        text,
        timestamp: serverTimestamp(),
      });

      // Notify the OTHER party
      if (caseInfo) {
        const isLawyer = currentUser.uid === caseInfo.lawyerId;
        const recipientId = isLawyer ? caseInfo.litigantId : caseInfo.lawyerId;
        if (recipientId) {
          await createNotification(
            recipientId,
            `💬 New message from ${senderName}`,
            text.length > 60 ? text.slice(0, 57) + "..." : text,
            "message",
            caseId
          );
        }
      }
    } catch (err) {
      console.error("Send error:", err);
      alert("Failed to send message. Try again.");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts) => {
    if (!ts?.toDate) return "";
    try {
      return ts.toDate().toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const formatDate = (ts) => {
    if (!ts?.toDate) return null;
    try {
      return ts.toDate().toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      });
    } catch {
      return null;
    }
  };

  // Group messages by day for date separators
  const grouped = [];
  let lastDate = null;
  messages.forEach((msg) => {
    const d = formatDate(msg.timestamp);
    if (d && d !== lastDate) {
      grouped.push({ type: "date", label: d, id: `date-${d}` });
      lastDate = d;
    }
    grouped.push({ type: "msg", ...msg });
  });

  return (
    <>
      <style>{`
        .chat-wrap {
          display: flex; flex-direction: column;
          height: 500px; min-height: 380px;
          background: #f8faff; border-radius: 18px;
          overflow: hidden; border: 1px solid #e8eeff;
          box-shadow: 0 4px 20px rgba(26,39,68,0.07);
        }
        .chat-header {
          padding: 12px 18px; background: white;
          border-bottom: 1px solid #eef2ff;
          display: flex; align-items: center; gap: 10px;
        }
        .chat-header-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #16a34a; box-shadow: 0 0 0 2px #d1fae5;
          animation: chatPulse 2s infinite;
        }
        @keyframes chatPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .chat-header-title {
          font-family: 'Inter', sans-serif; font-size: 0.82rem;
          font-weight: 700; color: #1a2744; margin: 0;
        }

        .chat-msgs {
          flex: 1; overflow-y: auto;
          padding: 16px 14px;
          display: flex; flex-direction: column; gap: 8px;
        }
        .chat-msgs::-webkit-scrollbar { width: 4px; }
        .chat-msgs::-webkit-scrollbar-thumb { background: #dde3f5; border-radius: 2px; }

        .chat-date-sep {
          display: flex; align-items: center; gap: 10px;
          margin: 6px 0;
        }
        .chat-date-sep::before, .chat-date-sep::after {
          content: ''; flex: 1; height: 1px; background: #eef2ff;
        }
        .chat-date-label {
          font-size: 0.68rem; font-weight: 700;
          color: #9ca3af; text-transform: uppercase;
          letter-spacing: 0.5px; white-space: nowrap;
          font-family: 'Inter', sans-serif;
        }

        .chat-empty {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          color: #9ca3af; text-align: center;
        }
        .chat-empty-icon { font-size: 2.8rem; margin-bottom: 10px; }
        .chat-empty-text { font-size: 0.85rem; line-height: 1.6; margin: 0; font-family: 'Inter', sans-serif; }

        .chat-row { display: flex; gap: 8px; align-items: flex-end; }
        .chat-row.mine { flex-direction: row-reverse; }

        .chat-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.72rem; font-weight: 800;
          flex-shrink: 0; text-transform: uppercase;
        }
        .chat-avatar-them { background: #eef2ff; color: #4338ca; }
        .chat-avatar-me {
          background: linear-gradient(135deg, #1a2744, #243460);
          color: white;
        }

        .chat-col { display: flex; flex-direction: column; max-width: 72%; }

        .chat-sender-name {
          font-size: 0.68rem; font-weight: 700;
          color: #6b7280; margin-bottom: 2px;
          font-family: 'Inter', sans-serif;
        }

        .chat-bubble {
          padding: 10px 14px; border-radius: 18px;
          font-size: 0.87rem; line-height: 1.55;
          word-break: break-word;
          font-family: 'Inter', sans-serif;
        }
        .chat-bubble-them {
          background: white; color: #1f2937;
          border-bottom-left-radius: 4px;
          box-shadow: 0 2px 8px rgba(26,39,68,0.07);
          border: 1px solid #eef2ff;
        }
        .chat-bubble-me {
          background: linear-gradient(135deg, #1a2744, #2d3f6b);
          color: white; border-bottom-right-radius: 4px;
        }

        .chat-meta {
          display: flex; align-items: center; gap: 4px;
          margin-top: 3px;
          font-size: 0.63rem; color: #9ca3af;
          font-family: 'Inter', sans-serif;
        }
        .chat-meta.mine { justify-content: flex-end; }

        .chat-input-row {
          padding: 12px 14px; border-top: 1px solid #eef2ff;
          background: white; display: flex; gap: 8px; align-items: center;
        }
        .chat-input {
          flex: 1; border: 1.5px solid #e5e7eb; border-radius: 50px;
          padding: 10px 18px; font-family: 'Inter', sans-serif;
          font-size: 0.875rem; color: #1a2744; outline: none;
          transition: all 0.25s; background: #fafafa;
        }
        .chat-input:focus {
          border-color: #1a2744; background: white;
          box-shadow: 0 0 0 3px rgba(26,39,68,0.07);
        }
        .chat-input::placeholder { color: #b0b7c3; }

        .chat-send-btn {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, #1a2744, #243460);
          color: white; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.05rem; transition: all 0.2s; flex-shrink: 0;
        }
        .chat-send-btn:hover:not(:disabled) {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(26,39,68,0.35);
        }
        .chat-send-btn:disabled { opacity: 0.45; cursor: not-allowed; }
      `}</style>

      <div className="chat-wrap">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-dot" />
          <p className="chat-header-title">Live Case Conversation</p>
        </div>

        {/* Messages */}
        <div className="chat-msgs">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <div className="chat-empty-icon">💬</div>
              <p className="chat-empty-text">
                No messages yet.<br />Start the conversation!
              </p>
            </div>
          ) : (
            grouped.map((item) => {
              if (item.type === "date") {
                return (
                  <div key={item.id} className="chat-date-sep">
                    <span className="chat-date-label">{item.label}</span>
                  </div>
                );
              }

              const isMe = item.senderId === currentUser?.uid;
              const initial = (item.senderName || item.senderEmail || "?")
                .charAt(0).toUpperCase();

              return (
                <div key={item.id} className={`chat-row ${isMe ? "mine" : ""}`}>
                  <div className={`chat-avatar ${isMe ? "chat-avatar-me" : "chat-avatar-them"}`}>
                    {initial}
                  </div>
                  <div className="chat-col">
                    {!isMe && (
                      <span className="chat-sender-name">{item.senderName || item.senderEmail}</span>
                    )}
                    <div className={`chat-bubble ${isMe ? "chat-bubble-me" : "chat-bubble-them"}`}>
                      {item.text}
                    </div>
                    <div className={`chat-meta ${isMe ? "mine" : ""}`}>
                      {formatTime(item.timestamp)}
                      {isMe && <span>✓✓</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="chat-input-row">
          <input
            className="chat-input"
            placeholder="Type a message and press Enter..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey && !sending) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={!currentUser}
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={sending || !input.trim() || !currentUser}
            title="Send message"
          >
            {sending ? "⌛" : "➤"}
          </button>
        </div>
      </div>
    </>
  );
}
