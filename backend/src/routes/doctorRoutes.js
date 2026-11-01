const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctorController");
const { authenticate } = require("../middleware/auth");
const { requireRole, requireVerifiedDoctor } = require("../middleware/roleCheck");

// Directory of verified doctors (any authenticated user)
router.get("/directory", authenticate, doctorController.getVerifiedDoctors);

// Doctor searches patients
router.get(
  "/search-patients",
  authenticate,
  requireRole(["DOCTOR"]),
  requireVerifiedDoctor,
  doctorController.searchPatients
);

// Doctor views records authorized to them
router.get(
  "/authorized-records",
  authenticate,
  requireRole(["DOCTOR"]),
  requireVerifiedDoctor,
  doctorController.getAuthorizedRecords
);

// Consultations
router.post(
  "/consultations",
  authenticate,
  requireRole(["DOCTOR"]),
  requireVerifiedDoctor,
  doctorController.createConsultation
);

router.get("/consultations", authenticate, doctorController.getConsultations);

module.exports = router;
