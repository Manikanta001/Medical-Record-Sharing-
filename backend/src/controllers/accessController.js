const { v4: uuidv4 } = require("uuid");
const AccessRequest = require("../models/AccessRequest");
const RecordPermission = require("../models/RecordPermission");
const MedicalRecord = require("../models/MedicalRecord");
const User = require("../models/User");
const {
  grantAccessOnChain,
  revokeAccessOnChain,
} = require("../services/blockchainService");
const { logSecurityEvent } = require("../services/auditService");

/**
 * Doctor submits an Access Request for a patient's record
 */
async function requestAccess(req, res) {
  try {
    const { recordId, purpose, durationSeconds, durationHours } = req.body;

    if (!recordId || !purpose) {
      return res.status(400).json({
        success: false,
        message: "Record ID and clinical purpose are required.",
      });
    }

    // Verify doctor is approved
    if (!req.user.isVerified || req.user.verificationStatus !== "APPROVED") {
      return res.status(403).json({
        success: false,
        message: "Only verified doctors can request access to patient medical records.",
      });
    }

    const record = await MedicalRecord.findOne({ recordId }).populate("patient");
    if (!record) {
      return res.status(404).json({ success: false, message: "Medical record not found." });
    }

    // Check if an existing pending or active request already exists
    const existingPending = await AccessRequest.findOne({
      record: record._id,
      doctor: req.user._id,
      status: "PENDING",
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: "A pending access request already exists for this record.",
      });
    }

    const requestId = `REQ-${Date.now().toString().slice(-6)}-${uuidv4().substring(0, 4).toUpperCase()}`;
    const requestedDuration = Number(durationSeconds) || Number(durationHours) * 3600 || 86400;

    const accessRequest = await AccessRequest.create({
      requestId,
      record: record._id,
      patient: record.patient._id,
      doctor: req.user._id,
      purpose: purpose.trim(),
      requestedDurationSeconds: requestedDuration,
      status: "PENDING",
    });

    await logSecurityEvent({
      actor: req.user,
      action: "REQUEST_ACCESS",
      recordId,
      details: `Doctor ${req.user.fullName} requested access to record "${record.title}" for: ${purpose}`,
      ipAddress: req.ip,
      status: "SUCCESS",
    });

    return res.status(201).json({
      success: true,
      message: "Access request successfully submitted to the patient.",
      accessRequest,
    });
  } catch (err) {
    console.error("Request Access Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Get all requests submitted by the logged-in doctor
 */
async function getDoctorRequests(req, res) {
  try {
    const requests = await AccessRequest.find({ doctor: req.user._id })
      .populate("record", "recordId title category originalFileName createdAt")
      .populate("patient", "fullName email patientProfile")
      .sort({ createdAt: -1 });

    return res.json({ success: true, requests });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Get all requests received by the logged-in patient
 */
async function getPatientRequests(req, res) {
  try {
    const requests = await AccessRequest.find({ patient: req.user._id })
      .populate("record", "recordId title category")
      .populate("doctor", "fullName email doctorProfile walletAddress")
      .sort({ createdAt: -1 });

    return res.json({ success: true, requests });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Patient approves access request
 */
async function approveRequest(req, res) {
  try {
    const { requestId } = req.params;
    const { note, customDurationSeconds, durationHours } = req.body;

    const request = await AccessRequest.findOne({ requestId })
      .populate("record")
      .populate("doctor")
      .populate("patient");

    if (!request) {
      return res.status(404).json({ success: false, message: "Access request not found." });
    }

    if (request.patient._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized. You are not the owner of this record." });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({ success: false, message: `Request is already ${request.status}.` });
    }

    const duration = Number(customDurationSeconds) || Number(durationHours) * 3600 || request.requestedDurationSeconds || 86400;
    const validUntil = new Date(Date.now() + duration * 1000);

    // 1. Register permission on the Ethereum blockchain
    const blockchainResult = await grantAccessOnChain({
      recordId: request.record.recordId,
      doctorWallet: request.doctor.walletAddress || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      durationSeconds: duration,
      purpose: request.purpose,
    });

    // 2. Create or reactivate RecordPermission in MongoDB
    const permissionId = `PERM-${uuidv4().substring(0, 8).toUpperCase()}`;
    const permission = await RecordPermission.create({
      permissionId,
      record: request.record._id,
      patient: request.patient._id,
      doctor: request.doctor._id,
      accessRequest: request._id,
      isActive: true,
      grantedAt: new Date(),
      validUntil,
      purpose: request.purpose,
      blockchainTxHash: blockchainResult.txHash,
    });

    // 3. Update request status
    request.status = "APPROVED";
    request.patientResponseNote = note || "Access approved by patient";
    request.approvedAt = new Date();
    await request.save();

    // 4. Log audit event
    await logSecurityEvent({
      actor: req.user,
      action: "APPROVE_ACCESS",
      recordId: request.record.recordId,
      details: `Patient granted doctor ${request.doctor.fullName} access until ${validUntil.toISOString()}`,
      ipAddress: req.ip,
      blockchainTxHash: blockchainResult.txHash,
      status: "SUCCESS",
    });

    return res.json({
      success: true,
      message: `Access granted to Dr. ${request.doctor.fullName}. Valid until ${validUntil.toLocaleString()}.`,
      permission,
      blockchainTxHash: blockchainResult.txHash,
    });
  } catch (err) {
    console.error("Approve Request Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Patient rejects access request
 */
async function rejectRequest(req, res) {
  try {
    const { requestId } = req.params;
    const { note } = req.body;

    const request = await AccessRequest.findOne({ requestId })
      .populate("record")
      .populate("doctor");

    if (!request) {
      return res.status(404).json({ success: false, message: "Access request not found." });
    }

    if (request.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    request.status = "REJECTED";
    request.patientResponseNote = note || "Declined by patient";
    request.rejectedAt = new Date();
    await request.save();

    await logSecurityEvent({
      actor: req.user,
      action: "REJECT_ACCESS",
      recordId: request.record?.recordId,
      details: `Patient rejected access request from Dr. ${request.doctor.fullName}`,
      ipAddress: req.ip,
      status: "SUCCESS",
    });

    return res.json({
      success: true,
      message: "Access request rejected.",
      request,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Patient revokes access permission immediately
 */
async function revokePermission(req, res) {
  try {
    const { permissionId } = req.params;

    const permission = await RecordPermission.findOne({ permissionId })
      .populate("record")
      .populate("doctor");

    if (!permission) {
      return res.status(404).json({ success: false, message: "Permission not found." });
    }

    if (permission.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized. Only the record owner can revoke access." });
    }

    if (!permission.isActive) {
      return res.status(400).json({ success: false, message: "Permission is already inactive or revoked." });
    }

    // 1. Revoke on blockchain
    const blockchainResult = await revokeAccessOnChain({
      recordId: permission.record.recordId,
      doctorWallet: permission.doctor.walletAddress || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    });

    // 2. Mark revoked in database
    permission.isActive = false;
    permission.isRevoked = true;
    permission.revokedAt = new Date();
    permission.revocationTxHash = blockchainResult.txHash;
    await permission.save();

    // 3. Log audit event
    await logSecurityEvent({
      actor: req.user,
      action: "REVOKE_ACCESS",
      recordId: permission.record.recordId,
      details: `Patient immediately revoked record access from Dr. ${permission.doctor.fullName}`,
      ipAddress: req.ip,
      blockchainTxHash: blockchainResult.txHash,
      status: "SUCCESS",
    });

    return res.json({
      success: true,
      message: `Access revoked immediately for Dr. ${permission.doctor.fullName}. Doctor can no longer decrypt or download this document.`,
      permission,
      blockchainTxHash: blockchainResult.txHash,
    });
  } catch (err) {
    console.error("Revoke Permission Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Get all active and past permissions granted by the logged-in patient
 */
async function getMyPermissions(req, res) {
  try {
    const permissions = await RecordPermission.find({ patient: req.user._id })
      .populate("record", "recordId title category originalFileName")
      .populate("doctor", "fullName email doctorProfile walletAddress")
      .sort({ createdAt: -1 });

    return res.json({ success: true, permissions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  requestAccess,
  getDoctorRequests,
  getPatientRequests,
  approveRequest,
  rejectRequest,
  revokePermission,
  getMyPermissions,
};
