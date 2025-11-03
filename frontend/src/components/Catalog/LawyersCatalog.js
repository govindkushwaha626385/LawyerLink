// src/components/Catalog/LawyersCatalog.js
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import LawyerCard from "./LawyerCard";

export default function LawyersCatalog() {
  const [lawyers, setLawyers] = useState([]);

  useEffect(() => {
    (async () => {
      const q = query(collection(db, "users"), where("role", "==", "lawyer"));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLawyers(list);
    })();
  }, []);

  return (
    <div className="container mt-4">
      <h3>Lawyers Catalog</h3>
      <div className="row g-3 mt-2">
        {lawyers.map(l => (
          <div key={l.id} className="col-12 col-md-6 col-lg-4">
            <LawyerCard lawyer={l} />
          </div>
        ))}
      </div>
    </div>
  );
}
