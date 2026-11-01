const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/roleCheck");

// Admin doctor verification
router.get(
  "/doctors/pending",
  authenticate,
  requireRole(["ADMIN"]),
  adminController.getPendingDoctors
);

router.post(
  "/doctors/:doctorId/verify",
  authenticate,
  requireRole(["ADMIN"]),
  adminController.verifyDoctor
);

// Admin user management
router.get(
  "/users",
  authenticate,
  requireRole(["ADMIN"]),
  adminController.getAllUsers
);

router.patch(
  "/users/:userId/status",
  authenticate,
  requireRole(["ADMIN"]),
  adminController.toggleUserStatus
);

// Security audit logs
router.get(
  "/audit-logs",
  authenticate,
  requireRole(["ADMIN"]),
  adminController.getAuditLogs
);

module.exports = router;
