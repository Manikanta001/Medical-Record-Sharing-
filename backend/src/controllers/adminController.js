const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { logSecurityEvent } = require("../services/auditService");

/**
 * Get pending doctor accounts awaiting verification
 */
async function getPendingDoctors(req, res) {
  try {
    const pendingDoctors = await User.find({
      role: "DOCTOR",
      verificationStatus: "PENDING",
    }).sort({ createdAt: -1 });

    return res.json({ success: true, count: pendingDoctors.length, doctors: pendingDoctors });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Verify or Reject doctor account
 */
async function verifyDoctor(req, res) {
  try {
    const { doctorId } = req.params;
    const { action, notes } = req.body; // action: 'APPROVE' or 'REJECT'

    const doctor = await User.findOne({ _id: doctorId, role: "DOCTOR" });
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor account not found." });
    }

    if (action === "APPROVE") {
      doctor.isVerified = true;
      doctor.verificationStatus = "APPROVED";
      doctor.verificationNotes = notes || "Verified by System Administrator after credential review.";
    } else if (action === "REJECT") {
      doctor.isVerified = false;
      doctor.verificationStatus = "REJECTED";
      doctor.verificationNotes = notes || "Application rejected due to invalid medical license details.";
    } else {
      return res.status(400).json({ success: false, message: "Invalid action. Use 'APPROVE' or 'REJECT'." });
    }

    await doctor.save();

    await logSecurityEvent({
      actor: req.user,
      action: action === "APPROVE" ? "VERIFY_DOCTOR" : "REJECT_DOCTOR",
      details: `Administrator ${action.toLowerCase()}d doctor ${doctor.fullName} (${doctor.email}). License: ${doctor.doctorProfile?.licenseNumber}`,
      ipAddress: req.ip,
      status: "SUCCESS",
    });

    return res.json({
      success: true,
      message: `Doctor account has been ${action === "APPROVE" ? "approved and verified" : "rejected"}.`,
      doctor,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Get all users with search and role filter
 */
async function getAllUsers(req, res) {
  try {
    const { role, status } = req.query;
    const query = {};
    if (role) query.role = role.toUpperCase();
    if (status) query.status = status.toUpperCase();

    const users = await User.find(query).sort({ createdAt: -1 });
    return res.json({ success: true, count: users.length, users });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Suspend or activate a user account
 */
async function toggleUserStatus(req, res) {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.role === "ADMIN") {
      return res.status(400).json({ success: false, message: "Cannot suspend administrator account." });
    }

    user.status = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    await user.save();

    await logSecurityEvent({
      actor: req.user,
      action: "SUSPEND_USER",
      details: `Admin changed user ${user.email} status to ${user.status}`,
      ipAddress: req.ip,
      status: "SUCCESS",
    });

    return res.json({
      success: true,
      message: `User status changed to ${user.status}.`,
      user,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Get security audit logs
 */
async function getAuditLogs(req, res) {
  try {
    const { action, limit = 50, page = 1 } = req.query;
    const query = {};
    if (action) query.action = action;

    const skip = (Number(page) - 1) * Number(limit);
    const logs = await AuditLog.find(query)
      .populate("actor", "fullName email role")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await AuditLog.countDocuments(query);

    return res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      logs,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getPendingDoctors,
  verifyDoctor,
  getAllUsers,
  toggleUserStatus,
  getAuditLogs,
};
