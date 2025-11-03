// src/components/Auth/Login.js
import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate, useLocation } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const nav = useNavigate();
  const location = useLocation();
  const role = new URLSearchParams(location.search).get("role") || "litigant";

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      nav(role === "lawyer" ? "/lawyer" : "/litigant");
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="container mt-5 col-md-4">
      <h3>Login as {role}</h3>
      <input className="form-control my-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input type="password" className="form-control my-2" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
      <div className="d-grid gap-2">
        <button className="btn btn-primary" onClick={handleLogin}>Login</button>
        <a className="btn btn-link" href={`/signup?role=${role}`}>Create new account</a>
      </div>
    </div>
  );
}
