// src/components/Auth/Signup.js
import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const role = new URLSearchParams(location.search).get("role") || "litigant";

  const handleSignup = async () => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", result.user.uid), {
        email,
        role,
        createdAt: new Date().toISOString(),
        displayName: "",
        phone: "",
        image: ""
      });
      navigate(role === "lawyer" ? "/lawyer" : "/litigant");
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="container mt-5 col-md-4">
      <h3>Signup as {role}</h3>
      <input className="form-control my-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input type="password" className="form-control my-2" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button className="btn btn-primary w-100" onClick={handleSignup}>Signup</button>
    </div>
  );
}
