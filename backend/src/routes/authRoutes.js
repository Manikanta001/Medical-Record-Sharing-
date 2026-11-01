const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

router.post("/register/patient", authController.registerPatient);
router.post("/register/doctor", authController.registerDoctor);
router.post("/login", authController.login);
router.get("/me", authenticate, authController.getMe);
router.post("/wallet", authenticate, authController.linkWallet);

module.exports = router;
