// src/components/Cases/AddCase.js
import React, { useState } from "react";
import { db, auth } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function AddCase() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const nav = useNavigate();

  const handleAdd = async () => {
    const owner = auth.currentUser;
    if (!owner) return alert("Login first");
    await addDoc(collection(db, "cases"), {
      title, description, ownerId: owner.uid, createdAt: new Date().toISOString(), status: "Active"
    });
    alert("Case added");
    nav("/my-cases");
  };

  return (
    <div className="container mt-4 col-md-6">
      <h3>Add Case</h3>
      <input className="form-control mb-2" placeholder="Case Title" value={title} onChange={e=>setTitle(e.target.value)} />
      <textarea className="form-control mb-2" placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)} />
      <button className="btn btn-success" onClick={handleAdd}>Add Case</button>
    </div>
  );
}
