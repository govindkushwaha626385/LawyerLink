import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import AddCaseModal from "./AddCaseModal";

const STATUS_STYLE = {
  pending:  { bg: "#fef3c7", color: "#92400e",  label: "⏳ Pending"  },
  accepted: { bg: "#dcfce7", color: "#16a34a",  label: "✅ Accepted" },
  declined: { bg: "#fee2e2", color: "#dc2626",  label: "❌ Declined" },
};

export default function MyConsultations() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selectedId, setSelectedId]       = useState(null);
  const [reply, setReply]                 = useState("");
  const [sending, setSending]             = useState(false);
  const [filterStatus, setFilterStatus]   = useState("all");
  const [showAddModal, setShowAddModal]   = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "consultations"), where("lawyerId", "==", user.uid));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setConsultations(list);
      setLoading(false);
    }, err => { console.error(err); setLoading(false); });
    return () => unsub();
  }, [user]);

  const activeSelected = consultations.find(c => c.id === selectedId);

  const updateStatus = async (id, status) => {
    await updateDoc(doc(db, "consultations", id), { status });
  };

  const sendReply = async (c) => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const newMessage = { sender: "lawyer", text: reply, timestamp: new Date().toISOString() };
      const currentMessages = c.messages || [];
      if (!c.messages && c.replyMessage) {
        currentMessages.push({ sender: "lawyer", text: c.replyMessage, timestamp: c.repliedAt || new Date().toISOString() });
      }
      const updatedMessages = [...currentMessages, newMessage];
      await updateDoc(doc(db, "consultations", c.id), {
        status: "accepted",
        messages: updatedMessages,
        replyMessage: reply,
        repliedAt: new Date().toISOString(),
      });
      setReply("");
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const filtered = filterStatus === "all" ? consultations : consultations.filter(c => c.status === filterStatus);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
      <div className="spinner-border" style={{ color: "#1a2744" }} />
    </div>
  );

  return (
    <>
      <style>{`
        .mc-wrap { font-family: 'Inter', sans-serif; }

        /* Filter toolbar */
        .mc-toolbar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
        .mc-filter {
          border: 1.5px solid #e5e7eb; border-radius: 50px; padding: 6px 16px;
          font-size: .78rem; font-weight: 600; cursor: pointer; transition: all .2s;
          background: white; color: #6b7280; font-family: 'Inter', sans-serif;
        }
        .mc-filter:hover { border-color: #1a2744; color: #1a2744; }
        .mc-filter.active { background: #1a2744; color: white; border-color: #1a2744; box-shadow: 0 3px 10px rgba(26,39,68,.2); }

        /* Two-pane responsive layout */
        .mc-layout { display: grid; grid-template-columns: 320px 1fr; gap: 18px; align-items: start; }
        @media (max-width: 860px) { .mc-layout { grid-template-columns: 1fr; } }

        /* List panel */
        .mc-list { display: flex; flex-direction: column; gap: 10px; }
        .mc-card {
          background: white; border-radius: 16px; border: 1.5px solid #e5e7eb;
          padding: 16px 18px; cursor: pointer; transition: all .25s;
        }
        .mc-card:hover { border-color: #c7d2fe; box-shadow: 0 6px 20px rgba(26,39,68,.09); transform: translateY(-2px); }
        .mc-card.mc-card-active { border-color: #c9a84c; box-shadow: 0 6px 24px rgba(201,168,76,.2); background: #fffdf5; }
        .mc-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
        .mc-card-name { font-weight: 700; color: #1a2744; font-size: .9rem; margin: 0; }
        .mc-card-email { font-size: .72rem; color: #9ca3af; margin: 2px 0 0; }
        .mc-card-msg { font-size: .8rem; color: #6b7280; margin: 0 0 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mc-card-footer { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
        .mc-card-date { font-size: .72rem; color: #c9a84c; font-weight: 700; }
        .mc-card-type { font-size: .7rem; color: #9ca3af; background: #f3f4f6; padding: 2px 8px; border-radius: 50px; white-space: nowrap; }
        .mc-status-pill { border-radius: 50px; padding: 3px 10px; font-size: .67rem; font-weight: 700; flex-shrink: 0; white-space: nowrap; }

        /* Detail panel */
        .mc-detail { background: white; border-radius: 20px; border: 1.5px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 24px rgba(26,39,68,.07); display: flex; flex-direction: column; }
        .mc-detail-hd { background: linear-gradient(135deg, #1a2744, #243460); padding: 20px 24px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .mc-detail-hd-name { font-family: 'Playfair Display', serif; font-size: 1.05rem; font-weight: 700; color: white; margin: 0 0 3px; }
        .mc-detail-hd-sub { font-size: .75rem; color: rgba(255,255,255,.55); margin: 0; }
        .mc-detail-close { background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2); border-radius: 50px; padding: 4px 14px; font-size: .75rem; font-weight: 600; color: rgba(255,255,255,.8); cursor: pointer; flex-shrink: 0; font-family: 'Inter', sans-serif; transition: all .2s; }
        .mc-detail-close:hover { background: rgba(255,255,255,.22); }

        .mc-detail-body { padding: 22px 24px; display: flex; flex-direction: column; }
        .mc-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin-bottom: 18px; }
        @media (max-width: 560px) { .mc-info-grid { grid-template-columns: 1fr; } }
        .mc-lbl { font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .7px; color: #9ca3af; margin: 0 0 2px; }
        .mc-val { font-size: .87rem; color: #1a2744; font-weight: 600; margin: 0 0 12px; }

        /* Client message highlight */
        .mc-msg-box { background: #f8faff; border: 1px solid #e5e7eb; border-left: 3px solid #c9a84c; border-radius: 12px; padding: 12px 16px; margin-bottom: 18px; }
        .mc-msg-box p { font-size: .85rem; color: #374151; line-height: 1.65; margin: 0; }

        /* Action buttons */
        .mc-actions { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
        .mc-action-btn { border: none; border-radius: 50px; padding: 9px 20px; font-size: .8rem; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; transition: all .2s; display: flex; align-items: center; gap: 6px; }
        .mc-action-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.1); }
        .mc-action-accept { background: #dcfce7; color: #16a34a; }
        .mc-action-decline { background: #fee2e2; color: #dc2626; }
        .mc-action-case { background: #e0e7ff; color: #4338ca; width: 100%; justify-content: center; }

        /* Chat bubble area */
        .mc-chat { border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; background: #fafbff; margin-bottom: 14px; }
        .mc-chat::-webkit-scrollbar { width: 3px; }
        .mc-chat::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 2px; }
        .mc-bubble { max-width: 78%; padding: 10px 14px; border-radius: 18px; font-size: .84rem; line-height: 1.55; }
        .mc-bubble-lawyer { align-self: flex-end; background: #1a2744; color: white; border-radius: 18px 18px 4px 18px; box-shadow: 0 2px 8px rgba(26,39,68,.18); }
        .mc-bubble-client { align-self: flex-start; background: white; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 18px 18px 18px 4px; }
        .mc-bubble-sender { font-size: .68rem; font-weight: 700; opacity: .6; margin: 0 0 3px; }
        .mc-bubble-text { margin: 0; }

        /* Reply area */
        .mc-reply-section { border-top: 1px solid #f3f4f6; padding-top: 16px; }
        .mc-textarea { width: 100%; min-height: 80px; border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 10px 14px; font-family: 'Inter', sans-serif; font-size: .85rem; outline: none; resize: vertical; box-sizing: border-box; transition: border .2s; }
        .mc-textarea:focus { border-color: #1a2744; box-shadow: 0 0 0 3px rgba(26,39,68,.06); }
        .mc-send-btn { width: 100%; background: linear-gradient(135deg, #c9a84c, #e8c96d); color: #1a2744; border: none; border-radius: 50px; padding: 12px; font-weight: 800; font-size: .9rem; cursor: pointer; font-family: 'Inter', sans-serif; margin-top: 10px; transition: all .25s; box-shadow: 0 4px 14px rgba(201,168,76,.3); }
        .mc-send-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(201,168,76,.4); }
        .mc-send-btn:disabled { opacity: .6; cursor: not-allowed; }

        /* Empty / placeholder */
        .mc-empty { text-align: center; padding: 48px 20px; color: #9ca3af; }
        .mc-empty h4 { font-family: 'Playfair Display', serif; color: #374151; margin-bottom: 6px; }
        .mc-empty p { font-size: .83rem; margin: 0; }
        .mc-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; background: white; border-radius: 20px; border: 1.5px dashed #e5e7eb; padding: 56px 24px; text-align: center; color: #9ca3af; }
      `}</style>

      <div className="mc-wrap">
        {/* ── Filter toolbar ── */}
        <div className="mc-toolbar">
          {["all", "pending", "accepted", "declined"].map(s => (
            <button
              key={s}
              className={`mc-filter ${filterStatus === s ? "active" : ""}`}
              onClick={() => setFilterStatus(s)}
            >
              {s === "all"
                ? `All (${consultations.length})`
                : `${STATUS_STYLE[s]?.label} (${consultations.filter(c => c.status === s).length})`}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mc-empty">
            <div style={{ fontSize: "2.5rem", marginBottom: 14 }}>📅</div>
            <h4>No {filterStatus !== "all" ? `"${filterStatus}"` : ""} consultations yet</h4>
            <p>Booking requests from clients will appear here.</p>
          </div>
        ) : (
          <div className="mc-layout">
            {/* ── List of Consultations ── */}
            <div className="mc-list">
              {filtered.map(c => {
                const st = STATUS_STYLE[c.status] || STATUS_STYLE.pending;
                return (
                  <div
                    key={c.id}
                    className={`mc-card ${activeSelected?.id === c.id ? "mc-card-active" : ""}`}
                    onClick={() => { setSelectedId(c.id); setReply(""); }}
                  >
                    <div className="mc-card-top">
                      <div>
                        <p className="mc-card-name">{c.litigantName}</p>
                        <p className="mc-card-email">{c.litigantEmail}</p>
                      </div>
                      <span className="mc-status-pill" style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                    <p className="mc-card-msg">{c.message}</p>
                    <div className="mc-card-footer">
                      <span className="mc-card-date">📅 {c.preferredDate} {c.preferredTime}</span>
                      {c.caseType && <span className="mc-card-type">{c.caseType}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Detail Panel ── */}
            {activeSelected ? (
              <div className="mc-detail">
                <div className="mc-detail-hd">
                  <div>
                    <p className="mc-detail-hd-name">{activeSelected.litigantName}</p>
                    <p className="mc-detail-hd-sub">
                      {activeSelected.caseType || "Legal Consultation"} · {STATUS_STYLE[activeSelected.status]?.label || "Pending"}
                    </p>
                  </div>
                  <button className="mc-detail-close" onClick={() => setSelectedId(null)}>✕ Close</button>
                </div>

                <div className="mc-detail-body">
                  {/* Info grid */}
                  <div className="mc-info-grid">
                    {[
                      { l: "Email",          v: activeSelected.litigantEmail },
                      { l: "Phone",          v: activeSelected.litigantPhone || "—" },
                      { l: "Preferred Date", v: activeSelected.preferredDate  || "—" },
                      { l: "Preferred Time", v: activeSelected.preferredTime  || "—" },
                    ].map(({ l, v }) => (
                      <div key={l}>
                        <p className="mc-lbl">{l}</p>
                        <p className="mc-val">{v}</p>
                      </div>
                    ))}
                  </div>

                  {/* Client's initial message */}
                  <p className="mc-lbl">Client's Message</p>
                  <div className="mc-msg-box"><p>{activeSelected.message}</p></div>

                  {/* Quick action buttons */}
                  {activeSelected.status === "pending" && (
                    <div className="mc-actions">
                      <button className="mc-action-btn mc-action-accept" onClick={() => updateStatus(activeSelected.id, "accepted")}>✅ Accept</button>
                      <button className="mc-action-btn mc-action-decline" onClick={() => updateStatus(activeSelected.id, "declined")}>❌ Decline</button>
                    </div>
                  )}
                  {activeSelected.status === "accepted" && (
                    <div className="mc-actions">
                      <button className="mc-action-btn mc-action-case" onClick={() => setShowAddModal(true)}>⚖️ Convert to Case</button>
                    </div>
                  )}

                  {/* Chat History */}
                  {(activeSelected.messages?.length > 0 || activeSelected.replyMessage) && (
                    <>
                      <p className="mc-lbl" style={{ marginBottom: 8 }}>Conversation</p>
                      <div className="mc-chat">
                        {!activeSelected.messages && activeSelected.replyMessage && (
                          <div className="mc-bubble mc-bubble-lawyer">
                            <p className="mc-bubble-sender">You</p>
                            <p className="mc-bubble-text">{activeSelected.replyMessage}</p>
                          </div>
                        )}
                        {activeSelected.messages?.map((msg, idx) => {
                          const isLawyer = msg.sender === "lawyer";
                          return (
                            <div key={idx} className={`mc-bubble ${isLawyer ? "mc-bubble-lawyer" : "mc-bubble-client"}`}>
                              <p className="mc-bubble-sender">{isLawyer ? "You" : activeSelected.litigantName}</p>
                              <p className="mc-bubble-text">{msg.text}</p>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Reply box */}
                  <div className="mc-reply-section">
                    <p className="mc-lbl" style={{ marginBottom: 6 }}>Write a Message</p>
                    <textarea
                      className="mc-textarea"
                      rows={3}
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      placeholder="Type your reply here..."
                    />
                    <button
                      className="mc-send-btn"
                      onClick={() => sendReply(activeSelected)}
                      disabled={sending || !reply.trim()}
                    >
                      {sending ? "Sending..." : "📨 Send Message"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mc-placeholder">
                <div style={{ fontSize: "2.5rem", marginBottom: 14 }}>👈</div>
                <p style={{ fontWeight: 700, color: "#374151", margin: "0 0 4px" }}>Select a consultation</p>
                <p style={{ fontSize: ".8rem" }}>Click any card on the left to view full details.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && activeSelected && (
        <AddCaseModal
          onClose={() => setShowAddModal(false)}
          initialData={{
            title:       `Case for ${activeSelected.litigantName}`,
            clientName:  activeSelected.litigantName,
            clientEmail: activeSelected.litigantEmail,
            clientPhone: activeSelected.litigantPhone || "",
            category:    activeSelected.caseType || "",
            description: activeSelected.message || "",
          }}
        />
      )}
    </>
  );
}
