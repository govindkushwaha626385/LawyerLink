const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Simple backend health check
app.get("/", (req, res) => {
  res.json({ message: "LawyerLink backend is running 🚀" });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
