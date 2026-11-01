const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/roleCheck");

router.get("/patient", authenticate, requireRole(["PATIENT"]), dashboardController.getPatientDashboard);
router.get("/doctor", authenticate, requireRole(["DOCTOR"]), dashboardController.getDoctorDashboard);
router.get("/admin", authenticate, requireRole(["ADMIN"]), dashboardController.getAdminDashboard);
router.get("/blockchain-explorer", dashboardController.getBlockchainExplorerData);

module.exports = router;
