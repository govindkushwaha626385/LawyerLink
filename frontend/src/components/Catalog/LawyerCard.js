// src/components/Catalog/LawyerCard.js
import React from "react";

export default function LawyerCard({ lawyer }) {
  return (
    <div className="card card-lawyer h-100">
      <div className="card-body d-flex flex-column">
        <div className="d-flex align-items-center mb-3">
          <img
            src={lawyer.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%231a2744'/%3E%3Ccircle cx='32' cy='24' r='12' fill='%23c9a84c'/%3E%3Cellipse cx='32' cy='52' rx='18' ry='12' fill='%23c9a84c'/%3E%3C/svg%3E"}
            alt="lawyer"
            className="rounded-circle me-3"
            width="64" height="64"
            style={{ objectFit: "cover" }}
          />
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
