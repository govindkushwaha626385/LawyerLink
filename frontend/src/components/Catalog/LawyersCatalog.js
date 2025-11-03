// src/components/Catalog/LawyersCatalog.js
import React, { useEffect, useState, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import "./LawyersCatalog.css";

export default function LawyersCatalog() {
  const [lawyers, setLawyers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");

  // Fetch all lawyers once
  useEffect(() => {
    const fetchLawyers = async () => {
      const snapshot = await getDocs(collection(db, "users"));
      const lawyerList = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((u) => u.role === "lawyer");
      setLawyers(lawyerList);
      setFiltered(lawyerList);
    };
    fetchLawyers();
  }, []);

  // ✅ UseCallback for clean dependency management
  const handleFilter = useCallback(() => {
    let result = lawyers;

    if (search.trim()) {
      result = result.filter((l) =>
        l.fullName?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (category) {
      result = result.filter((l) => l.category === category);
    }

    if (location.trim()) {
      result = result.filter((l) =>
        l.address?.toLowerCase().includes(location.toLowerCase())
      );
    }

    setFiltered(result);
  }, [lawyers, search, category, location]);

  // Apply filters when search/category/location change
  useEffect(() => {
    handleFilter();
  }, [handleFilter]);

  return (
    <div className="container py-5 mt-4">
      <h2 className="text-center mb-4 fw-bold text-primary">
        👩‍⚖️ Find the Right Lawyer for Your Case
      </h2>

      {/* --- Search & Filters --- */}
      <div className="card shadow-sm p-4 mb-4 border-0 rounded-4">
        <div className="row g-3 align-items-center">
          <div className="col-md-4 col-12">
            <input
              type="text"
              className="form-control rounded-3"
              placeholder="🔍 Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-md-4 col-12">
            <select
              className="form-select rounded-3"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="Criminal Law">Criminal Law</option>
              <option value="Civil Law">Civil Law</option>
              <option value="Corporate Law">Corporate Law</option>
              <option value="Family Law">Family Law</option>
              <option value="Property Law">Property Law</option>
              <option value="Cyber Law">Cyber Law</option>
            </select>
          </div>
          <div className="col-md-4 col-12">
            <input
              type="text"
              className="form-control rounded-3"
              placeholder="📍 Search by location..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* --- Lawyer Cards --- */}
      <div className="row g-4">
        {filtered.length > 0 ? (
          filtered.map((lawyer) => (
            <div key={lawyer.id} className="col-md-4 col-sm-6 col-12">
              <div className="card h-100 border-0 shadow-lg rounded-4 lawyer-card">
                <div className="card-body text-center p-4">
                  <img
                    src={
                      lawyer.image ||
                      "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                    }
                    alt={lawyer.fullName || "Lawyer"}
                    className="rounded-circle mb-3 border border-3 border-primary-subtle"
                    style={{ width: "100px", height: "100px", objectFit: "cover" }}
                  />
                  <h5 className="fw-bold text-dark mb-1">
                    {lawyer.fullName || "Unnamed Lawyer"}
                  </h5>
                  <p className="text-muted mb-1">
                    {lawyer.category || "General Practice"}
                  </p>
                  <p className="small text-secondary mb-1">
                    Experience: {lawyer.experience || 0} yrs
                  </p>
                  <p className="small text-secondary mb-3">
                    📍 {lawyer.address?.split(",")[0] || "Not specified"}
                  </p>

                  {/* Contact options */}
                  <div className="d-flex justify-content-center flex-wrap gap-2">
                    {lawyer.phone && (
                      <a
                        href={`tel:${lawyer.phone}`}
                        className="btn btn-outline-primary btn-sm rounded-3"
                      >
                        📞 Call
                      </a>
                    )}
                    <a
                      href={`mailto:${lawyer.email}`}
                      className="btn btn-outline-success btn-sm rounded-3"
                    >
                      ✉️ Email
                    </a>
                    {lawyer.phone && (
                      <a
                        href={`https://wa.me/${lawyer.phone.replace(
                          /[^0-9]/g,
                          ""
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline-success btn-sm rounded-3"
                      >
                        💬 WhatsApp
                      </a>
                    )}
                  </div>
                </div>

                <div className="card-footer bg-light border-0 text-center rounded-bottom-4">
                  <small className="text-muted">
                    Advocate ID: {lawyer.advocateNumber || "N/A"}
                  </small>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-muted mt-4">
            No lawyers found matching your filters.
          </p>
        )}
      </div>
    </div>
  );
}
