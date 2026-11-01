const express = require("express");
const router = express.Router();
const accessController = require("../controllers/accessController");
const { authenticate } = require("../middleware/auth");
const { requireRole, requireVerifiedDoctor } = require("../middleware/roleCheck");

// Doctor requests access
router.post(
  "/requests",
  authenticate,
  requireRole(["DOCTOR"]),
  requireVerifiedDoctor,
  accessController.requestAccess
);

// Doctor views their submitted requests
router.get(
  "/requests/doctor",
  authenticate,
  requireRole(["DOCTOR"]),
  accessController.getDoctorRequests
);

// Patient views incoming requests
router.get(
  "/requests/patient",
  authenticate,
  requireRole(["PATIENT"]),
  accessController.getPatientRequests
);

// Patient approves request
router.post(
  "/requests/:requestId/approve",
  authenticate,
  requireRole(["PATIENT"]),
  accessController.approveRequest
);

// Patient rejects request
router.post(
  "/requests/:requestId/reject",
  authenticate,
  requireRole(["PATIENT"]),
  accessController.rejectRequest
);

// Patient revokes permission immediately
router.post(
  "/permissions/:permissionId/revoke",
  authenticate,
  requireRole(["PATIENT"]),
  accessController.revokePermission
);

// Patient views all granted permissions
router.get(
  "/permissions",
  authenticate,
  requireRole(["PATIENT"]),
  accessController.getMyPermissions
);

module.exports = router;
