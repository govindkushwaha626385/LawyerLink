// src/components/ChooseUserType.js
import React from "react";
import { useNavigate } from "react-router-dom";

export default function ChooseUserType() {
  const nav = useNavigate();
  return (
    <div className="container d-flex flex-column align-items-center justify-content-center" style={{height: "80vh"}}>
      <h1 className="mb-4">Welcome to LawyerLink</h1>
      <div>
        <button className="btn btn-primary btn-lg me-3" onClick={() => nav("/login?role=litigant")}>Litigant</button>
        <button className="btn btn-success btn-lg" onClick={() => nav("/login?role=lawyer")}>Lawyer</button>
      </div>
      <p className="text-muted mt-3">Choose your role to continue</p>
    </div>
  );
}
