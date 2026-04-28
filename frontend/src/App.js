import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebase";

// --- Layout Components ---
import NavbarComp from "./components/Navbar";
import Footer from "./components/Footer";

// --- Auth & Common Pages ---
import ChooseUserType from "./components/ChooseUserType";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";
import ProfilePage from "./components/Profile/ProfilePage";

// --- Lawyer Pages ---
import LawyersCatalog from "./components/Catalog/LawyersCatalog";
import LawyerDashboard from "./components/Lawyer/LawyerDashboard";
import MyCases from "./components/Lawyer/MyCases";
import CaseDetails from "./components/Lawyer/CaseDetails";
import AddCaseModal from "./components/Lawyer/AddCaseModal";
import LinkCase from "./pages/LinkCase";

// --- Litigant Pages ---
import LitigantDashboard from "./pages/LitigantDashboard";
import LitigantCaseDetails from "./pages/LitigantCaseDetails";

// --- Other Features ---
import Chatbot from "./components/Chatbot/Chatbot";
import ChatbotWidget from "./components/Chatbot/ChatbotWidget";
import About from "./components/Static/About";
import Contact from "./components/Static/Contact";
import SmartMatch from "./pages/SmartMatch";
import AdminPanel from "./pages/AdminPanel";

// --- Scroll to Top Component ---
function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// --- Protected Route Wrapper ---
const ProtectedRoute = ({ children }) => {
  const [user, loading] = useAuthState(auth);
  if (loading) return <div className="text-center mt-5">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
};

// --- Admin Route Wrapper (only specific emails allowed) ---
const ADMIN_EMAILS = ["govindkushwahabusiness@gmail.com"]; // ← add admin emails here
const AdminRoute = ({ children }) => {
  const [user, loading] = useAuthState(auth);
  if (loading) return <div className="text-center mt-5">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!ADMIN_EMAILS.includes(user.email)) return <Navigate to="/" replace />;
  return children;
};

// --- Main App Component ---
function AppLayout() {
  const [user] = useAuthState(auth);
  const location = useLocation();
  const isAdmin = location.pathname === "/admin";

  return (
    <div className="app-container d-flex flex-column min-vh-100">
      {!isAdmin && <NavbarComp />}
      <main className="flex-grow-1" style={{ minHeight: 0 }}>
        <Routes>
          {/* --- Public Routes --- */}
          <Route path="/" element={<ChooseUserType />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/catalog" element={<LawyersCatalog />} />
          <Route path="/chatbot" element={<Chatbot />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />

          {/* --- Protected Routes --- */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lawyer"
            element={
              <ProtectedRoute>
                <LawyerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/litigant"
            element={
              <ProtectedRoute user={user}>
                <LitigantDashboard user={user} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-cases"
            element={
              <ProtectedRoute>
                <MyCases />
              </ProtectedRoute>
            }
          />

          <Route
            path="/litigant/case/:id"
            element={<ProtectedRoute>
              <LitigantCaseDetails />
            </ProtectedRoute>}
          />

          <Route
            path="/case/:id"
            element={
              <ProtectedRoute>
                <CaseDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-case"
            element={
              <ProtectedRoute>
                <AddCaseModal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/link-case"
            element={
              <ProtectedRoute>
                <LinkCase user={user} />
              </ProtectedRoute>
            }
          />

          {/* --- New Feature Routes --- */}
          <Route path="/smart-match" element={<SmartMatch />} />
          <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />

          {/* --- Fallback --- */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isAdmin && <Footer className="mt-auto" />}
      {!isAdmin && <ChatbotWidget />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppLayout />
    </BrowserRouter>
  );
}
