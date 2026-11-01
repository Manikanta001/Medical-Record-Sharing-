const mongoose = require("mongoose");

const blockchainTxSchema = new mongoose.Schema(
  {
    txHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fromAddress: {
      type: String,
      required: true,
      lowercase: true,
    },
    toContract: {
      type: String,
      required: true,
      lowercase: true,
    },
    method: {
      type: String,
      required: true,
    },
    recordId: {
      type: String,
      default: "",
    },
    blockNumber: {
      type: Number,
      default: null,
    },
    gasUsed: {
      type: String,
      default: "0",
    },
    status: {
      type: String,
      enum: ["CONFIRMED", "PENDING", "FAILED"],
      default: "CONFIRMED",
    },
    details: {
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

module.exports = mongoose.model("BlockchainTx", blockchainTxSchema);
