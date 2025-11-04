import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import "./Profile.css";

export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  // Fetch user profile
 useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    console.log("Auth user:", user);
    if (user) {
      const docRef = doc(db, "users", user.uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        console.log("User data:", snap.data());
        setUserData(snap.data());
        setForm(snap.data());
      } else {
        console.log("No such document in Firestore!");
      }
    } else {
      console.log("User not logged in");
    }
    setLoading(false);
  });
  return () => unsubscribe();
}, []);


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleUpdate = async () => {
    try {
      const docRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(docRef, form);
      setUserData(form);
      setEditing(false);
      alert("Profile updated successfully ✅");
    } catch (err) {
      console.error(err);
      alert("Error updating profile ❌");
    }
  };

  if (loading) return <div className="text-center mt-5">Loading...</div>;
  if (!userData) return <div className="text-center mt-5">No user data found</div>;

  const isLawyer = userData.role === "lawyer";

  return (
    <div className="container mt-5 py-4">
      <div className="card shadow-lg border-0 rounded-4 profile-card mx-auto">
        <div className="card-body text-center">
          <img
            src={
              userData.image ||
              "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
            }
            alt="Profile"
            className="profile-avatar mb-3"
          />
          <h4 className="fw-bold text-primary mb-1">
            {userData.fullName || "Unnamed User"}
          </h4>
          <p className="text-muted mb-3">
            Role: {userData.role?.toUpperCase() || "N/A"}
          </p>

          {editing ? (
            <>
              <div className="row g-3 text-start">
                <div className="col-md-6">
                  <label className="form-label">Full Name</label>
                  <input
                    name="fullName"
                    value={form.fullName || ""}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input
                    name="email"
                    value={form.email || ""}
                    className="form-control"
                    disabled
                  />
                </div>

                {isLawyer && (
                  <>
                    <div className="col-md-6">
                      <label className="form-label">Phone Number</label>
                      <input
                        name="phone"
                        value={form.phone || ""}
                        onChange={handleChange}
                        className="form-control"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Address</label>
                      <input
                        name="address"
                        value={form.address || ""}
                        onChange={handleChange}
                        className="form-control"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Experience (years)</label>
                      <input
                        type="number"
                        name="experience"
                        value={form.experience || ""}
                        onChange={handleChange}
                        className="form-control"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Category</label>
                      <input
                        name="category"
                        value={form.category || ""}
                        onChange={handleChange}
                        className="form-control"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Advocate Number</label>
                      <input
                        name="advocateNumber"
                        value={form.advocateNumber || ""}
                        onChange={handleChange}
                        className="form-control"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4">
                <button className="btn btn-success me-2" onClick={handleUpdate}>
                  💾 Save
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mt-3 text-start mx-auto" style={{ maxWidth: 500 }}>
                <p><strong>Email:</strong> {userData.email}</p>
                {isLawyer && (
                  <>
                    <p><strong>Phone:</strong> {userData.phone || "N/A"}</p>
                    <p><strong>Address:</strong> {userData.address || "N/A"}</p>
                    <p><strong>Experience:</strong> {userData.experience || "N/A"} yrs</p>
                    <p><strong>Category:</strong> {userData.category || "N/A"}</p>
                    <p><strong>Advocate Number:</strong> {userData.advocateNumber || "N/A"}</p>
                  </>
                )}
              </div>

              <button
                className="btn btn-primary mt-3"
                onClick={() => setEditing(true)}
              >
                ✏️ Edit Profile
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
