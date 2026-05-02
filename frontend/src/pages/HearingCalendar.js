// src/pages/HearingCalendar.js
import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";

const DAYS     = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_MOB = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const STATUS_COLORS = {
  Open:        { dot: "#16a34a", bg: "#dcfce7", text: "#065f46", border: "#bbf7d0" },
  "In Progress":{ dot: "#d97706", bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  Closed:      { dot: "#dc2626", bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
};

export default function HearingCalendar() {
  const [cases, setCases]         = useState([]);
  const [notes, setNotes]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [current, setCurrent]     = useState(new Date());
  const [selected, setSelected]   = useState(null); // selected date string "YYYY-MM-DD"
  const [userRole, setUserRole]   = useState(null);
  
  // Note form state
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteCaseId, setNoteCaseId] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const fetchCasesAndNotes = async () => {
      try {
        // Try lawyer first, then litigant
        const lSnap = await getDocs(query(collection(db, "cases"), where("lawyerId",   "==", user.uid)));
        const cSnap = await getDocs(query(collection(db, "cases"), where("litigantId", "==", user.uid)));
        const all = [
          ...lSnap.docs.map(d => ({ id: d.id, ...d.data(), _myRole: "lawyer" })),
          ...cSnap.docs.map(d => ({ id: d.id, ...d.data(), _myRole: "litigant" })),
        ];
        // deduplicate by id
        const unique = [...new Map(all.map(c => [c.id, c])).values()];
        setCases(unique.filter(c => c.next_hearing_date));
        if (lSnap.docs.length > 0) setUserRole("lawyer");
        else if (cSnap.docs.length > 0) setUserRole("litigant");

        // Fetch calendar notes
        const nSnap = await getDocs(query(collection(db, "calendar_notes"), where("userId", "==", user.uid)));
        setNotes(nSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchCasesAndNotes();
  }, [user]);

  // Build date → cases map
  const hearingMap = useMemo(() => {
    const map = {};
    cases.forEach(c => {
      const date = c.next_hearing_date;
      if (!date) return;
      if (!map[date]) map[date] = [];
      map[date].push(c);
    });
    return map;
  }, [cases]);

  const year  = current.getFullYear();
  const month = current.getMonth();

  const firstDay  = new Date(year, month, 1).getDay();
  const daysCount = new Date(year, month + 1, 0).getDate();

  const todayStr = new Date().toISOString().split("T")[0];

  const pad = (n) => String(n).padStart(2, "0");
  const dateStr = (d) => `${year}-${pad(month + 1)}-${pad(d)}`;

  const selectedCases = selected ? (hearingMap[selected] || []) : [];
  
  const notesMap = useMemo(() => {
    const map = {};
    notes.forEach(n => {
      if (!n.date) return;
      if (!map[n.date]) map[n.date] = [];
      map[n.date].push(n);
    });
    return map;
  }, [notes]);

  const selectedNotes = selected ? (notesMap[selected] || []) : [];

  const handleSaveNote = async () => {
    if (!noteTitle.trim() || !noteText.trim()) return;
    setSavingNote(true);
    try {
      const newNote = {
        userId: user.uid,
        date: selected,
        title: noteTitle,
        caseId: noteCaseId,
        text: noteText,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, "calendar_notes"), newNote);
      setNotes([...notes, { id: docRef.id, ...newNote }]);
      setShowNoteForm(false);
      setNoteTitle("");
      setNoteText("");
      setNoteCaseId("");
    } catch (e) {
      alert("Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  // Upcoming hearings list (next 30 days)
  const upcoming = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const in30  = new Date(today); in30.setDate(in30.getDate() + 30);
    return cases
      .filter(c => { const d = new Date(c.next_hearing_date); return d >= today && d <= in30; })
      .sort((a, b) => new Date(a.next_hearing_date) - new Date(b.next_hearing_date));
  }, [cases]);

  const goCase = (id) => {
    navigate(userRole === "litigant" ? `/litigant/case/${id}` : `/case/${id}`);
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh" }}>
      <div className="spinner-border" style={{ color: "#1a2744" }} />
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;700;800&display=swap');
        .hc-page { min-height:100vh; background:linear-gradient(135deg,#f0f4ff,#f8f9fc 50%,#fdf8ee); padding:32px 20px 60px; font-family:'Inter',sans-serif; }
        .hc-grid { display:grid; grid-template-columns:1fr 340px; gap:24px; align-items:start; }
        @media(max-width:900px){ .hc-grid{grid-template-columns:1fr;} }
        .hc-card { background:white; border-radius:20px; box-shadow:0 4px 24px rgba(26,39,68,0.08); border:1px solid rgba(26,39,68,0.04); overflow:hidden; }
        .hc-cal-header { background:linear-gradient(135deg,#1a2744,#243460); padding:22px 28px; display:flex; align-items:center; justify-content:space-between; }
        .hc-nav-btn { background:rgba(255,255,255,0.12); border:1.5px solid rgba(255,255,255,0.2); border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:white; font-size:1rem; transition:all .2s; }
        .hc-nav-btn:hover { background:rgba(255,255,255,0.25); }
        .hc-days-row { display:grid; grid-template-columns:repeat(7,1fr); background:#f8faff; border-bottom:1px solid #e5e7eb; }
        .hc-day-label { text-align:center; padding:10px 0; font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:#9ca3af; }
        .hc-day-label .hc-day-full { display:inline; }
        .hc-day-label .hc-day-short { display:none; }
        .hc-cal-body { display:grid; grid-template-columns:repeat(7,1fr); }
        .hc-cell { min-height:80px; padding:8px 6px 4px; border-right:1px solid #f3f4f6; border-bottom:1px solid #f3f4f6; cursor:pointer; transition:background .15s; position:relative; overflow:hidden; }
        .hc-cell:hover { background:#f8faff; }
        .hc-cell.today { background:#eef2ff; }
        .hc-cell.selected { background:#f0f4ff; box-shadow:inset 0 0 0 2px #1a2744; }
        .hc-cell.empty { background:#fafafa; cursor:default; }
        .hc-date-num { font-size:.82rem; font-weight:700; color:#374151; margin-bottom:4px; display:inline-block; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
        .hc-cell.today .hc-date-num { background:#1a2744; color:white; }
        .hc-event-dot { font-size:.65rem; border-radius:4px; padding:1px 4px; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:600; display:block; }
        .hc-event-label { display:block; }
        .hc-event-circle { display:none; }
        .hc-upcoming-item { padding:12px 0; border-bottom:1px solid #f3f4f6; cursor:pointer; transition:all .2s; }
        .hc-upcoming-item:hover { background:#f8faff; margin:0 -16px; padding:12px 16px; border-radius:10px; border-color:transparent; }
        .hc-upcoming-item:last-child { border-bottom:none; }
        .hc-badge { display:inline-block; border-radius:50px; padding:3px 10px; font-size:.68rem; font-weight:700; }
        .hc-selected-panel { padding:20px 24px; }
        .hc-case-card { background:#f8faff; border:1px solid #e5e7eb; border-left:4px solid #c9a84c; border-radius:12px; padding:14px 16px; margin-bottom:10px; cursor:pointer; transition:all .2s; }
        .hc-case-card:hover { transform:translateY(-2px); box-shadow:0 6px 18px rgba(26,39,68,0.1); }

        @media(max-width:540px){
          .hc-page { padding:16px 10px 48px; }
          .hc-cal-header { padding:16px 16px; }
          .hc-day-label { padding:7px 0; font-size:0.62rem; letter-spacing:0; }
          .hc-day-label .hc-day-full { display:none; }
          .hc-day-label .hc-day-short { display:inline; }
          .hc-cell { min-height:52px; padding:5px 3px 3px; }
          .hc-date-num { font-size:.72rem; width:22px; height:22px; margin-bottom:2px; }
          .hc-event-label { display:none; }
          .hc-event-circle { display:block; width:8px; height:8px; border-radius:50%; margin:2px auto 0; }
          .hc-selected-panel { padding:14px 16px; }
        }
      `}</style>

      <div className="hc-page">
        <div className="container-lg">
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 50, padding: "4px 14px", marginBottom: 10 }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#92400e", letterSpacing: ".8px" }}>📅 HEARING SCHEDULER</span>
            </div>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(1.5rem,4vw,2rem)", color: "#1a2744", margin: 0 }}>Hearing Calendar</h1>
            <p style={{ color: "#6b7280", fontSize: ".875rem", margin: "6px 0 0" }}>Track all scheduled hearings across your cases</p>
          </div>

          <div className="hc-grid">
            {/* Calendar */}
            <div className="hc-card">
              {/* Cal Header */}
              <div className="hc-cal-header">
                <button className="hc-nav-btn" onClick={() => setCurrent(new Date(year, month - 1, 1))}>‹</button>
                <div style={{ textAlign: "center" }}>
                  <h2 style={{ fontFamily: "'Playfair Display',serif", color: "white", fontSize: "1.3rem", margin: 0 }}>{MONTHS[month]}</h2>
                  <p style={{ color: "rgba(255,255,255,0.6)", margin: 0, fontSize: ".85rem" }}>{year}</p>
                </div>
                <button className="hc-nav-btn" onClick={() => setCurrent(new Date(year, month + 1, 1))}>›</button>
              </div>

              {/* Day Labels */}
              <div className="hc-days-row">
                {DAYS.map((d, i) => (
                  <div key={d} className="hc-day-label">
                    <span className="hc-day-full">{d}</span>
                    <span className="hc-day-short">{DAYS_MOB[i]}</span>
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="hc-cal-body">
                {/* Empty cells before first day */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`e${i}`} className="hc-cell empty" />
                ))}
                {/* Day cells */}
                {Array.from({ length: daysCount }, (_, i) => i + 1).map(d => {
                  const ds = dateStr(d);
                  const dayCases = hearingMap[ds] || [];
                  const isToday  = ds === todayStr;
                  const isSel    = ds === selected;
                  return (
                    <div
                      key={d}
                      className={`hc-cell ${isToday ? "today" : ""} ${isSel ? "selected" : ""}`}
                      onClick={() => setSelected(isSel ? null : ds)}
                    >
                      <div className="hc-date-num">{d}</div>
                      {dayCases.slice(0, 2).map((c, i) => {
                        const col = STATUS_COLORS[c.status] || STATUS_COLORS.Open;
                        return (
                          <span key={i} className="hc-event-dot"
                            style={{ background: col.bg, color: col.text }}>
                            {/* Desktop: show text label */}
                            <span className="hc-event-label">{c.title?.slice(0, 10)}{c.title?.length > 10 ? "…" : ""}</span>
                            {/* Mobile: show colored dot */}
                            <span className="hc-event-circle" style={{ background: col.dot }} />
                          </span>
                        );
                      })}
                      {dayCases.length > 2 && (
                        <span style={{ fontSize: ".62rem", color: "#9ca3af", fontWeight: 600 }} className="hc-event-label">+{dayCases.length - 2}</span>
                      )}
                      
                      {notesMap[ds] && notesMap[ds].length > 0 && (
                        <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
                          {notesMap[ds].map((_, idx) => (
                            <div key={`dot-${idx}`} style={{ width: 6, height: 6, borderRadius: "50%", background: "#4f46e5" }} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={{ padding: "14px 20px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 16, flexWrap: "wrap" }}>
                {Object.entries(STATUS_COLORS).map(([label, col]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".75rem", color: "#374151" }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: col.dot }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Selected Day Panel */}
              {selected && (
                <div className="hc-card">
                  <div style={{ background: "linear-gradient(135deg,#c9a84c,#e8c96d)", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontFamily: "'Playfair Display',serif", color: "#1a2744", fontWeight: 700, margin: 0, fontSize: ".95rem" }}>
                        📅 {new Date(selected + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                      </p>
                      <p style={{ color: "#92400e", margin: "2px 0 0", fontSize: ".75rem", fontWeight: 600 }}>
                        {selectedCases.length} hearing{selectedCases.length !== 1 ? "s" : ""}, {selectedNotes.length} note{selectedNotes.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowNoteForm(!showNoteForm)}
                      style={{ background: "#1a2744", color: "white", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: ".75rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                    >
                      {showNoteForm ? "Cancel" : "+ Add Note"}
                    </button>
                  </div>
                  
                  <div className="hc-selected-panel">
                    {showNoteForm && (
                      <div style={{ background: "#f8faff", padding: 16, borderRadius: 12, marginBottom: 16, border: "1px solid #e5e7eb" }}>
                        <p style={{ fontSize: ".85rem", fontWeight: 700, color: "#1a2744", margin: "0 0 12px" }}>✏️ New Note</p>
                        <input type="text" placeholder="Note Title" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", marginBottom: 10, fontSize: ".8rem" }} />
                        <select value={noteCaseId} onChange={e => setNoteCaseId(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", marginBottom: 10, fontSize: ".8rem", backgroundColor: "white" }}>
                          <option value="">-- Select Case (Optional) --</option>
                          {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                        <textarea placeholder="Write your note here..." value={noteText} onChange={e => setNoteText(e.target.value)} rows={3} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", marginBottom: 10, fontSize: ".8rem", resize: "none" }} />
                        <button onClick={handleSaveNote} disabled={savingNote || !noteTitle.trim() || !noteText.trim()} style={{ width: "100%", background: "#16a34a", color: "white", border: "none", borderRadius: 8, padding: "8px", fontSize: ".85rem", fontWeight: 600, cursor: "pointer" }}>
                          {savingNote ? "Saving..." : "Save Note"}
                        </button>
                      </div>
                    )}

                    {selectedCases.length === 0 && selectedNotes.length === 0 && !showNoteForm && (
                      <p style={{ color: "#9ca3af", fontSize: ".85rem", textAlign: "center", padding: "16px 0", margin: 0 }}>No hearings or notes on this day</p>
                    )}

                    {selectedCases.map((c, i) => {
                      const col = STATUS_COLORS[c.status] || STATUS_COLORS.Open;
                      return (
                        <div key={i} className="hc-case-card" onClick={() => goCase(c.id)}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                            <p style={{ fontWeight: 700, color: "#1a2744", fontSize: ".88rem", margin: 0 }}>{c.title}</p>
                            <span className="hc-badge" style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>{c.status}</span>
                          </div>
                          <p style={{ fontSize: ".75rem", color: "#6b7280", margin: 0 }}>👤 {c.clientName} · ⚖️ {c.category}</p>
                          <p style={{ fontSize: ".72rem", color: "#c9a84c", margin: "4px 0 0", fontWeight: 600 }}>Tap to open case →</p>
                        </div>
                      );
                    })}

                    {selectedNotes.map((n, i) => (
                      <div key={`n${i}`} style={{ background: "white", border: "1px solid #e5e7eb", borderLeft: "4px solid #4f46e5", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <p style={{ fontWeight: 700, color: "#1a2744", fontSize: ".85rem", margin: 0 }}>{n.title}</p>
                          <span style={{ fontSize: ".65rem", background: "#eef2ff", color: "#4f46e5", padding: "2px 8px", borderRadius: 50, fontWeight: 700 }}>Note</span>
                        </div>
                        {n.caseId && (
                          <p style={{ fontSize: ".7rem", color: "#6b7280", margin: "0 0 6px", cursor: "pointer", textDecoration: "underline" }} onClick={() => goCase(n.caseId)}>
                            🔗 Related to: {cases.find(c => c.id === n.caseId)?.title || "Case"}
                          </p>
                        )}
                        <p style={{ fontSize: ".78rem", color: "#4b5563", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{n.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Hearings */}
              <div className="hc-card" style={{ padding: "20px 24px" }}>
                <p style={{ fontFamily: "'Playfair Display',serif", fontSize: ".95rem", fontWeight: 700, color: "#1a2744", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
                  ⚡ Next 30 Days
                  <span style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 50, padding: "2px 8px", fontSize: ".68rem", fontWeight: 700 }}>{upcoming.length}</span>
                </p>
                {upcoming.length === 0 ? (
                  <p style={{ color: "#9ca3af", fontSize: ".83rem", textAlign: "center", padding: "20px 0" }}>No hearings in the next 30 days 🎉</p>
                ) : (
                  upcoming.map((c, i) => {
                    const d = new Date(c.next_hearing_date);
                    const today = new Date(); today.setHours(0,0,0,0);
                    const daysLeft = Math.ceil((d - today) / 86400000);
                    return (
                      <div key={i} className="hc-upcoming-item" onClick={() => goCase(c.id)}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                            <p style={{ fontWeight: 700, color: "#1a2744", fontSize: ".84rem", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</p>
                            <p style={{ fontSize: ".72rem", color: "#6b7280", margin: "2px 0 0" }}>{c.clientName} · {c.next_hearing_date}</p>
                          </div>
                          <span className="hc-badge" style={{
                            background: daysLeft <= 1 ? "#fee2e2" : daysLeft <= 3 ? "#fef3c7" : "#f3f4f6",
                            color: daysLeft <= 1 ? "#dc2626" : daysLeft <= 3 ? "#92400e" : "#374151",
                            flexShrink: 0,
                          }}>
                            {daysLeft === 0 ? "Today!" : daysLeft === 1 ? "Tomorrow" : `${daysLeft}d`}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Stats */}
              <div className="hc-card" style={{ padding: "20px 24px" }}>
                <p style={{ fontFamily: "'Playfair Display',serif", fontSize: ".95rem", fontWeight: 700, color: "#1a2744", margin: "0 0 14px" }}>📊 This Month</p>
                {(() => {
                  const thisMonthCases = cases.filter(c => {
                    if (!c.next_hearing_date) return false;
                    const d = new Date(c.next_hearing_date);
                    return d.getMonth() === month && d.getFullYear() === year;
                  });
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {[
                        { label: "Hearings", value: thisMonthCases.length, icon: "📅" },
                        { label: "Open Cases", value: thisMonthCases.filter(c => c.status === "Open").length, icon: "🟢" },
                        { label: "In Progress", value: thisMonthCases.filter(c => c.status === "In Progress").length, icon: "⏳" },
                        { label: "Closed", value: thisMonthCases.filter(c => c.status === "Closed").length, icon: "✅" },
                      ].map((s, i) => (
                        <div key={i} style={{ background: "#f8faff", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                          <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>{s.icon}</div>
                          <div style={{ fontWeight: 800, fontSize: "1.3rem", color: "#1a2744" }}>{s.value}</div>
                          <div style={{ fontSize: ".7rem", color: "#9ca3af", fontWeight: 600 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
