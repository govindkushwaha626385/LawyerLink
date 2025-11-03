import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavbarComp from "./components/Navbar";
import Footer from "./components/Footer";
import ChooseUserType from "./components/ChooseUserType";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";
import LawyersCatalog from "./components/Catalog/LawyersCatalog";
import ProfilePage from "./components/Profile/ProfilePage";
import AddCase from "./components/Cases/AddCase";
import CaseDetails from "./components/Cases/CaseDetails";
import Chatbot from "./components/Chatbot/Chatbot";
import About from "./components/Static/About";
import Contact from "./components/Static/Contact";
import MyCases from "./components/Cases/MyCases";

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <NavbarComp />
        <div className="content">
          <Routes>
            <Route path="/" element={<ChooseUserType />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/catalog" element={<LawyersCatalog />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/my-cases" element={<MyCases />} />
            <Route path="/add-case" element={<AddCase />} />
            <Route path="/case/:id" element={<CaseDetails />} />
            <Route path="/chatbot" element={<Chatbot />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
