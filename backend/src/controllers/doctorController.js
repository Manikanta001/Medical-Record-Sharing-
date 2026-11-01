const User = require("../models/User");
const MedicalRecord = require("../models/MedicalRecord");
const RecordPermission = require("../models/RecordPermission");
const Consultation = require("../models/Consultation");
const { logSecurityEvent } = require("../services/auditService");

/**
 * Get directory of verified doctors (for Patients)
 */
async function getVerifiedDoctors(req, res) {
  try {
    const doctors = await User.find({
      role: "DOCTOR",
      isVerified: true,
      verificationStatus: "APPROVED",
      status: "ACTIVE",
    }).select("fullName email doctorProfile walletAddress");

    return res.json({ success: true, doctors });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Search patients by email, name, or patient ID (Verified Doctor only)
 */
async function searchPatients(req, res) {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Search query must be at least 2 characters." });
    }

    const regex = new RegExp(query.trim(), "i");
    const patients = await User.find({
      role: "PATIENT",
      status: "ACTIVE",
      $or: [
        { email: regex },
        { fullName: regex },
        { "patientProfile.patientIdNumber": regex },
      ],
    }).select("_id");
    const records = await MedicalRecord.find({
      $or: [{ patient: { $in: patients.map((patient) => patient._id) } }, { title: regex }],
    })
      .populate("patient", "fullName email patientProfile")
      .select("recordId title description category originalFileName fileType fileSize createdAt patient")
      .sort({ createdAt: -1 });

    return res.json({ success: true, records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Get records that this doctor has active authorized access to
 */
async function getAuthorizedRecords(req, res) {
  try {
    const activePermissions = await RecordPermission.find({
      doctor: req.user._id,
      isActive: true,
      validUntil: { $gt: new Date() },
    })
      .populate({
        path: "record",
        populate: {
          path: "patient",
          select: "fullName email patientProfile walletAddress",
        },
      })
      .sort({ validUntil: 1 });

    const records = activePermissions
      .filter((p) => p.record)
      .map((p) => ({
        permissionId: p.permissionId,
        validUntil: p.validUntil,
        grantedAt: p.grantedAt,
        purpose: p.purpose,
        record: {
          recordId: p.record.recordId,
          title: p.record.title,
          description: p.record.description,
          category: p.record.category,
          originalFileName: p.record.originalFileName,
          fileType: p.record.fileType,
          fileSize: p.record.fileSize,
          originalFileHash: p.record.originalFileHash,
          ipfsCid: p.record.ipfsCid,
          createdAt: p.record.createdAt,
          patient: p.record.patient,
        },
      }));

    return res.json({ success: true, count: records.length, records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Doctor adds a consultation / clinical note for a patient
 */
async function createConsultation(req, res) {
  try {
    const { patientId, recordId, chiefComplaint, diagnosis, prescription, notes, followUpDate } = req.body;

    if (!patientId || !chiefComplaint || !diagnosis) {
      return res.status(400).json({
        success: false,
        message: "Patient ID, chief complaint, and clinical diagnosis are required.",
      });
    }

    let recordObjId = null;
    if (recordId) {
      const rec = await MedicalRecord.findOne({ recordId });
      if (rec) recordObjId = rec._id;
    }

    const consultation = await Consultation.create({
      patient: patientId,
      doctor: req.user._id,
      record: recordObjId,
      chiefComplaint: chiefComplaint.trim(),
      diagnosis: diagnosis.trim(),
      prescription: prescription ? prescription.trim() : "",
      notes: notes ? notes.trim() : "",
      followUpDate: followUpDate || null,
    });

    await logSecurityEvent({
      actor: req.user,
      action: "CREATE_CONSULTATION",
      details: `Dr. ${req.user.fullName} logged clinical consultation for patient`,
      ipAddress: req.ip,
      status: "SUCCESS",
    });

    return res.status(201).json({
      success: true,
      message: "Consultation note recorded successfully.",
      consultation,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Get consultations for patient or doctor
 */
async function getConsultations(req, res) {
  try {
    const query = req.user.role === "PATIENT" ? { patient: req.user._id } : { doctor: req.user._id };

    const consultations = await Consultation.find(query)
      .populate("patient", "fullName email patientProfile")
      .populate("doctor", "fullName email doctorProfile")
      .populate("record", "recordId title category")
      .sort({ createdAt: -1 });

    return res.json({ success: true, consultations });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getVerifiedDoctors,
  searchPatients,
  getAuthorizedRecords,
  createConsultation,
  getConsultations,
};
