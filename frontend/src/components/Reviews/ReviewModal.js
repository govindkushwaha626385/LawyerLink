// src/components/Reviews/ReviewModal.js
import React, { useState } from "react";
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";

export default function ReviewModal({ caseData, lawyerId, onClose }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const user = auth.currentUser;

  const handleSubmit = async () => {
    if (rating === 0) { alert("Please select a star rating."); return; }
    if (!user || !lawyerId) return;
    setSubmitting(true);
    try {
      // Save review
      await addDoc(collection(db, "reviews"), {
        lawyerId,
        litigantId: user.uid,
        litigantEmail: user.email,
        caseId: caseData.id || caseData.case_id,
        caseTitle: caseData.title,
        rating,
        comment: comment.trim(),
        timestamp: serverTimestamp(),
      });

      // Update lawyer's avg rating
      const userRef = doc(db, "users", lawyerId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const { rating: oldRating = 0, reviewCount = 0 } = snap.data();
        const newCount = reviewCount + 1;
        const newRating = ((oldRating * reviewCount) + rating) / newCount;
        await updateDoc(userRef, { rating: parseFloat(newRating.toFixed(1)), reviewCount: newCount });
      }

      setDone(true);
    } catch (err) {
      console.error("Review error:", err);
      alert("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        .rev-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px); }
        .rev-modal { background: white; border-radius: 24px; width: 100%; max-width: 460px; box-shadow: 0 24px 80px rgba(0,0,0,0.3); overflow: hidden; animation: revIn 0.3s ease; }
        @keyframes revIn { from{opacity:0;transform:scale(0.96) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .rev-header { background: linear-gradient(-45deg, #1a2744, #243460); padding: 24px 28px; color: white; }
        .rev-header h3 { font-family: 'Playfair Display', serif; font-size: 1.2rem; font-weight: 700; margin: 0 0 4px; }
        .rev-header p { font-size: 0.8rem; opacity: 0.65; margin: 0; }
        .rev-body { padding: 28px; }
        .rev-stars { display: flex; gap: 6px; margin-bottom: 22px; justify-content: center; }
        .rev-star { font-size: 2.2rem; cursor: pointer; transition: all 0.15s; filter: grayscale(1); }
        .rev-star.active { filter: none; transform: scale(1.15); }
        .rev-label { font-size: 0.8rem; font-weight: 600; color: #374151; margin-bottom: 6px; display: block; }
        .rev-textarea { width: 100%; border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 11px 14px; font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #1a2744; outline: none; transition: all 0.2s; resize: none; background: #fafafa; }
        .rev-textarea:focus { border-color: #1a2744; background: white; box-shadow: 0 0 0 3px rgba(26,39,68,0.06); }
        .rev-actions { display: flex; gap: 10px; margin-top: 18px; }
        .rev-cancel { flex: 1; background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 50px; padding: 10px; font-size: 0.875rem; font-weight: 600; color: #374151; cursor: pointer; transition: all 0.2s; }
        .rev-cancel:hover { background: #f3f4f6; }
        .rev-submit { flex: 1; background: linear-gradient(135deg, #c9a84c, #e8c96d); border: none; border-radius: 50px; padding: 10px; font-size: 0.875rem; font-weight: 700; color: #1a2744; cursor: pointer; transition: all 0.2s; }
        .rev-submit:hover:not(:disabled) { box-shadow: 0 6px 18px rgba(201,168,76,0.4); transform: translateY(-1px); }
        .rev-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .rev-rating-text { text-align: center; font-size: 0.83rem; font-weight: 600; color: #6b7280; margin-bottom: 16px; height: 18px; }
        .rev-done { text-align: center; padding: 20px; }
        .rev-done-icon { font-size: 3rem; margin-bottom: 12px; }
        .rev-done h4 { font-family: 'Playfair Display', serif; color: #1a2744; margin-bottom: 6px; }
        .rev-done p { font-size: 0.85rem; color: #6b7280; }
      `}</style>

      <div className="rev-overlay" onClick={onClose}>
        <div className="rev-modal" onClick={e => e.stopPropagation()}>
          <div className="rev-header">
            <h3>⭐ Rate your Lawyer</h3>
            <p>{caseData?.title}</p>
          </div>

          {done ? (
            <div className="rev-done">
              <div className="rev-done-icon">🎉</div>
              <h4>Thank you for your review!</h4>
              <p>Your feedback helps others find great lawyers.</p>
              <button className="rev-submit" style={{ marginTop: 16, width: "100%", padding: "11px" }} onClick={onClose}>Close</button>
            </div>
          ) : (
            <div className="rev-body">
              {/* Stars */}
              <div className="rev-stars">
                {[1, 2, 3, 4, 5].map(s => (
                  <span key={s} className={`rev-star ${(hover || rating) >= s ? "active" : ""}`}
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(s)}>⭐</span>
                ))}
              </div>
              <p className="rev-rating-text">
                {(hover || rating) === 1 && "Poor"}
                {(hover || rating) === 2 && "Fair"}
                {(hover || rating) === 3 && "Good"}
                {(hover || rating) === 4 && "Very Good"}
                {(hover || rating) === 5 && "Excellent!"}
              </p>

              <label className="rev-label">Write a Review (Optional)</label>
              <textarea
                className="rev-textarea" rows="4"
                placeholder="Share your experience with this lawyer..."
                value={comment} onChange={e => setComment(e.target.value)}
              />

              <div className="rev-actions">
                <button className="rev-cancel" onClick={onClose}>Cancel</button>
                <button className="rev-submit" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
