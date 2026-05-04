// src/components/Case/CaseDocuments.js
import React, { useState, useEffect, useRef } from "react";
import { doc, updateDoc, arrayUnion, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { addCaseEvent } from "../../utils/caseEvents";
import { createNotification } from "../../utils/notifications";
import DocAnalyzer from "./DocAnalyzer";

// ─── Cloudinary config ────────────────────────────────────
const CLOUD_NAME = "dzfoal3fg";
const UPLOAD_PRESET = "lawyerlink_documents";

// Upload endpoint — use /auto/upload/ so Cloudinary detects raw docs (PDF, Excel) vs images
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

// Build the download URL:
//   • Real images (jpg/png/gif/webp) → serve inline
//   • Everything else (PDF, Word, etc.) → add fl_attachment so browser downloads
const isInlineImage = (type = "") =>
  /^image\/(jpeg|jpg|png|gif|webp|svg)/.test(type);

const getDownloadUrl = (url = "", type = "") => {
  if (!url) return "";
  if (isInlineImage(type)) return url;
  if (url.includes("/upload/")) {
    return url.replace("/upload/", "/upload/fl_attachment/");
  }
  return url;
};
// ──────────────────────────────────────────────────────────

export default function CaseDocuments({ caseId, isLawyer }) {
  const [documents, setDocuments] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [caseInfo, setCaseInfo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [activeAnalysis, setActiveAnalysis] = useState(null); // { name, url }

  const fileInputRef = useRef(null);
  const caseInfoRef = useRef(null);
  const xhrRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setCurrentUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!caseId) return;
    const unsub = onSnapshot(doc(db, "cases", caseId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setDocuments(data.documents || []);
        setCaseInfo(data);
        caseInfoRef.current = data;
      }
    });
    return () => unsub();
  }, [caseId]);

  useEffect(() => () => { if (xhrRef.current) xhrRef.current.abort(); }, []);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    if (!currentUser) { setUploadError("You must be logged in to upload."); return; }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError(`"${file.name}" is too large (max 10 MB).`);
      return;
    }

    setUploadError("");
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", `lawyerlink/cases/${caseId}`);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.addEventListener("progress", (ev) => {
      if (ev.lengthComputable) {
        setProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    });

    xhr.addEventListener("load", async () => {
      try {
        if (xhr.status !== 200) {
          const err = JSON.parse(xhr.responseText);
          throw new Error(err?.error?.message || `HTTP ${xhr.status}`);
        }
        const res = JSON.parse(xhr.responseText);
        const uploaderName =
          currentUser.displayName || currentUser.email?.split("@")[0] || "User";

        const docEntry = {
          name: file.name,
          url: res.secure_url,   // always /image/upload/...
          type: file.type || "application/octet-stream",
          size: file.size,
          uploadedBy: uploaderName,
          uploadedByRole: isLawyer ? "lawyer" : "litigant",
          uploadedAt: new Date().toISOString(),
        };

        await updateDoc(doc(db, "cases", caseId), { documents: arrayUnion(docEntry) });
        await addCaseEvent(caseId, "document",
          `📄 "${file.name}" uploaded by ${uploaderName}`, uploaderName);

        const info = caseInfoRef.current;
        if (info) {
          const recipientId = isLawyer ? info.litigantId : info.lawyerId;
          if (recipientId) {
            await createNotification(recipientId, "📄 New Document Uploaded",
              `${uploaderName} uploaded "${file.name}" to case "${info.title}"`,
              "document", caseId);
          }
        }
      } catch (err) {
        setUploadError(`Upload failed: ${err.message}`);
      } finally {
        setUploading(false);
        setProgress(0);
      }
    });

    xhr.addEventListener("error", () => { setUploading(false); setProgress(0); setUploadError("Network error. Check your connection."); });
    xhr.addEventListener("abort", () => { setUploading(false); setProgress(0); });

    xhr.open("POST", UPLOAD_URL);
    xhr.send(formData);
  };

  const getFileIcon = (type = "", name = "") => {
    const ext = name.split(".").pop().toLowerCase();
    if (/^image\//.test(type)) return "🖼️";
    if (type.includes("pdf") || ext === "pdf") return "📄";
    if (type.includes("word") || ["doc", "docx"].includes(ext)) return "📝";
    if (type.includes("sheet") || type.includes("excel") || ["xls", "xlsx"].includes(ext)) return "📊";
    if (ext === "txt") return "📃";
    if (["zip", "rar", "7z"].includes(ext)) return "🗜️";
    return "📁";
  };

  const formatSize = (b) => {
    if (!b) return "—";
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  };

  const formatDate = (iso) => {
    try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return "—"; }
  };

  const lawyerDocs = documents.filter(d => d.uploadedByRole === "lawyer");
  const litigantDocs = documents.filter(d => d.uploadedByRole === "litigant");

  const UploadZone = ({ label }) => (
    <div className={`docs-upload-zone ${uploading ? "docs-uploading" : ""}`}>
      <div className="docs-upload-cloud">☁️</div>
      <p className="docs-upload-title">{label}</p>
      <p className="docs-upload-sub">PDF, Word, Excel, Images · Max 10 MB</p>
      <input ref={fileInputRef} type="file" style={{ display: "none" }}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.txt,.zip"
        onChange={handleUpload} />
      <button className="docs-upload-btn"
        onClick={() => { setUploadError(""); fileInputRef.current?.click(); }}
        disabled={uploading}>
        {uploading ? <>⏳ Uploading… {progress}%</> : <>📎 Choose File</>}
      </button>
      {uploading && (
        <>
          <div className="docs-progress-track">
            <div className="docs-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="docs-progress-label">{progress}% uploaded</p>
        </>
      )}
    </div>
  );

  const DocGrid = ({ docs }) => (
    <div className="docs-grid">
      {docs.map((file, i) => (
        <div key={`${file.name}-${i}`} className="docs-card">
          <div className="docs-card-top">
            <div className="docs-file-icon">{getFileIcon(file.type, file.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="docs-file-name">{file.name}</p>
              <p className="docs-file-meta">{formatSize(file.size)} · {formatDate(file.uploadedAt)}</p>
              <span className={`docs-badge docs-badge-${file.uploadedByRole || "lawyer"}`}>
                {file.uploadedByRole === "litigant" ? "👤 Client" : "⚖️ Lawyer"}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a
              href={getDownloadUrl(file.url, file.type)}
              target="_blank"
              rel="noopener noreferrer"
              className="docs-download-btn"
              style={{ flex: 1 }}
            >
              {isInlineImage(file.type) ? "🔍 View" : "⬇️ Download"}
            </a>
            <button
              className="docs-download-btn"
              style={{ flex: 1, cursor: "pointer", background: "linear-gradient(135deg,#1a2744,#243460)", color: "white", border: "none" }}
              onClick={() => setActiveAnalysis({ name: file.name, url: file.url })}
            >
              🤖 Analyze
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {activeAnalysis && (
        <DocAnalyzer
          fileName={activeAnalysis.name}
          fileUrl={activeAnalysis.url}
          onClose={() => setActiveAnalysis(null)}
        />
      )}
      <style>{`
        .docs-wrapper { font-family:'Inter',sans-serif; }
        .docs-upload-zone { border:2px dashed #c7d2fe; border-radius:18px; padding:28px 24px; text-align:center; background:linear-gradient(135deg,#f8faff,#f0f4ff); transition:all .25s; margin-bottom:18px; }
        .docs-upload-zone:hover { border-color:#1a2744; background:#eef2ff; }
        .docs-uploading { border-color:#c9a84c !important; background:#fefdf5 !important; }
        .docs-upload-cloud { font-size:2rem; margin-bottom:6px; }
        .docs-upload-title { font-size:.88rem; font-weight:700; color:#1a2744; margin:0 0 3px; }
        .docs-upload-sub { font-size:.73rem; color:#9ca3af; margin:0 0 12px; }
        .docs-upload-btn { display:inline-flex; align-items:center; gap:6px; background:linear-gradient(135deg,#1a2744,#243460); color:white; border-radius:50px; padding:9px 22px; font-size:.83rem; font-weight:700; cursor:pointer; border:none; font-family:'Inter',sans-serif; box-shadow:0 4px 14px rgba(26,39,68,.2); transition:all .25s; }
        .docs-upload-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 22px rgba(26,39,68,.3); }
        .docs-upload-btn:disabled { opacity:.6; cursor:not-allowed; }
        .docs-progress-track { height:5px; background:#e5e7eb; border-radius:5px; margin-top:12px; overflow:hidden; }
        .docs-progress-fill { height:100%; background:linear-gradient(90deg,#1a2744,#c9a84c); border-radius:5px; transition:width .25s; }
        .docs-progress-label { font-size:.7rem; color:#6b7280; margin-top:4px; font-weight:600; }
        .docs-error { background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:10px 14px; font-size:.82rem; color:#dc2626; margin-bottom:14px; display:flex; justify-content:space-between; gap:8px; align-items:flex-start; }
        .docs-section-label { font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:#9ca3af; margin:18px 0 10px; display:flex; align-items:center; gap:6px; }
        .docs-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; }
        .docs-card { background:white; border:1px solid #eef2ff; border-radius:14px; padding:14px; display:flex; flex-direction:column; gap:10px; box-shadow:0 2px 8px rgba(26,39,68,.05); transition:all .25s; }
        .docs-card:hover { transform:translateY(-3px); box-shadow:0 10px 28px rgba(26,39,68,.11); border-color:#c7d2fe; }
        .docs-card-top { display:flex; gap:10px; align-items:flex-start; }
        .docs-file-icon { font-size:1.5rem; flex-shrink:0; width:42px; height:42px; background:#f0f4ff; border-radius:10px; display:flex; align-items:center; justify-content:center; }
        .docs-file-name { font-size:.82rem; font-weight:700; color:#1a2744; word-break:break-word; line-height:1.3; margin:0 0 3px; }
        .docs-file-meta { font-size:.7rem; color:#9ca3af; margin:0; }
        .docs-badge { display:inline-block; border-radius:50px; padding:2px 8px; font-size:.63rem; font-weight:700; text-transform:uppercase; margin-top:3px; }
        .docs-badge-lawyer { background:#eef2ff; color:#4338ca; }
        .docs-badge-litigant { background:#fef3c7; color:#92400e; }
        .docs-download-btn { display:flex; align-items:center; justify-content:center; gap:5px; border:1.5px solid #1a2744; border-radius:50px; padding:7px 14px; font-size:.77rem; font-weight:700; color:#1a2744; background:transparent; text-decoration:none; transition:all .2s; font-family:'Inter',sans-serif; }
        .docs-download-btn:hover { background:#1a2744; color:white; }
        .docs-empty { text-align:center; padding:32px 20px; color:#9ca3af; }
        .docs-empty-icon { font-size:2.5rem; margin-bottom:8px; }
        .docs-divider { border:none; border-top:1px solid #f0f4ff; margin:20px 0; }
      `}</style>

      <div className="docs-wrapper">

        {/* ── Upload Zone (both roles) ── */}
        <UploadZone label={isLawyer ? "Upload Case Documents" : "Upload Your Documents"} />

        {/* ── Error ── */}
        {uploadError && (
          <div className="docs-error">
            <span>{uploadError}</span>
            <button onClick={() => setUploadError("")}
              style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontWeight: 800, fontSize: "1rem", padding: 0 }}>✕</button>
          </div>
        )}

        {/* ── Lawyer docs ── */}
        {lawyerDocs.length > 0 && (
          <>
            <p className="docs-section-label">⚖️ Uploaded by Lawyer ({lawyerDocs.length})</p>
            <DocGrid docs={lawyerDocs} />
          </>
        )}

        {/* ── Litigant docs ── */}
        {litigantDocs.length > 0 && (
          <>
            <hr className="docs-divider" />
            <p className="docs-section-label">👤 Uploaded by Client ({litigantDocs.length})</p>
            <DocGrid docs={litigantDocs} />
          </>
        )}

        {/* ── Empty state ── */}
        {documents.length === 0 && (
          <div className="docs-empty">
            <div className="docs-empty-icon">📂</div>
            <p style={{ fontSize: ".85rem", margin: 0, color: "#374151", fontWeight: 600 }}>No documents yet</p>
            <p style={{ fontSize: ".78rem", margin: "4px 0 0", color: "#9ca3af" }}>
              Upload files above to share with the other party.
            </p>
          </div>
        )}

      </div>
    </>
  );
}
