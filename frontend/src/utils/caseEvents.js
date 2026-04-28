// src/utils/caseEvents.js
import { doc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Append an event to the case timeline.
 * @param {string} caseId - Firestore document ID of the case
 * @param {string} type - "status_change" | "document" | "note" | "message" | "created"
 * @param {string} message - Human-readable description of the event
 * @param {string} byName - Name of the actor (lawyer or litigant name)
 */
export async function addCaseEvent(caseId, type, message, byName = "System") {
  if (!caseId) return;
  try {
    const caseRef = doc(db, "cases", caseId);
    await updateDoc(caseRef, {
      events: arrayUnion({
        type,
        message,
        byName,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).slice(2, 9),
      }),
    });
  } catch (err) {
    console.error("Error adding case event:", err);
  }
}
