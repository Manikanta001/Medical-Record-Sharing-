const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    actorEmail: {
      type: String,
      default: "ANONYMOUS",
    },
    actorRole: {
      type: String,
      default: "UNKNOWN",
    },
    actorWallet: {
      type: String,
      default: "",
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    recordId: {
      type: String,
      default: "",
      index: true,
    },
    details: {
      type: String,
      default: "",
    },
    ipAddress: {
      type: String,
      default: "127.0.0.1",
    },
    status: {
      type: String,
      enum: ["SUCCESS", "DENIED", "FAILED"],
      default: "SUCCESS",
    },
    blockchainTxHash: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
