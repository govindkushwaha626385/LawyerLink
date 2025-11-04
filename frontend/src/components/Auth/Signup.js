import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lawyerInfo, setLawyerInfo] = useState({
    fullName: "",
    phone: "",
    address: "",
    experience: "",
    category: "",
    advocateNumber: "",
  });

  const location = useLocation();
  const navigate = useNavigate();
  const role = new URLSearchParams(location.search).get("role") || "litigant";

  const handleChange = (e) => {
    setLawyerInfo({ ...lawyerInfo, [e.target.name]: e.target.value });
  };

  const handleSignup = async () => {
  try {
    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    // Create Firebase Auth user
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    // Common user fields
    const userData = {
      uid: user.uid,
      email,
      role,
      fullName: lawyerInfo.fullName || "",
      phone: lawyerInfo.phone || "",
      address: lawyerInfo.address || "",
      experience: lawyerInfo.experience || "",
      category: lawyerInfo.category || "",
      advocateNumber: lawyerInfo.advocateNumber || "",
      image: "",
      createdAt: new Date().toISOString(),
    };

    // Add lawyer-specific extra fields
    if (role === "lawyer") {
      userData.casesHandled = 0;
      userData.rating = 0;
    }

    // Save user data in Firestore under users/{uid}
    await setDoc(doc(db, "users", user.uid), userData);

    alert("Signup successful ✅");
    navigate(role === "lawyer" ? "/lawyer" : "/litigant");
  } catch (e) {
    console.error("Signup error:", e);
    alert("Error: " + e.message);
  }
};

  return (
    <div className="container d-flex align-items-center justify-content-center min-vh-100">
      <div className="card shadow-lg border-0 rounded-4 p-4 p-md-5 w-100" style={{ maxWidth: "500px" }}>
        <h3 className="text-center mb-4 fw-bold text-primary">
          Signup as {role.charAt(0).toUpperCase() + role.slice(1)}
        </h3>

        <div className="mb-3">
          <label className="form-label fw-semibold">Email</label>
          <input
            type="email"
            className="form-control rounded-3"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">Password</label>
          <input
            type="password"
            className="form-control rounded-3"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Show extra fields only for lawyers */}
        {role === "lawyer" && (
          <>
            <div className="mb-3">
              <label className="form-label fw-semibold">Full Name</label>
              <input
                type="text"
                className="form-control rounded-3"
                placeholder="John Doe"
                name="fullName"
                value={lawyerInfo.fullName}
                onChange={handleChange}
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Phone Number</label>
              <input
                type="tel"
                className="form-control rounded-3"
                placeholder="+91 9876543210"
                name="phone"
                value={lawyerInfo.phone}
                onChange={handleChange}
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Address</label>
              <textarea
                className="form-control rounded-3"
                placeholder="Enter your full office address"
                rows="2"
                name="address"
                value={lawyerInfo.address}
                onChange={handleChange}
              ></textarea>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Years of Experience</label>
              <input
                type="number"
                className="form-control rounded-3"
                placeholder="e.g., 5"
                name="experience"
                value={lawyerInfo.experience}
                onChange={handleChange}
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Specialization / Category</label>
              <select
                className="form-select rounded-3"
                name="category"
                value={lawyerInfo.category}
                onChange={handleChange}
              >
                <option value="">Select category</option>
                <option value="Criminal Law">Criminal Law</option>
                <option value="Civil Law">Civil Law</option>
                <option value="Corporate Law">Corporate Law</option>
                <option value="Family Law">Family Law</option>
                <option value="Property Law">Property Law</option>
                <option value="Cyber Law">Cyber Law</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold">Advocate Registration Number</label>
              <input
                type="text"
                className="form-control rounded-3"
                placeholder="e.g., A12345XYZ"
                name="advocateNumber"
                value={lawyerInfo.advocateNumber}
                onChange={handleChange}
              />
            </div>
          </>
        )}

        <button className="btn btn-primary w-100 rounded-3 py-2 fw-semibold" onClick={handleSignup}>
          Signup
        </button>

        <p className="text-center mt-3 text-muted">
          Already have an account?{" "}
          <a href={`/login?role=${role}`} className="text-decoration-none fw-semibold">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
