const express = require("express");
const router = express.Router();
const recordController = require("../controllers/recordController");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/roleCheck");
const upload = require("../middleware/upload");

// Upload encrypted medical record (Patient only)
router.post(
  "/",
  authenticate,
  requireRole(["PATIENT"]),
  upload.single("document"),
  recordController.uploadRecord
);

// Get my medical records (Patient)
router.get("/", authenticate, requireRole(["PATIENT"]), recordController.getMyRecords);

// Get record details (Owner or authorized doctor)
router.get("/:recordId", authenticate, recordController.getRecordById);

// Download and decrypt record (Owner or authorized doctor)
router.get("/:recordId/download", authenticate, recordController.downloadRecord);

module.exports = router;
