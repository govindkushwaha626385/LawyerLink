import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles.css";
import 'bootstrap/dist/js/bootstrap.bundle.min.js';


const root = createRoot(document.getElementById("root"));
root.render(<App />);
