const AuditLog = require("../models/AuditLog");
const { logAccessOnChain } = require("./blockchainService");

/**
 * Creates an immutable audit log entry.
 */
async function logSecurityEvent({
  actor = null,
  actorEmail = "ANONYMOUS",
  actorRole = "UNKNOWN",
  actorWallet = "",
  action,
  recordId = "",
  details = "",
  ipAddress = "127.0.0.1",
  status = "SUCCESS",
  blockchainTxHash = "",
}) {
  try {
    const entry = await AuditLog.create({
      actor: actor ? actor._id || actor : null,
      actorEmail: actor ? actor.email || actorEmail : actorEmail,
      actorRole: actor ? actor.role || actorRole : actorRole,
      actorWallet: actor ? actor.walletAddress || actorWallet : actorWallet,
      action,
      recordId,
      details,
      ipAddress,
      status,
      blockchainTxHash,
      timestamp: new Date(),
    });

    // If on-chain logging is relevant and recordId is provided
    if (recordId && (action === "VIEW_RECORD" || action === "DOWNLOAD_RECORD")) {
      const accessor = (actor && actor.walletAddress) ? actor.walletAddress : "0x0000000000000000000000000000000000000000";
      logAccessOnChain(recordId, accessor, action).catch(() => {});
    }

    return entry;
  } catch (err) {
    console.error("Audit log creation error:", err.message);
  }
}

module.exports = { logSecurityEvent };
