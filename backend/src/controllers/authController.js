const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { generateToken } = require("../middleware/auth");
const { logSecurityEvent } = require("../services/auditService");

/**
 * Register Patient
 */
async function registerPatient(req, res) {
  try {
    const { email, password, fullName, phone, bloodGroup, dateOfBirth, gender, emergencyContact, walletAddress } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ success: false, message: "Email, password, and full name are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: "An account with this email already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      fullName: fullName.trim(),
      phone: phone || "",
      role: "PATIENT",
      isVerified: true,
      verificationStatus: "NOT_APPLICABLE",
      walletAddress: walletAddress ? walletAddress.toLowerCase().trim() : "",
      patientProfile: {
        patientIdNumber: `PAT-${Date.now().toString().slice(-6)}`,
        bloodGroup: bloodGroup || "",
        dateOfBirth: dateOfBirth || "",
        gender: gender || "",
        emergencyContact: emergencyContact || "",
      },
    });

    const token = generateToken(user);

    await logSecurityEvent({
      actor: user,
      action: "REGISTER",
      details: "Patient registered successfully",
      ipAddress: req.ip,
      status: "SUCCESS",
    });

    return res.status(201).json({
      success: true,
      message: "Patient registered successfully.",
      token,
      user,
    });
  } catch (err) {
    console.error("Register Patient Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Register Doctor (Pending verification)
 */
async function registerDoctor(req, res) {
  try {
    const {
      email,
      password,
      fullName,
      phone,
      licenseNumber,
      specialization,
      hospitalAffiliation,
      yearsOfExperience,
      medicalDegree,
      walletAddress,
    } = req.body;

    if (!email || !password || !fullName || !licenseNumber || !specialization) {
      return res.status(400).json({
        success: false,
        message: "Email, password, full name, license number, and specialization are required.",
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: "An account with this email already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      fullName: fullName.trim(),
      phone: phone || "",
      role: "DOCTOR",
      isVerified: false,
      verificationStatus: "PENDING",
      walletAddress: walletAddress ? walletAddress.toLowerCase().trim() : "",
      doctorProfile: {
        licenseNumber: licenseNumber.trim(),
        specialization: specialization.trim(),
        hospitalAffiliation: hospitalAffiliation || "General Medical Center",
        yearsOfExperience: Number(yearsOfExperience) || 1,
        medicalDegree: medicalDegree || "MBBS, MD",
      },
    });

    const token = generateToken(user);

    await logSecurityEvent({
      actor: user,
      action: "REGISTER",
      details: `Doctor registration submitted (License: ${licenseNumber}). Pending admin verification.`,
      ipAddress: req.ip,
      status: "SUCCESS",
    });

    return res.status(201).json({
      success: true,
      message:
        "Doctor registered successfully. Account is currently pending administrative verification.",
      token,
      user,
    });
  } catch (err) {
    console.error("Register Doctor Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Login User
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      await logSecurityEvent({
        actorEmail: email,
        action: "LOGIN",
        details: "Failed login attempt: user not found",
        ipAddress: req.ip,
        status: "DENIED",
      });
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logSecurityEvent({
        actor: user,
        action: "LOGIN",
        details: "Failed login attempt: incorrect password",
        ipAddress: req.ip,
        status: "DENIED",
      });
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (user.status === "SUSPENDED") {
      await logSecurityEvent({
        actor: user,
        action: "LOGIN",
        details: "Login denied: account is suspended",
        ipAddress: req.ip,
        status: "DENIED",
      });
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended by the administrator.",
      });
    }

    const token = generateToken(user);

    await logSecurityEvent({
      actor: user,
      action: "LOGIN",
      details: `User logged in as ${user.role}`,
      ipAddress: req.ip,
      status: "SUCCESS",
    });

    return res.json({
      success: true,
      message: "Login successful.",
      token,
      user,
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Get current authenticated user
 */
async function getMe(req, res) {
  return res.json({
    success: true,
    user: req.user,
  });
}

/**
 * Link MetaMask Wallet Address
 */
async function linkWallet(req, res) {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress || !walletAddress.startsWith("0x")) {
      return res.status(400).json({ success: false, message: "Valid Ethereum wallet address required." });
    }

    req.user.walletAddress = walletAddress.toLowerCase().trim();
    await req.user.save();

    await logSecurityEvent({
      actor: req.user,
      action: "LINK_WALLET",
      details: `Linked Ethereum wallet: ${req.user.walletAddress}`,
      ipAddress: req.ip,
      status: "SUCCESS",
    });

    return res.json({
      success: true,
      message: "Wallet address successfully linked to your account.",
      walletAddress: req.user.walletAddress,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  registerPatient,
  registerDoctor,
  login,
  getMe,
  linkWallet,
};
