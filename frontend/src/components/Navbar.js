// src/components/Navbar.js
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";

export default function NavbarComp() {
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm fixed-top">
      <div className="container">
        <Link className="navbar-brand" to="/">⚖️ LawyerLink</Link>
        <button className="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#nav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="nav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item"><Link className="nav-link" to="/about">About</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/contact">Contact</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/catalog">Lawyers</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/chatbot">Chatbot</Link></li>
            <li className="nav-item"><button className="btn btn-outline-secondary btn-sm ms-2" onClick={handleLogout}>Logout</button></li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
