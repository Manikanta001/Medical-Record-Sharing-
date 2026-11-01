const { v4: uuidv4 } = require("uuid");
const MedicalRecord = require("../models/MedicalRecord");
const RecordPermission = require("../models/RecordPermission");
const {
  calculateSha256,
  encryptFileBuffer,
  decryptFileBuffer,
} = require("../services/encryptionService");
const {
  uploadEncryptedFile,
  retrieveEncryptedFile,
} = require("../services/ipfsService");
const {
  registerRecordOnChain,
  verifyAccessOnChain,
} = require("../services/blockchainService");
const { logSecurityEvent } = require("../services/auditService");

/**
 * Upload Medical Record (Patient Only)
 */
async function uploadRecord(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Medical document file is required." });
    }

    const { title, description, category } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: "Record title is required." });
    }

    const plainBuffer = req.file.buffer;
    const originalFileName = req.file.originalname;
    const fileType = req.file.mimetype;
    const fileSize = req.file.size;

    // 1. Calculate original document SHA-256 hash
    const originalFileHash = calculateSha256(plainBuffer);

    // 2. Encrypt document with AES-256-GCM (Generates unique DEK and IV)
    const { encryptedBuffer, iv, authTag, encryptedKey } = encryptFileBuffer(plainBuffer);

    // 3. Calculate encrypted file SHA-256 hash for integrity tracking
    const encryptedFileHash = calculateSha256(encryptedBuffer);

    // 4. Upload encrypted document to IPFS / local vault
    const { ipfsCid, filePath, storageBackend } = await uploadEncryptedFile(
      encryptedBuffer,
      originalFileName
    );

    // 5. Generate unique record identifier
    const recordId = `REC-${new Date().getFullYear()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // 6. Register record hash and CID on the Ethereum blockchain
    const blockchainResult = await registerRecordOnChain({
      recordId,
      fileHash: originalFileHash,
      ipfsCid,
      patientWallet: req.user.walletAddress,
    });

    // 7. Save metadata in MongoDB
    const record = await MedicalRecord.create({
      recordId,
      title: title.trim(),
      description: description ? description.trim() : "",
      category: category || "LAB_REPORT",
      patient: req.user._id,
      patientWallet: req.user.walletAddress || "",
      originalFileName,
      fileType,
      fileSize,
      originalFileHash,
      encryptedFileHash,
      ipfsCid,
      storageBackend,
      encryptedFilePath: filePath,
      iv,
      authTag,
      encryptedKey,
      isRegisteredOnChain: true,
      blockchainTxHash: blockchainResult.txHash,
      blockchainBlockNumber: blockchainResult.blockNumber,
    });

    // 8. Log security audit event
    await logSecurityEvent({
      actor: req.user,
      action: "UPLOAD_RECORD",
      recordId,
      details: `Uploaded & encrypted "${title}" (Size: ${(fileSize / 1024).toFixed(1)} KB, CID: ${ipfsCid})`,
      ipAddress: req.ip,
      blockchainTxHash: blockchainResult.txHash,
      status: "SUCCESS",
    });

    return res.status(201).json({
      success: true,
      message: "Medical record successfully encrypted, stored on IPFS, and registered on blockchain.",
      record: {
        recordId: record.recordId,
        title: record.title,
        description: record.description,
        category: record.category,
        originalFileName: record.originalFileName,
        fileType: record.fileType,
        fileSize: record.fileSize,
        originalFileHash: record.originalFileHash,
        ipfsCid: record.ipfsCid,
        storageBackend: record.storageBackend,
        blockchainTxHash: record.blockchainTxHash,
        createdAt: record.createdAt,
      },
    });
  } catch (err) {
    console.error("Upload Record Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Get Patient's own records
 */
async function getMyRecords(req, res) {
  try {
    const records = await MedicalRecord.find({ patient: req.user._id })
      .sort({ createdAt: -1 })
      .select("-encryptedKey -iv -authTag -encryptedFilePath");

    return res.json({
      success: true,
      records,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Get Record details by recordId
 */
async function getRecordById(req, res) {
  try {
    const { recordId } = req.params;
    const record = await MedicalRecord.findOne({ recordId })
      .populate("patient", "fullName email patientProfile walletAddress")
      .select("-encryptedKey -iv -authTag -encryptedFilePath");

    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found." });
    }

    // Authorization check: Patient owner OR authorized doctor
    const isOwner = record.patient._id.toString() === req.user._id.toString();

    let hasDoctorAccess = false;
    let permissionInfo = null;

    if (!isOwner && req.user.role === "DOCTOR") {
      const activePerm = await RecordPermission.findOne({
        record: record._id,
        doctor: req.user._id,
        isActive: true,
        validUntil: { $gt: new Date() },
      });

      if (activePerm) {
        hasDoctorAccess = true;
        permissionInfo = activePerm;
      }
    }

    if (!isOwner && !hasDoctorAccess) {
      await logSecurityEvent({
        actor: req.user,
        action: "VIEW_RECORD",
        recordId,
        details: "Unauthorized view attempt denied",
        ipAddress: req.ip,
        status: "DENIED",
      });

      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have valid consent or active permission to view this record.",
      });
    }

    await logSecurityEvent({
      actor: req.user,
      action: "VIEW_RECORD",
      recordId,
      details: isOwner ? "Patient viewed own record" : `Doctor viewed authorized record (${permissionInfo?.purpose})`,
      ipAddress: req.ip,
      status: "SUCCESS",
    });

    return res.json({
      success: true,
      record,
      permissionInfo,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Securely download and decrypt medical record
 */
async function downloadRecord(req, res) {
  try {
    const { recordId } = req.params;
    const record = await MedicalRecord.findOne({ recordId }).populate("patient", "fullName email");

    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found." });
    }

    const isOwner = record.patient._id.toString() === req.user._id.toString();
    let isAuthorized = isOwner;

    // If Doctor, verify active permission and validity
    if (!isOwner) {
      if (req.user.role !== "DOCTOR") {
        await logSecurityEvent({
          actor: req.user,
          action: "DOWNLOAD_RECORD",
          recordId,
          details: "Unauthorized download attempt denied: role is not DOCTOR or OWNER",
          ipAddress: req.ip,
          status: "DENIED",
        });
        return res.status(403).json({ success: false, message: "Access forbidden." });
      }

      // Check doctor account status
      if (!req.user.isVerified || req.user.verificationStatus !== "APPROVED") {
        return res.status(403).json({
          success: false,
          message: "Unverified doctor account cannot download medical records.",
        });
      }

      // 1. Database permission check
      const permission = await RecordPermission.findOne({
        record: record._id,
        doctor: req.user._id,
        isActive: true,
        validUntil: { $gt: new Date() },
      });

      if (!permission) {
        await logSecurityEvent({
          actor: req.user,
          action: "DOWNLOAD_RECORD",
          recordId,
          details: "Download denied: no permission granted by patient",
          ipAddress: req.ip,
          status: "DENIED",
        });
        return res.status(403).json({
          success: false,
          message: "Access denied. Patient has not granted you access to this document.",
        });
      }

      if (new Date() > new Date(permission.validUntil)) {
        await logSecurityEvent({
          actor: req.user,
          action: "DOWNLOAD_RECORD",
          recordId,
          details: "Download denied: permission validity has expired",
          ipAddress: req.ip,
          status: "DENIED",
        });
        return res.status(403).json({
          success: false,
          message: "Access expired. Your permission window has lapsed. Please submit a new access request.",
        });
      }

      // 2. Blockchain on-chain check
      if (req.user.walletAddress) {
        const onChainCheck = await verifyAccessOnChain(recordId, req.user.walletAddress);
        if (onChainCheck.verifiedOnChain && !onChainCheck.isAuthorized) {
          return res.status(403).json({
            success: false,
            message: "On-chain verification failed: permission revoked or expired on smart contract.",
          });
        }
      }

      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    // 3. Fetch encrypted document from IPFS / local encrypted vault
    const encryptedBuffer = await retrieveEncryptedFile(record.ipfsCid, record.encryptedFilePath);

    // 4. Verify encrypted file integrity hash
    const currentEncryptedHash = calculateSha256(encryptedBuffer);
    if (currentEncryptedHash !== record.encryptedFileHash) {
      await logSecurityEvent({
        actor: req.user,
        action: "INTEGRITY_CHECK_FAILED",
        recordId,
        details: "Encrypted file integrity check failed! File in storage was modified.",
        ipAddress: req.ip,
        status: "FAILED",
      });
      return res.status(500).json({
        success: false,
        message: "Data integrity verification failed! Encrypted file does not match stored cryptographic hash.",
      });
    }

    // 5. Decrypt using AES-256-GCM with stored key, IV, and authTag
    const decryptedBuffer = decryptFileBuffer(
      encryptedBuffer,
      record.iv,
      record.authTag,
      record.encryptedKey
    );

    // 6. Verify original document SHA-256 hash against blockchain and database
    const decryptedHash = calculateSha256(decryptedBuffer);
    if (decryptedHash !== record.originalFileHash) {
      await logSecurityEvent({
        actor: req.user,
        action: "DECRYPTION_TAMPER_DETECTED",
        recordId,
        details: "Decrypted content does not match original SHA-256 hash registered on-chain",
        ipAddress: req.ip,
        status: "FAILED",
      });
      return res.status(500).json({
        success: false,
        message: "Cryptographic integrity alert: Decrypted document does not match original on-chain hash.",
      });
    }

    // 7. Log success audit event
    await logSecurityEvent({
      actor: req.user,
      action: "DOWNLOAD_RECORD",
      recordId,
      details: isOwner
        ? `Patient downloaded record "${record.title}"`
        : `Doctor ${req.user.fullName} downloaded authorized record "${record.title}"`,
      ipAddress: req.ip,
      status: "SUCCESS",
    });

    // 8. Stream decrypted buffer to client
    res.setHeader("Content-Type", record.fileType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(record.originalFileName)}"`
    );
    res.setHeader("Content-Length", decryptedBuffer.length);
    res.setHeader("X-File-Integrity-SHA256", decryptedHash);
    res.setHeader("X-IPFS-CID", record.ipfsCid);

    return res.send(decryptedBuffer);
  } catch (err) {
    console.error("Download Record Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  uploadRecord,
  getMyRecords,
  getRecordById,
  downloadRecord,
};
