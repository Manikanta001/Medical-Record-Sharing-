const mongoose = require("mongoose");

const recordPermissionSchema = new mongoose.Schema(
  {
    permissionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    record: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MedicalRecord",
      required: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    accessRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccessRequest",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    grantedAt: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      default: "Consultation and Diagnosis",
    },
    blockchainTxHash: {
      type: String,
      default: "",
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revocationTxHash: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RecordPermission", recordPermissionSchema);
