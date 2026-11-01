const fs = require("fs");
const path = require("path");
const User = require("../models/User");
const MedicalRecord = require("../models/MedicalRecord");
const AccessRequest = require("../models/AccessRequest");
const RecordPermission = require("../models/RecordPermission");
const Consultation = require("../models/Consultation");
const BlockchainTx = require("../models/BlockchainTx");
const AuditLog = require("../models/AuditLog");
const { isIpfsDaemonAvailable } = require("../services/ipfsService");

const ARTIFACT_PATH = path.join(__dirname, "..", "config", "contractArtifact.json");

/**
 * Patient Dashboard Metrics
 */
async function getPatientDashboard(req, res) {
  try {
    const patientId = req.user._id;

    const [totalRecords, activePermissionsCount, pendingRequestsCount, recentRecords, recentAuditLogs] =
      await Promise.all([
        MedicalRecord.countDocuments({ patient: patientId }),
        RecordPermission.countDocuments({
          patient: patientId,
          isActive: true,
          validUntil: { $gt: new Date() },
        }),
        AccessRequest.countDocuments({ patient: patientId, status: "PENDING" }),
        MedicalRecord.find({ patient: patientId })
          .sort({ createdAt: -1 })
          .limit(5)
          .select("recordId title category originalFileName fileSize createdAt ipfsCid blockchainTxHash"),
        AuditLog.find({
          $or: [{ actor: patientId }, { details: { $regex: req.user.fullName || "patient", $options: "i" } }],
        })
          .sort({ timestamp: -1 })
          .limit(6),
      ]);

    return res.json({
      success: true,
      stats: {
        totalRecords,
        activePermissionsCount,
        pendingRequestsCount,
      },
      recentRecords,
      recentAuditLogs,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Doctor Dashboard Metrics
 */
async function getDoctorDashboard(req, res) {
  try {
    const doctorId = req.user._id;

    const [authorizedRecordsCount, pendingRequestsCount, totalConsultations, pendingRequests] =
      await Promise.all([
        RecordPermission.countDocuments({
          doctor: doctorId,
          isActive: true,
          validUntil: { $gt: new Date() },
        }),
        AccessRequest.countDocuments({ doctor: doctorId, status: "PENDING" }),
        Consultation.countDocuments({ doctor: doctorId }),
        AccessRequest.find({ doctor: doctorId, status: "PENDING" })
          .populate("record", "recordId title category")
          .populate("patient", "fullName email")
          .sort({ createdAt: -1 })
          .limit(5),
      ]);

    return res.json({
      success: true,
      doctor: {
        isVerified: req.user.isVerified,
        verificationStatus: req.user.verificationStatus,
        specialization: req.user.doctorProfile?.specialization,
        licenseNumber: req.user.doctorProfile?.licenseNumber,
      },
      stats: {
        authorizedRecordsCount,
        pendingRequestsCount,
        totalConsultations,
      },
      pendingRequests,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Administrator Dashboard Metrics
 */
async function getAdminDashboard(req, res) {
  try {
    const [
      totalPatients,
      totalDoctors,
      pendingDoctorsCount,
      totalRecords,
      totalAccessRequests,
      totalActivePermissions,
      totalTransactions,
      recentTransactions,
      recentAuditLogs,
    ] = await Promise.all([
      User.countDocuments({ role: "PATIENT" }),
      User.countDocuments({ role: "DOCTOR" }),
      User.countDocuments({ role: "DOCTOR", verificationStatus: "PENDING" }),
      MedicalRecord.countDocuments(),
      AccessRequest.countDocuments(),
      RecordPermission.countDocuments({ isActive: true, validUntil: { $gt: new Date() } }),
      BlockchainTx.countDocuments(),
      BlockchainTx.find().sort({ timestamp: -1 }).limit(6),
      AuditLog.find().sort({ timestamp: -1 }).limit(8),
    ]);

    const ipfsOnline = await isIpfsDaemonAvailable();

    return res.json({
      success: true,
      stats: {
        totalPatients,
        totalDoctors,
        pendingDoctorsCount,
        totalRecords,
        totalAccessRequests,
        totalActivePermissions,
        totalTransactions,
      },
      systemHealth: {
        database: "CONNECTED",
        ipfsStorage: ipfsOnline ? "IPFS_KUBO_ONLINE" : "LOCAL_ENCRYPTED_VAULT_ACTIVE",
        encryption: "AES-256-GCM (Hardware Accelerated)",
        blockchainNetwork: "Hardhat Local (Chain ID: 31337)",
      },
      recentTransactions,
      recentAuditLogs,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Blockchain Explorer Data
 */
async function getBlockchainExplorerData(req, res) {
  try {
    let contractInfo = {
      address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      network: "localhost",
      chainId: 31337,
    };

    if (fs.existsSync(ARTIFACT_PATH)) {
      try {
        const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf8"));
        contractInfo.address = artifact.address;
        contractInfo.chainId = artifact.chainId;
      } catch (e) {}
    }

    const transactions = await BlockchainTx.find().sort({ timestamp: -1 }).limit(25);
    const totalTransactions = await BlockchainTx.countDocuments();
    const totalOnChainRecords = await MedicalRecord.countDocuments({ isRegisteredOnChain: true });

    return res.json({
      success: true,
      contract: contractInfo,
      stats: {
        totalTransactions,
        totalOnChainRecords,
      },
      transactions,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getPatientDashboard,
  getDoctorDashboard,
  getAdminDashboard,
  getBlockchainExplorerData,
};
