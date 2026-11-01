const mongoose = require("mongoose");

const medicalRecordSchema = new mongoose.Schema(
  {
    recordId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      enum: ["LAB_REPORT", "PRESCRIPTION", "RADIOLOGY", "DISCHARGE_SUMMARY", "CONSULTATION", "OTHER"],
      default: "LAB_REPORT",
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    patientWallet: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    originalFileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    // Cryptographic hashes
    originalFileHash: {
      type: String,
      required: true, // SHA-256 of plain document
    },
    encryptedFileHash: {
      type: String,
      required: true, // SHA-256 of AES-256-GCM cipher bytes
    },
    // Decentralized storage
    ipfsCid: {
      type: String,
      required: true,
      index: true,
    },
    storageBackend: {
      type: String,
      enum: ["IPFS_KUBO", "LOCAL_ENCRYPTED_VAULT"],
      default: "LOCAL_ENCRYPTED_VAULT",
    },
    encryptedFilePath: {
      type: String,
      required: true,
    },
    // AES-256-GCM parameters
    encryptionAlgorithm: {
      type: String,
      default: "AES-256-GCM",
    },
    iv: {
      type: String,
      required: true, // Hex 12-byte IV
    },
    authTag: {
      type: String,
      required: true, // Hex 16-byte authentication tag
    },
    encryptedKey: {
      type: String,
      required: true, // Symmetric DEK protected by master system secret
    },
    // Blockchain synchronization
    isRegisteredOnChain: {
      type: Boolean,
      default: false,
    },
    blockchainTxHash: {
      type: String,
      default: "",
    },
    blockchainBlockNumber: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);
