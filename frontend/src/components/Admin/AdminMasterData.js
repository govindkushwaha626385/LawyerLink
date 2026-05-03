import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, deleteDoc, setDoc, updateDoc } from "firebase/firestore";

export default function AdminMasterData() {
  const [activeTab, setActiveTab] = useState("Courts");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let colName = "";
      if (activeTab === "Courts") colName = "courts";
      if (activeTab === "Advocates") colName = "advocates_master";
      if (activeTab === "FIRs") colName = "fir_numbers";

      try {
        const snap = await getDocs(collection(db, colName));
        setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    let colName = "";
    if (activeTab === "Courts") colName = "courts";
    if (activeTab === "Advocates") colName = "advocates_master";
    if (activeTab === "FIRs") colName = "fir_numbers";

    await deleteDoc(doc(db, colName, id));
    setData(prev => prev.filter(item => item.id !== id));
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm(item);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingId(null);
    setForm({});
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    let colName = "";
    if (activeTab === "Courts") colName = "courts";
    if (activeTab === "Advocates") colName = "advocates_master";
    if (activeTab === "FIRs") colName = "fir_numbers";

    let docId = editingId;

    if (!docId) {
      // Determine new document ID based on what we're adding
      if (activeTab === "Courts") docId = form.court_name?.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      if (activeTab === "Advocates") docId = form.advocate_registration_number?.replace(/\//g, "_");
      if (activeTab === "FIRs") docId = form.fir_number?.replace(/\//g, "_");
      if (!docId) docId = Date.now().toString(); // Fallback ID
    }

    try {
      const docRef = doc(db, colName, docId);
      if (editingId) {
        await updateDoc(docRef, form);
        setData(prev => prev.map(item => item.id === editingId ? { ...item, ...form } : item));
      } else {
        await setDoc(docRef, form);
        setData(prev => [{ id: docId, ...form }, ...prev]);
      }
      setShowModal(false);
    } catch (err) {
      alert("Error saving record: " + err.message);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="adm-card">
      <div className="adm-card-header">
        <p className="adm-card-title">
          🗄️ Master Data Management
          {!loading && (
            <span style={{ fontSize: "0.85rem", color: "#6b7280", marginLeft: 12, fontWeight: 500 }}>
              ({data.length} total {activeTab.toLowerCase()})
            </span>
          )}
        </p>
        <button className="adm-export-btn" onClick={handleAdd}>
          ➕ Add New {activeTab.slice(0, -1)}
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, padding: "0 24px 16px" }}>
        {["Courts", "Advocates", "FIRs"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "6px 16px", borderRadius: 50, fontSize: "0.85rem", fontWeight: 600, border: "none",
              background: activeTab === tab ? "linear-gradient(135deg,#1a2744,#243460)" : "#f3f4f6",
              color: activeTab === tab ? "white" : "#6b7280", cursor: "pointer", transition: "all 0.2s"
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="adm-card-body" style={{ overflowX: "auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Loading data...</div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                {activeTab === "Courts" && (
                  <><th>Court Name</th><th>Address</th></>
                )}
                {activeTab === "Advocates" && (
                  <><th>Registration Number</th><th>Registration Date</th><th>Email (Optional)</th></>
                )}
                {activeTab === "FIRs" && (
                  <><th>FIR Number</th></>
                )}
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  {activeTab === "Courts" && (
                    <>
                      <td style={{ fontWeight: 600, color: "#1a2744" }}>{item.court_name}</td>
                      <td>{item.address}</td>
                    </>
                  )}
                  {activeTab === "Advocates" && (
                    <>
                      <td style={{ fontWeight: 600, color: "#1a2744" }}>{item.advocate_registration_number}</td>
                      <td>{item.registration_date}</td>
                      <td>{item.email_id || "—"}</td>
                    </>
                  )}
                  {activeTab === "FIRs" && (
                    <>
                      <td style={{ fontWeight: 600, color: "#1a2744", fontFamily: "monospace" }}>{item.fir_number}</td>
                    </>
                  )}
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={actionBtnStyle("#ca8a04", "#fef08a")} onClick={() => handleEdit(item)}>Edit</button>
                      <button style={actionBtnStyle("#dc2626", "#fecaca")} onClick={() => handleDelete(item.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: 30, color: "#9ca3af" }}>
                    No {activeTab.toLowerCase()} found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal for Add/Edit ── */}
      {showModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999
        }}>
          <div style={{
            background: "white", padding: 32, borderRadius: 20, width: "100%", maxWidth: 450,
            boxShadow: "0 12px 40px rgba(0,0,0,0.2)"
          }}>
            <h3 style={{ marginTop: 0, marginBottom: 20, fontFamily: "'Playfair Display', serif", color: "#1a2744" }}>
              {editingId ? "Edit" : "Add"} {activeTab.slice(0, -1)}
            </h3>
            <form onSubmit={handleSave}>
              {activeTab === "Courts" && (
                <>
                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>Court Name <span style={{ color: "red" }}>*</span></label>
                    <input style={inputStyle} name="court_name" value={form.court_name || ""} onChange={handleChange} required placeholder="e.g. District Court, Delhi" />
                  </div>
                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>Address <span style={{ color: "red" }}>*</span></label>
                    <input style={inputStyle} name="address" value={form.address || ""} onChange={handleChange} required placeholder="Court Full Address" />
                  </div>
                </>
              )}
              {activeTab === "Advocates" && (
                <>
                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>Advocate Registration Number <span style={{ color: "red" }}>*</span></label>
                    <input style={inputStyle} name="advocate_registration_number" value={form.advocate_registration_number || ""} onChange={handleChange} required placeholder="e.g. MP/1234/2021" />
                  </div>
                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>Registration Date (YYYY-MM-DD) <span style={{ color: "red" }}>*</span></label>
                    <input type="date" style={inputStyle} name="registration_date" value={form.registration_date || ""} onChange={handleChange} required />
                  </div>
                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>Email ID</label>
                    <input type="email" style={inputStyle} name="email_id" value={form.email_id || ""} onChange={handleChange} placeholder="lawyer@example.com" />
                  </div>
                </>
              )}
              {activeTab === "FIRs" && (
                <>
                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>FIR Number <span style={{ color: "red" }}>*</span></label>
                    <input style={inputStyle} name="fir_number" value={form.fir_number || ""} onChange={handleChange} required placeholder="e.g. FIR/2024/MP/JAB/001" />
                  </div>
                </>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{
                  padding: "8px 16px", borderRadius: 50, border: "1px solid #d1d5db", background: "white", color: "#374151", cursor: "pointer"
                }}>Cancel</button>
                <button type="submit" style={{
                  padding: "8px 24px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#1a2744,#243460)", color: "white", fontWeight: 600, cursor: "pointer"
                }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const actionBtnStyle = (color, bg) => ({
  background: bg, color: color, border: "none", borderRadius: 50,
  padding: "4px 12px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer"
});

const inputGroupStyle = { marginBottom: 16 };
const labelStyle = { display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: 6 };
const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" };
