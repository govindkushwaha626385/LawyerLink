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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();

  // ✅ Listen to login/logout changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
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
    setIsMenuOpen(false);
  };

  const handleDashboardClick = () => {
    if (!role) return;
    if (role === "lawyer") navigate("/lawyer");
    else if (role === "litigant") navigate("/litigant");
    setIsMenuOpen(false);
  };

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMenuItemClick = () => {
    // ✅ Close menu when a link is clicked (on mobile)
    if (isMenuOpen) setIsMenuOpen(false);
  };

  return (
    <nav
      className="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top"
      style={{ transition: "all 0.3s ease-in-out" }}
    >
      <div className="container">
        {/* ✅ Brand / Logo */}
        <Link
          className="navbar-brand fw-bold text-primary d-flex align-items-center"
          to="/"
          style={{
            fontFamily: "Poppins, sans-serif",
            fontSize: "1.6rem",
            letterSpacing: "0.5px",
          }}
          onClick={handleMenuItemClick}
        >
          ⚖️ <span className="ms-2">LawyerLink</span>
        </Link>

        {/* ✅ Mobile Toggle Button */}
        <button
          className="navbar-toggler border-0"
          type="button"
          aria-controls="navbarNav"
          aria-expanded={isMenuOpen}
          aria-label="Toggle navigation"
          onClick={handleMenuToggle}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* ✅ Collapsible Nav Items */}
        <div
          className={`collapse navbar-collapse justify-content-end ${
            isMenuOpen ? "show" : ""
          }`}
          id="navbarNav"
        >
          <ul className="navbar-nav align-items-lg-center">

            <li className="nav-item mx-2">
              <Link
                className="nav-link fw-medium"
                to="/about"
                onClick={handleMenuItemClick}
              >
                About
              </Link>
            </li>

            <li className="nav-item mx-2">
              <Link
                className="nav-link fw-medium"
                to="/contact"
                onClick={handleMenuItemClick}
              >
                Contact
              </Link>
            </li>

            {/* ✅ Show “Lawyers” only for Litigants */}
            {role !== "lawyer" && (
              <li className="nav-item mx-2">
                <Link
                  className="nav-link fw-medium"
                  to="/catalog"
                  onClick={handleMenuItemClick}
                >
                  Lawyers
                </Link>
              </li>
            )}

            <li className="nav-item mx-2">
              <Link
                className="nav-link fw-medium"
                to="/chatbot"
                onClick={handleMenuItemClick}
              >
                Chatbot
              </Link>
            </li>

            {/* ✅ Dashboard Button — Only visible when logged in */}
            {user && (role === "lawyer" || role === "litigant") && (
              <li className="nav-item mx-2">
                <button
                  onClick={handleDashboardClick}
                  className="btn btn-success text-white px-4 py-1 rounded-pill fw-semibold shadow-sm"
                  style={{
                    fontSize: "0.9rem",
                    background:
                      "linear-gradient(90deg, #16a34a 0%, #22c55e 100%)",
                    border: "none",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.background =
                      "linear-gradient(90deg, #15803d 0%, #16a34a 100%)")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.background =
                      "linear-gradient(90deg, #16a34a 0%, #22c55e 100%)")
                  }
                >
                  Dashboard
                </button>
              </li>
            )}

            {/* ✅ Auth Buttons */}
            {user ? (
              <>
                <li className="nav-item mx-2">
                  <Link
                    className="btn btn-outline-primary px-4 py-1 rounded-pill fw-semibold"
                    to="/profile"
                    style={{ fontSize: "0.9rem" }}
                    onClick={handleMenuItemClick}
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
                  onClick={handleMenuItemClick}
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
