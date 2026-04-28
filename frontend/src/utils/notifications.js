// src/utils/notifications.js
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Create a notification for a user.
 * @param {string} userId - Target user's Firebase UID
 * @param {string} title - Short notification title
 * @param {string} body - Notification detail text
 * @param {string} type - "case_update" | "message" | "document" | "hearing" | "review"
 * @param {string} caseId - Optional: related case document ID
 */
export async function createNotification(userId, title, body, type = "general", caseId = null) {
  if (!userId) return;
  try {
    await addDoc(collection(db, "notifications", userId, "items"), {
      title,
      body,
      type,
      caseId,
      read: false,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("Error creating notification:", err);
  }
}
