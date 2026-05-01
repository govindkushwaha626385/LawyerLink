import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, onSnapshot, orderBy, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import "bootstrap/dist/css/bootstrap.min.css";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showBell, setShowBell] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();

  // Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) setRole(docSnap.data().role);
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      } else {
        setRole(null);
        setNotifications([]);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  // Scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Real-time notifications
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications", user.uid, "items"),
      orderBy("timestamp", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 15));
    });
    return () => unsub();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    if (!user) return;
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      try {
        await updateDoc(doc(db, "notifications", user.uid, "items", n.id), { read: true });
      } catch { /* ignore */ }
    }
  };

  const getNotifIcon = (type) => {
    const map = { case_update: "⚖️", message: "💬", document: "📄", hearing: "📅", review: "⭐", general: "🔔" };
    return map[type] || "🔔";
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
    setIsMenuOpen(false);
    setShowBell(false);
  };

  const handleDashboardClick = () => {
    if (!role) return;
    if (role === "lawyer") navigate("/lawyer");
    else if (role === "litigant") navigate("/litigant");
    setIsMenuOpen(false);
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <style>{`
        .ll-navbar {
          background: ${scrolled ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.92)"};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid ${scrolled ? "rgba(26,39,68,0.08)" : "transparent"};
          box-shadow: ${scrolled ? "0 4px 24px rgba(26,39,68,0.10)" : "none"};
          transition: all 0.35s cubic-bezier(0.4,0,0.2,1);
          padding: 12px 0;
        }
        .ll-brand { font-family: 'Playfair Display', serif; font-size: 1.5rem; font-weight: 800; color: #1a2744; letter-spacing: -0.3px; text-decoration: none; display: flex; align-items: center; gap: 8px; transition: all 0.25s ease; }
        .ll-brand:hover { color: #c9a84c; text-decoration: none; }
        .ll-brand .brand-dot { width: 6px; height: 6px; border-radius: 50%; background: #c9a84c; display: inline-block; margin-left: 2px; margin-bottom: 14px; }
        .ll-nav-link { font-family: 'Inter', sans-serif; font-size: 0.875rem; font-weight: 500; color: #374151; text-decoration: none; padding: 6px 4px; position: relative; transition: color 0.25s ease; }
        .ll-nav-link::after { content: ''; position: absolute; bottom: 0; left: 0; width: 0; height: 2px; background: #c9a84c; border-radius: 1px; transition: width 0.25s ease; }
        .ll-nav-link:hover { color: #1a2744; text-decoration: none; }
        .ll-nav-link:hover::after { width: 100%; }
        .btn-dashboard { background: linear-gradient(135deg, #16a34a, #22c55e); color: white; border: none; border-radius: 50px; padding: 8px 20px; font-family: 'Inter', sans-serif; font-size: 0.84rem; font-weight: 600; cursor: pointer; transition: all 0.25s ease; box-shadow: 0 2px 8px rgba(22,163,74,0.3); }
        .btn-dashboard:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(22,163,74,0.35); }
        .btn-profile-nav { color: #1a2744; border: 1.5px solid rgba(26,39,68,0.2); border-radius: 50px; padding: 6px 18px; font-family: 'Inter', sans-serif; font-size: 0.84rem; font-weight: 600; transition: all 0.25s ease; background: transparent; text-decoration: none; display: inline-block; }
        .btn-profile-nav:hover { background: #1a2744; color: white; border-color: #1a2744; text-decoration: none; }
        .btn-logout-nav { background: #1a2744; color: white; border: none; border-radius: 50px; padding: 7px 18px; font-family: 'Inter', sans-serif; font-size: 0.84rem; font-weight: 600; cursor: pointer; transition: all 0.25s ease; }
        .btn-logout-nav:hover { background: #111b33; box-shadow: 0 4px 12px rgba(26,39,68,0.25); transform: translateY(-1px); }
        .btn-login-nav { background: linear-gradient(135deg, #1a2744, #243460); color: white; border: none; border-radius: 50px; padding: 8px 22px; font-family: 'Inter', sans-serif; font-size: 0.84rem; font-weight: 600; cursor: pointer; transition: all 0.25s ease; text-decoration: none; display: inline-block; }
        .btn-login-nav:hover { color: #c9a84c; box-shadow: 0 4px 14px rgba(26,39,68,0.3); transform: translateY(-1px); text-decoration: none; }
        .navbar-toggler:focus { box-shadow: none; }

        /* Notification Bell */
        .nb-wrapper { position: relative; }
        .nb-btn { background: none; border: 1.5px solid rgba(26,39,68,0.15); border-radius: 50%; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; font-size: 1rem; position: relative; }
        .nb-btn:hover { background: #f0f4ff; border-color: #1a2744; }
        .nb-badge { position: absolute; top: -4px; right: -4px; background: #dc2626; color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 0.63rem; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid white; animation: badgePop 0.3s ease; }
        @keyframes badgePop { from{transform:scale(0)} to{transform:scale(1)} }
        .nb-dropdown {
          position: absolute; right: 0; top: calc(100% + 12px);
          width: 340px; background: white; border-radius: 18px;
          box-shadow: 0 16px 48px rgba(26,39,68,0.18); border: 1px solid rgba(26,39,68,0.06);
          z-index: 9999; overflow: hidden; animation: dropDown 0.2s ease;
        }
        @keyframes dropDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .nb-header { padding: 16px 18px 12px; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center; }
        .nb-title { font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700; color: #1a2744; margin: 0; }
        .nb-mark-btn { background: none; border: none; font-size: 0.75rem; color: #4f46e5; font-weight: 600; cursor: pointer; padding: 0; }
        .nb-mark-btn:hover { text-decoration: underline; }
        .nb-list { max-height: 340px; overflow-y: auto; }
        .nb-list::-webkit-scrollbar { width: 3px; }
        .nb-list::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 2px; }
        .nb-item { padding: 12px 18px; border-bottom: 1px solid #f9fafb; cursor: pointer; transition: background 0.15s; display: flex; gap: 10px; align-items: flex-start; }
        .nb-item:hover { background: #fafafa; }
        .nb-item.unread { background: #f0f4ff; }
        .nb-item.unread:hover { background: #eef2ff; }
        .nb-icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 1px; }
        .nb-item-title { font-size: 0.82rem; font-weight: 600; color: #1a2744; margin-bottom: 2px; }
        .nb-item-body { font-size: 0.77rem; color: #6b7280; line-height: 1.4; }
        .nb-item-time { font-size: 0.7rem; color: #9ca3af; margin-top: 2px; }
        .nb-empty { padding: 40px 20px; text-align: center; color: #9ca3af; font-size: 0.85rem; }
        .nb-footer { padding: 12px; border-top: 1px solid #f3f4f6; text-align: center; }
        .nb-footer-btn { font-size: 0.78rem; color: #4f46e5; font-weight: 600; cursor: pointer; background: none; border: none; }
        .nb-footer-btn:hover { text-decoration: underline; }

        @media (max-width: 991px) {
          .ll-navbar .navbar-collapse { background: white; border-radius: 16px; padding: 16px; margin-top: 12px; box-shadow: 0 8px 30px rgba(26,39,68,0.12); }
          .ll-navbar .nav-item { margin: 4px 0; }
          .nb-dropdown { right: -60px; width: 300px; }
        }
      `}</style>

      <nav className="ll-navbar sticky-top navbar navbar-expand-lg">
        <div className="container">
          {/* Brand */}
          <Link className="ll-brand" to="/" onClick={closeMenu}>
            ⚖️ LawyerLink<span className="brand-dot" />
          </Link>

          {/* Mobile Toggle */}
          <button className="navbar-toggler border-0" type="button" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle navigation">
            <span className="navbar-toggler-icon" />
          </button>

          {/* Nav Items */}
          <div className={`collapse navbar-collapse justify-content-end ${isMenuOpen ? "show" : ""}`}>
            <ul className="navbar-nav align-items-lg-center gap-lg-3">
              <li className="nav-item"><Link className="ll-nav-link" to="/about" onClick={closeMenu}>About</Link></li>
              <li className="nav-item"><Link className="ll-nav-link" to="/contact" onClick={closeMenu}>Contact</Link></li>
              <li className="nav-item"><Link className="ll-nav-link" to="/terms" onClick={closeMenu}>T&C</Link></li>
              <li className="nav-item"><Link className="ll-nav-link" to="/privacy" onClick={closeMenu}>Privacy</Link></li>
              {role !== "lawyer" && (
                <li className="nav-item"><Link className="ll-nav-link" to="/catalog" onClick={closeMenu}>Lawyers</Link></li>
              )}
              <li className="nav-item"><Link className="ll-nav-link" to="/chatbot" onClick={closeMenu}>AI Chatbot</Link></li>
              {role === "litigant" && (
                <li className="nav-item"><Link className="ll-nav-link" to="/smart-match" onClick={closeMenu}>🤖 AI Match</Link></li>
              )}
              {(role === "lawyer" || role === "litigant") && (
                <li className="nav-item"><Link className="ll-nav-link" to="/calendar" onClick={closeMenu}>📅 Calendar</Link></li>
              )}
              {(role === "lawyer" || role === "litigant") && (
                <li className="nav-item"><Link className="ll-nav-link" to="/document-analyzer" onClick={closeMenu}>📄 Doc Analyzer</Link></li>
              )}
              {role === "admin" && (
                <li className="nav-item"><Link className="ll-nav-link" to="/admin" onClick={closeMenu}>⚙️ Admin</Link></li>
              )}

              {user && (role === "lawyer" || role === "litigant") && (
                <li className="nav-item">
                  <button className="btn-dashboard" onClick={handleDashboardClick}>Dashboard</button>
                </li>
              )}

              {/* 🔔 Notification Bell */}
              {user && (
                <li className="nav-item">
                  <div className="nb-wrapper">
                    <button className="nb-btn" onClick={() => { setShowBell(v => !v); if (!showBell) markAllRead(); }}>
                      🔔
                      {unreadCount > 0 && (
                        <span className="nb-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
                      )}
                    </button>
                    {showBell && (
                      <div className="nb-dropdown">
                        <div className="nb-header">
                          <p className="nb-title">Notifications</p>
                          {unreadCount > 0 && (
                            <button className="nb-mark-btn" onClick={markAllRead}>Mark all read</button>
                          )}
                        </div>
                        <div className="nb-list">
                          {notifications.length === 0 ? (
                            <div className="nb-empty">🔔<br />No notifications yet</div>
                          ) : (
                            notifications.map(n => (
                              <div key={n.id} className={`nb-item ${!n.read ? "unread" : ""}`}
                                onClick={() => { setShowBell(false); if (n.caseId) navigate(role === "lawyer" ? `/case/${n.caseId}` : `/litigant/case/${n.caseId}`); }}>
                                <span className="nb-icon">{getNotifIcon(n.type)}</span>
                                <div>
                                  <p className="nb-item-title">{n.title}</p>
                                  <p className="nb-item-body">{n.body}</p>
                                  <p className="nb-item-time">
                                    {n.timestamp?.toDate ? n.timestamp.toDate().toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Just now"}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="nb-footer">
                          <button className="nb-footer-btn" onClick={() => setShowBell(false)}>Close</button>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              )}

              {user ? (
                <>
                  <li className="nav-item">
                    <Link className="btn-profile-nav" to="/profile" onClick={closeMenu}>Profile</Link>
                  </li>
                  <li className="nav-item mt-2 mt-lg-0">
                    <button className="btn-logout-nav" onClick={handleLogout}>Logout</button>
                  </li>
                </>
              ) : (
                <li className="nav-item mt-2 mt-lg-0">
                  <Link className="btn-login-nav" to="/login" onClick={closeMenu}>Login / Signup</Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {/* Close bell on outside click */}
      {showBell && <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setShowBell(false)} />}
    </>
  );
}
