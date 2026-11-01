const bcrypt = require("bcryptjs");
const User = require("../models/User");
const MedicalRecord = require("../models/MedicalRecord");
const AccessRequest = require("../models/AccessRequest");
const RecordPermission = require("../models/RecordPermission");
const BlockchainTx = require("../models/BlockchainTx");
const AuditLog = require("../models/AuditLog");
const { calculateSha256, encryptFileBuffer } = require("../services/encryptionService");
const { uploadEncryptedFile } = require("../services/ipfsService");

function createSampleReportPdf() {
  const stream = [
    "BT",
    "/F1 18 Tf",
    "50 740 Td (MEDLEDGER - SAMPLE LAB REPORT) Tj",
    "/F1 12 Tf",
    "0 -40 Td (Patient: John Doe) Tj",
    "0 -24 Td (Report: Comprehensive Lipid Panel) Tj",
    "0 -24 Td (Collection date: 01 November 2026) Tj",
    "0 -40 Td (Total cholesterol: 195 mg/dL  -  Within reference range) Tj",
    "0 -24 Td (Triglycerides: 140 mg/dL  -  Within reference range) Tj",
    "0 -24 Td (HDL cholesterol: 52 mg/dL) Tj",
    "0 -24 Td (LDL cholesterol: 115 mg/dL) Tj",
    "0 -48 Td (Demo only. This fictional report is not medical advice.) Tj",
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
}

async function seedDatabase() {
  console.log("--> Checking the single-patient / single-doctor demo data...");
  const existingPatient = await User.findOne({ email: "patient.john@gmail.com" });
  if (existingPatient) {
    // Upgrade databases created by the earlier demo seed: remove its pre-granted
    // permission and second sample report so the consent sequence starts clean.
    const legacyRecords = await MedicalRecord.find({
      patient: existingPatient._id,
      recordId: { $in: ["REC-2026-LP901", "REC-2026-MRI402"] },
    }).select("_id recordId");
    const legacyIds = legacyRecords.map((record) => record._id);
    if (legacyIds.length) {
      await RecordPermission.deleteMany({ record: { $in: legacyIds } });
      await AccessRequest.deleteMany({ record: { $in: legacyIds } });
      await MedicalRecord.deleteMany({ recordId: "REC-2026-MRI402", patient: existingPatient._id });
      const oldLipidRecord = legacyRecords.find((record) => record.recordId === "REC-2026-LP901");
      if (oldLipidRecord) {
        const report = createSampleReportPdf();
        const encrypted = encryptFileBuffer(report);
        const storage = await uploadEncryptedFile(encrypted.encryptedBuffer, "Demo_Lipid_Panel_Report.pdf");
        await MedicalRecord.updateOne({ _id: oldLipidRecord._id }, {
          $set: {
            recordId: "REC-DEMO-LIPID-001",
            title: "Comprehensive Lipid Panel (Demo Report)",
            description: "Fictional lab report seeded for the patient consent and doctor decryption walkthrough.",
            originalFileName: "Demo_Lipid_Panel_Report.pdf",
            fileType: "application/pdf",
            fileSize: report.length,
            originalFileHash: calculateSha256(report),
            encryptedFileHash: calculateSha256(encrypted.encryptedBuffer),
            ipfsCid: storage.ipfsCid,
            storageBackend: storage.storageBackend,
            encryptedFilePath: storage.filePath,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            encryptedKey: encrypted.encryptedKey,
            isRegisteredOnChain: false,
          },
          $unset: { blockchainTxHash: 1, blockchainBlockNumber: 1 },
        });
        await BlockchainTx.deleteMany({ recordId: { $in: ["REC-2026-LP901", "REC-2026-MRI402"] } });
        await AuditLog.deleteMany({ recordId: { $in: ["REC-2026-LP901", "REC-2026-MRI402"] }, action: { $in: ["APPROVE_ACCESS", "DOWNLOAD_RECORD"] } });
        await AuditLog.updateMany({ recordId: "REC-2026-LP901" }, { $set: { recordId: "REC-DEMO-LIPID-001" } });
      }
    }
    const demoRecord = await MedicalRecord.findOne({ recordId: "REC-DEMO-LIPID-001", patient: existingPatient._id });
    if (demoRecord) {
      // Reset only this seeded demo record's workflow on API startup, so every
      // presentation starts with no request and no granted permissions.
      await Promise.all([
        RecordPermission.deleteMany({ record: demoRecord._id }),
        AccessRequest.deleteMany({ record: demoRecord._id }),
        BlockchainTx.deleteMany({ recordId: demoRecord.recordId }),
        AuditLog.deleteMany({
          recordId: demoRecord.recordId,
          action: { $in: ["REQUEST_ACCESS", "APPROVE_ACCESS", "REJECT_ACCESS", "REVOKE_ACCESS", "DOWNLOAD_RECORD"] },
        }),
      ]);
    }
    console.log("✓ Demo database is ready: one report, with no pending requests or pre-granted access.");
    return;
  }

  const [doctorPassword, patientPassword] = await Promise.all([
    bcrypt.hash("Doctor@123", 10),
    bcrypt.hash("Patient@123", 10),
  ]);
  const doctor = await User.create({
    email: "dr.sharma@hospital.com",
    password: doctorPassword,
    fullName: "Dr. Rajesh Sharma",
    phone: "+91 98765 43210",
    role: "DOCTOR",
    isVerified: true,
    verificationStatus: "APPROVED",
    verificationNotes: "Pre-verified demo physician.",
    walletAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    doctorProfile: {
      licenseNumber: "DEMO-CARD-001",
      specialization: "Cardiology",
      hospitalAffiliation: "MedLedger Demo Clinic",
      yearsOfExperience: 12,
      medicalDegree: "MBBS, MD (Cardiology)",
      bio: "Verified physician account for the access request demonstration.",
    },
  });
  const patient = await User.create({
    email: "patient.john@gmail.com",
    password: patientPassword,
    fullName: "John Doe",
    phone: "+91 91234 56789",
    role: "PATIENT",
    isVerified: true,
    verificationStatus: "NOT_APPLICABLE",
    walletAddress: "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
    patientProfile: {
      patientIdNumber: "PAT-DEMO-001",
      bloodGroup: "O+",
      dateOfBirth: "1994-06-15",
      gender: "Male",
      allergies: ["Penicillin"],
    },
  });

  const report = createSampleReportPdf();
  const originalFileHash = calculateSha256(report);
  const encrypted = encryptFileBuffer(report);
  const encryptedFileHash = calculateSha256(encrypted.encryptedBuffer);
  const storage = await uploadEncryptedFile(encrypted.encryptedBuffer, "Demo_Lipid_Panel_Report.pdf");
  const recordId = "REC-DEMO-LIPID-001";
  await MedicalRecord.create({
    recordId,
    title: "Comprehensive Lipid Panel (Demo Report)",
    description: "Fictional lab report seeded for the patient consent and doctor decryption walkthrough.",
    category: "LAB_REPORT",
    patient: patient._id,
    patientWallet: patient.walletAddress,
    originalFileName: "Demo_Lipid_Panel_Report.pdf",
    fileType: "application/pdf",
    fileSize: report.length,
    originalFileHash,
    encryptedFileHash,
    ipfsCid: storage.ipfsCid,
    storageBackend: storage.storageBackend,
    encryptedFilePath: storage.filePath,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    encryptedKey: encrypted.encryptedKey,
    isRegisteredOnChain: false,
  });

  // There is deliberately no permission or access request yet: the demo begins
  // with the doctor requesting access and the patient making the decision.
  await AuditLog.create({
    actor: patient._id,
    actorEmail: patient.email,
    actorRole: "PATIENT",
    action: "UPLOAD_RECORD",
    recordId,
    details: "Seeded one fictional report, encrypted with AES-256-GCM for the consent demo.",
    status: "SUCCESS",
  });

  console.log("✓ Seeded exactly one patient, one verified doctor, and one encrypted sample report.");
  console.log("✓ No doctor permission is pre-granted. Patient consent is required before doctor decryption.");
  console.log(" Patient: patient.john@gmail.com / Patient@123");
  console.log(" Doctor:  dr.sharma@hospital.com / Doctor@123");
}

module.exports = { seedDatabase };
