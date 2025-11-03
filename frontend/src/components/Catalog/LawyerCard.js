// src/components/Catalog/LawyerCard.js
import React from "react";

export default function LawyerCard({ lawyer }) {
  return (
    <div className="card card-lawyer h-100">
      <div className="card-body d-flex flex-column">
        <div className="d-flex align-items-center mb-3">
          <img src={lawyer.image || "https://via.placeholder.com/64"} alt="lawyer" className="rounded-circle me-3" width="64" height="64" />
          <div>
            <h5 className="mb-0">{lawyer.displayName || "No Name"}</h5>
            <small className="text-muted">{lawyer.experience || "Experience not set"}</small>
          </div>
        </div>
        <p className="flex-grow-1">{lawyer.bio || "Bio not set"}</p>
        <div className="d-flex justify-content-between">
          <a className="btn btn-outline-primary btn-sm" href={`tel:${lawyer.phone || ""}`}>Call</a>
        </div>
      </div>
    </div>
  );
}
