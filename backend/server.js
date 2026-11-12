
const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

const connectDB = require("./config/db");
const apiRoutes = require("./routes/apiRoutes");

const app = express();
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be configured in production");
  }
  process.env.JWT_SECRET = crypto.randomBytes(32).toString("hex");
  console.warn("JWT_SECRET is not set; using a temporary development secret.");
}

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || true,
}));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is working",
  });
});

app.use("/api", apiRoutes);

const frontendBuildPath = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(frontendBuildPath));
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendBuildPath, "index.html"), (error) => {
    if (error) res.send("Digital Notice Board API is running. Start the frontend dev server to view the website.");
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ message: "Invalid record ID" });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: "A record with that value already exists" });
  }
  console.error("API request failed:", error.message);
  return res.status(500).json({ message: "An unexpected server error occurred" });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
