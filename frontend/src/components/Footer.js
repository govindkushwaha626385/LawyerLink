// src/components/Footer.js
import React from "react";

export default function Footer() {
  return (
    <footer className="bg-white text-center py-3 mt-4 border-top">
      <div className="container">
        <small>© {new Date().getFullYear()} LawyerLink — Built with ❤️</small>
      </div>
    </footer>
  );
}
