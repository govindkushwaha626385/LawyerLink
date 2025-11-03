// src/components/Cases/MyCases.js
import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";

export default function MyCases() {
  const [cases, setCases] = useState([]);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const q = query(collection(db, "cases"), where("ownerId", "==", user.uid));
      const snap = await getDocs(q);
      setCases(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    })();
  }, [user]);

  return (
    <div className="container mt-4">
      <h3>My Cases</h3>
      {cases.length === 0 && <p>No cases yet.</p>}
      <ul className="list-group">
        {cases.map(c => (
          <li key={c.id} className="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <strong>{c.title}</strong>
              <div className="text-muted small">{c.status || "Pending"}</div>
            </div>
            <div>
              <Link to={`/case/${c.id}`} className="btn btn-outline-primary btn-sm">View</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
