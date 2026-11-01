require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const rateLimit = require("express-rate-limit");

const { connectDB } = require("./config/db");
const { initBlockchain } = require("./services/blockchainService");
const { seedDatabase } = require("./utils/seedData");

// Route imports
const authRoutes = require("./routes/authRoutes");
const recordRoutes = require("./routes/recordRoutes");
const accessRoutes = require("./routes/accessRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const adminRoutes = require("./routes/adminRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Disposition", "X-File-Integrity-SHA256", "X-IPFS-CID"],
  })
);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(morgan("dev"));

// Rate limiting on sensitive authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    message: "Too many authentication attempts from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth", authLimiter);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/access", accessRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/dashboard", dashboardRoutes);

// System Health & Info
app.get("/api/health", (req, res) => {
  res.json({
    status: "HEALTHY",
    service: "Blockchain Medical Record Sharing System API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Express Global Error:", err);

  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size exceeds the 15MB limit. Please upload a smaller medical report.",
      });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }

  return res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error occurred.",
  });
});

// Start Server
async function startServer() {
  try {
    console.log("==================================================");
    console.log(" Starting Blockchain Medical Record Sharing Backend");
    console.log("==================================================");

    await connectDB();
    await seedDatabase();
    await initBlockchain();

    app.listen(PORT, () => {
      console.log(`✓ REST API Server is running on: http://localhost:${PORT}`);
      console.log(`✓ API Healthcheck endpoint: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("Fatal Server Startup Error:", error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}

module.exports = app;
