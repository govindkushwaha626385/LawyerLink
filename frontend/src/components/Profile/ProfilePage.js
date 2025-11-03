// src/components/Profile/ProfilePage.js
import React, { useEffect, useState } from "react";
import { auth, db, storage } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const d = await getDoc(doc(db, "users", user.uid));
      if (d.exists()) {
        setUserData(d.data());
        setName(d.data().displayName || "");
        setPhone(d.data().phone || "");
      }
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return alert("Not logged in");
    await updateDoc(doc(db, "users", user.uid), { displayName: name, phone });
    alert("Profile updated");
  };

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const refStorage = ref(storage, `avatars/${user.uid}`);
    await uploadBytes(refStorage, file);
    const url = await getDownloadURL(refStorage);
    await updateDoc(doc(db, "users", user.uid), { image: url });
    setUserData(prev => ({ ...prev, image: url }));
  };

  if (!userData) return <div className="container mt-4">Loading...</div>;

  return (
    <div className="container mt-4 col-md-6">
      <h4>My Profile</h4>
      <div className="mb-2">
        <img src={userData.image || "https://via.placeholder.com/120"} alt="avatar" width="120" className="rounded-circle" />
      </div>
      <input type="file" className="form-control mb-2" onChange={handleImage} />
      <input className="form-control mb-2" value={name} onChange={e => setName(e.target.value)} />
      <input className="form-control mb-2" value={phone} onChange={e => setPhone(e.target.value)} />
      <button className="btn btn-primary" onClick={handleSave}>Save</button>
    </div>
  );
}
