import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import AddCaseModal from "./AddCaseModal";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";

const STATUS_STYLE = {
  pending:  { bg: "#fef3c7", color: "#92400e", label: "⏳ Pending" },
  accepted: { bg: "#dcfce7", color: "#16a34a", label: "✅ Accepted" },
  declined: { bg: "#fee2e2", color: "#dc2626", label: "❌ Declined" },
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
    const q = query(
      collection(db, "consultations"),
      where("lawyerId", "==", user.uid)
    );
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setConsultations(list);
      setLoading(false);
    }, err => {
      console.error(err);
      setLoading(false);
    });
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
      // Initialize legacy reply if needed
      if (!c.messages && c.replyMessage) {
        currentMessages.push({ sender: "lawyer", text: c.replyMessage, timestamp: c.repliedAt || new Date().toISOString() });
      }
      const updatedMessages = [...currentMessages, newMessage];

      await updateDoc(doc(db, "consultations", c.id), {
        status: "accepted",
        messages: updatedMessages,
        replyMessage: reply, // Legacy field for UI Fallbacks
        repliedAt: new Date().toISOString(),
      });

      // Email litigant (only send email if we want to notify them)
      await fetch(`${BACKEND}/send-consultation-reply/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          litigantEmail:   c.litigantEmail,
          litigantName:    c.litigantName,
          lawyerName:      user.displayName || "Your Lawyer",
          replyMessage:    reply,
          originalMessage: c.message,
          preferredDate:   c.preferredDate,
        }),
      });

      setReply("");
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const filtered = filterStatus === "all" ? consultations : consultations.filter(c => c.status === filterStatus);

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}><div className="spinner-border" style={{ color: "#1a2744" }} /></div>;

  return (
    <>
      <style>{`
        .mc-wrap { font-family:'Inter',sans-serif; }
        .mc-toolbar { display:flex; gap:10px; margin-bottom:18px; flex-wrap:wrap; align-items:center; }
        .mc-filter { border:1.5px solid #e5e7eb; border-radius:50px; padding:6px 16px; font-size:.8rem; font-weight:600; cursor:pointer; transition:all .2s; background:white; color:#374151; }
        .mc-filter.active { background:#1a2744; color:white; border-color:#1a2744; }
        .mc-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        @media(max-width:700px){.mc-grid{grid-template-columns:1fr;}}
        .mc-card { background:white; border-radius:16px; border:1.5px solid #e5e7eb; padding:18px 20px; cursor:pointer; transition:all .25s; }
        .mc-card:hover { border-color:#1a2744; box-shadow:0 6px 20px rgba(26,39,68,.1); transform:translateY(-2px); }
        .mc-card.active { border-color:#c9a84c; box-shadow:0 6px 20px rgba(201,168,76,.2); }
        .mc-detail { background:white; border-radius:18px; border:1.5px solid #e5e7eb; padding:24px 26px; }
        .mc-label { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.7px; color:#9ca3af; margin-bottom:2px; }
        .mc-value { font-size:.88rem; color:#1a2744; font-weight:600; margin-bottom:12px; }
        .mc-textarea { width:100%; min-height:100px; border:1.5px solid #e5e7eb; border-radius:12px; padding:11px 14px; font-family:'Inter',sans-serif; font-size:.85rem; outline:none; resize:vertical; box-sizing:border-box; }
        .mc-textarea:focus { border-color:#1a2744; }
        .mc-action-btn { border:none; border-radius:50px; padding:8px 20px; font-size:.8rem; font-weight:700; cursor:pointer; font-family:'Inter',sans-serif; transition:all .2s; }
        .mc-send-btn { background:linear-gradient(135deg,#c9a84c,#e8c96d); color:#1a2744; width:100%; padding:12px; border-radius:50px; border:none; font-weight:800; font-size:.9rem; cursor:pointer; margin-top:10px; font-family:'Inter',sans-serif; }
        .mc-send-btn:disabled { opacity:.6; cursor:not-allowed; }
        .mc-empty { text-align:center; padding:48px 20px; color:#9ca3af; }
      `}</style>

      <div className="mc-wrap">
        <div className="mc-toolbar">
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1rem", fontWeight:700, color:"#1a2744", marginRight:6 }}>📅 Consultations</span>
          {["all","pending","accepted","declined"].map(s => (
            <button key={s} className={`mc-filter ${filterStatus===s?"active":""}`} onClick={() => setFilterStatus(s)}>
              {s === "all" ? `All (${consultations.length})` : STATUS_STYLE[s]?.label + ` (${consultations.filter(c=>c.status===s).length})`}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mc-empty">
            <div style={{ fontSize:"2.5rem", marginBottom:12 }}>📅</div>
            <p style={{ fontWeight:700, color:"#374151", margin:"0 0 4px" }}>No consultations yet</p>
            <p style={{ fontSize:".82rem" }}>Booking requests from clients will appear here.</p>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns: activeSelected ? "1fr 1fr" : "1fr", gap:18 }}>
            {/* List */}
            <div className="mc-grid" style={{ alignContent:"start" }}>
              {filtered.map(c => {
                const st = STATUS_STYLE[c.status] || STATUS_STYLE.pending;
                return (
                  <div key={c.id} className={`mc-card ${activeSelected?.id===c.id?"active":""}`} onClick={() => { setSelectedId(c.id); setReply(""); }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                      <div>
                        <p style={{ fontWeight:700, color:"#1a2744", fontSize:".9rem", margin:0 }}>{c.litigantName}</p>
                        <p style={{ fontSize:".73rem", color:"#6b7280", margin:"2px 0 0" }}>{c.litigantEmail}</p>
                      </div>
                      <span style={{ background:st.bg, color:st.color, borderRadius:50, padding:"2px 10px", fontSize:".68rem", fontWeight:700, flexShrink:0, marginLeft:8 }}>{st.label}</span>
                    </div>
                    <p style={{ fontSize:".8rem", color:"#374151", margin:"0 0 8px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.message}</p>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:".72rem", color:"#c9a84c", fontWeight:700 }}>📅 {c.preferredDate} {c.preferredTime}</span>
                      <span style={{ fontSize:".72rem", color:"#9ca3af" }}>{c.caseType}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detail Panel */}
            {activeSelected && (
              <div className="mc-detail">
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:18 }}>
                  <h4 style={{ fontFamily:"'Playfair Display',serif", color:"#1a2744", margin:0, fontSize:"1rem" }}>Consultation Details</h4>
                  <button onClick={() => setSelectedId(null)} style={{ background:"#f3f4f6", border:"none", borderRadius:50, padding:"4px 12px", fontSize:".75rem", cursor:"pointer", color:"#374151" }}>✕ Close</button>
                </div>

                {[
                  { l:"Client Name", v: activeSelected.litigantName },
                  { l:"Email",       v: activeSelected.litigantEmail },
                  { l:"Phone",       v: activeSelected.litigantPhone || "—" },
                  { l:"Case Type",   v: activeSelected.caseType || "—" },
                  { l:"Preferred Date & Time", v: `${activeSelected.preferredDate} ${activeSelected.preferredTime || ""}` },
                  { l:"Status",      v: STATUS_STYLE[activeSelected.status]?.label || "Pending" },
                ].map(({ l, v }) => (
                  <div key={l}>
                    <p className="mc-label">{l}</p>
                    <p className="mc-value">{v}</p>
                  </div>
                ))}

                <p className="mc-label">Client's Initial Message</p>
                <div style={{ background:"#f8faff", border:"1px solid #e5e7eb", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
                  <p style={{ fontSize:".85rem", color:"#374151", lineHeight:1.6, margin:0 }}>{activeSelected.message}</p>
                </div>

                {/* Chat History */}
                {(activeSelected.messages?.length > 0 || activeSelected.replyMessage) && (
                  <>
                    <p className="mc-label">Conversation</p>
                    <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "20px", height: "300px", overflowY: "auto", marginBottom: 16, display: "flex", flexDirection: "column", gap: 14, boxShadow: "inset 0 2px 10px rgba(0,0,0,0.02)" }}>
                      {/* Show legacy reply if messages array doesn't exist yet */}
                      {!activeSelected.messages && activeSelected.replyMessage && (
                        <div style={{ alignSelf: "flex-end", background: "#1a2744", color: "white", borderRadius: "18px 18px 4px 18px", padding: "12px 16px", maxWidth: "75%", boxShadow: "0 2px 8px rgba(26,39,68,0.15)" }}>
                          <p style={{ fontSize: "0.7rem", color: "#9ca3af", fontWeight: 600, margin: "0 0 4px", letterSpacing: "0.5px" }}>You</p>
                          <p style={{ fontSize: "0.9rem", margin: 0, lineHeight: 1.5 }}>{activeSelected.replyMessage}</p>
                        </div>
                      )}
                      
                      {/* Render real-time messages */}
                      {activeSelected.messages?.map((msg, idx) => {
                        const isLawyer = msg.sender === "lawyer";
                        return (
                          <div key={idx} style={{ 
                            alignSelf: isLawyer ? "flex-end" : "flex-start",
                            background: isLawyer ? "#1a2744" : "#f1f5f9",
                            color: isLawyer ? "white" : "#1e293b",
                            border: isLawyer ? "none" : "1px solid #e2e8f0",
                            borderRadius: isLawyer ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                            padding: "12px 16px", maxWidth: "75%",
                            boxShadow: isLawyer ? "0 2px 8px rgba(26,39,68,0.15)" : "none"
                          }}>
                            <p style={{ fontSize: "0.7rem", color: isLawyer ? "#9ca3af" : "#64748b", fontWeight: 600, margin: "0 0 4px", letterSpacing: "0.5px" }}>{isLawyer ? "You" : activeSelected.litigantName}</p>
                            <p style={{ fontSize: "0.9rem", margin: 0, lineHeight: 1.5 }}>{msg.text}</p>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}

                {/* Quick Actions */}
                {activeSelected.status === "pending" && (
                  <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                    <button className="mc-action-btn" style={{ background:"#dcfce7", color:"#16a34a" }} onClick={() => updateStatus(activeSelected.id, "accepted")}>✅ Accept</button>
                    <button className="mc-action-btn" style={{ background:"#fee2e2", color:"#dc2626" }} onClick={() => updateStatus(activeSelected.id, "declined")}>❌ Decline</button>
                  </div>
                )}
                
                {/* Convert to Case Action */}
                {activeSelected.status === "accepted" && (
                  <div style={{ marginBottom:14 }}>
                    <button className="mc-action-btn" style={{ background:"#e0e7ff", color:"#4338ca", width:"100%" }} onClick={() => setShowAddModal(true)}>
                      ⚖️ Convert to Case
                    </button>
                  </div>
                )}

                {/* Reply */}
                <p className="mc-label">Write a Message</p>
                <textarea className="mc-textarea" rows={3} value={reply} onChange={e => setReply(e.target.value)}
                  placeholder="Type your message here..." />
                <button className="mc-send-btn" onClick={() => sendReply(activeSelected)} disabled={sending || !reply.trim()}>
                  {sending ? "Sending..." : "📨 Send Message"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Render AddCaseModal if Convert to Case is clicked */}
      {showAddModal && activeSelected && (
        <AddCaseModal 
          onClose={() => setShowAddModal(false)}
          initialData={{
            title: `Case for ${activeSelected.litigantName}`,
            clientName: activeSelected.litigantName,
            clientEmail: activeSelected.litigantEmail,
            clientPhone: activeSelected.litigantPhone || "",
            category: activeSelected.caseType || "",
            description: activeSelected.message || "",
          }}
        />
      )}
    </>
  );
}
