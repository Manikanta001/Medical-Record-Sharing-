/**
 * Middleware to restrict access to specific roles.
 * Usage: requireRole(['PATIENT', 'DOCTOR'])
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires one of roles: [${allowedRoles.join(", ")}]. Current role: ${req.user.role}`,
      });
    }

    next();
  };
}

/**
 * Middleware ensuring a Doctor is verified by an administrator before accessing patient data.
 */
function requireVerifiedDoctor(req, res, next) {
  if (!req.user || req.user.role !== "DOCTOR") {
    return res.status(403).json({
      success: false,
      message: "Access restricted to medical doctors.",
    });
  }

  if (!req.user.isVerified || req.user.verificationStatus !== "APPROVED") {
    return res.status(403).json({
      success: false,
      message:
        "Your doctor account is currently pending verification by an administrator. You will be able to search patients and request records once your medical license is approved.",
    });
  }

  next();
}

module.exports = { requireRole, requireVerifiedDoctor };
