import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const navigate = useNavigate();
  const auth = getAuth();

  // Listen to login/logout changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          // Fetch user role from Firestore (users collection)
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setRole(docSnap.data().role);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      } else {
        setRole(null);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const handleDashboardClick = () => {
    if (!role) return; // If role not loaded yet, do nothing
    if (role === "lawyer") navigate("/lawyer");
    else if (role === "litigant") navigate("/litigant");
  };

  return (
    <nav
      className="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top"
      style={{ transition: "all 0.3s ease-in-out" }}
    >
      <div className="container">
        <Link
          className="navbar-brand fw-bold text-primary d-flex align-items-center"
          to="/"
          style={{
            fontFamily: "Poppins, sans-serif",
            fontSize: "1.5rem",
            letterSpacing: "0.5px",
          }}
        >
          ⚖️ <span className="ms-2">LawyerLink</span>
        </Link>

        {/* Mobile Toggle */}
        <button
          className="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Nav Links */}
        <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
          <ul className="navbar-nav align-items-lg-center">
            <li className="nav-item mx-2">
              <Link className="nav-link fw-medium" to="/about">
                About
              </Link>
            </li>

            <li className="nav-item mx-2">
              <Link className="nav-link fw-medium" to="/contact">
                Contact
              </Link>
            </li>

            {/* Show “Lawyers” only for Litigants */}
            {role !== "lawyer" && (
              <li className="nav-item mx-2">
                <Link className="nav-link fw-medium" to="/catalog">
                  Lawyers
                </Link>
              </li>
            )}

            <li className="nav-item mx-2">
              <Link className="nav-link fw-medium" to="/chatbot">
                Chatbot
              </Link>
            </li>

            {/* ✅ Dashboard Button (Dynamic Redirect) */}
            {/* ✅ Dashboard Button — visible only when user logged in */}
            {user && (role === "lawyer" || role === "litigant") && (
              <li className="nav-item mx-2">
                <button
                  onClick={handleDashboardClick}
                  className="btn btn-outline-success px-4 py-1 rounded-pill fw-semibold"
                  style={{ fontSize: "0.9rem" }}
                >
                  Dashboard
                </button>
              </li>
            )}


            {/* Dynamic Auth Buttons */}
            {user ? (
              <>
                <li className="nav-item mx-2">
                  <Link
                    className="btn btn-outline-primary px-4 py-1 rounded-pill fw-semibold"
                    to="/profile"
                    style={{ fontSize: "0.9rem" }}
                  >
                    Profile
                  </Link>
                </li>
                <li className="nav-item mt-2 mt-lg-0 ms-lg-2">
                  <button
                    onClick={handleLogout}
                    className="btn btn-primary px-4 py-1 rounded-pill fw-semibold"
                    style={{ fontSize: "0.9rem" }}
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <li className="nav-item mt-2 mt-lg-0 ms-lg-3">
                <Link
                  className="btn btn-outline-primary px-4 py-1 rounded-pill fw-semibold"
                  to="/login"
                  style={{ fontSize: "0.9rem" }}
                >
                  Login / Signup
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
