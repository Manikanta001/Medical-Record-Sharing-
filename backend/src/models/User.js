const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["PATIENT", "DOCTOR", "ADMIN"],
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    walletAddress: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED"],
      default: "ACTIVE",
    },
    // Doctor verification fields
    isVerified: {
      type: Boolean,
      default: function () {
        return this.role === "PATIENT" || this.role === "ADMIN";
      },
    },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "NOT_APPLICABLE"],
      default: function () {
        return this.role === "DOCTOR" ? "PENDING" : "NOT_APPLICABLE";
      },
    },
    verificationNotes: {
      type: String,
      default: "",
    },
    // Patient Profile
    patientProfile: {
      patientIdNumber: { type: String, default: "" },
      bloodGroup: { type: String, default: "" },
      dateOfBirth: { type: String, default: "" },
      gender: { type: String, default: "" },
      emergencyContact: { type: String, default: "" },
      allergies: { type: [String], default: [] },
    },
    // Doctor Profile
    doctorProfile: {
      licenseNumber: { type: String, default: "" },
      specialization: { type: String, default: "" },
      hospitalAffiliation: { type: String, default: "" },
      yearsOfExperience: { type: Number, default: 0 },
      bio: { type: String, default: "" },
      medicalDegree: { type: String, default: "MBBS" },
    },
  },
  { timestamps: true }
);

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model("User", userSchema);
