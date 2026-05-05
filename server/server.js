const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "server",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  // Keep startup log simple for local development.
  console.log(`Server running on http://localhost:${PORT}`);
});
