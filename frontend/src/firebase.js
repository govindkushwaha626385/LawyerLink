// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBMe-xPA6efYYnLpqr6SOKGIn5hlmTw5L4",
  authDomain: "lawyerlink-f8c49.firebaseapp.com",
  projectId: "lawyerlink-f8c49",
  storageBucket: "lawyerlink-f8c49.firebasestorage.app",
  messagingSenderId: "937708599745",
  appId: "1:937708599745:web:474c39f8bd74591ff2d740",
  measurementId: "G-JB4VXKNPN3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
