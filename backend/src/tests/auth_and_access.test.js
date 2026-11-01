const request = require("supertest");
const app = require("../server");
const { connectDB, closeDB } = require("../config/db");
const {
  calculateSha256,
  encryptFileBuffer,
  decryptFileBuffer,
} = require("../services/encryptionService");

describe("Medical Record System Security & Access Control Tests", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await connectDB();
    await require("../utils/seedData").seedDatabase();
  });

  jest.setTimeout(60000);

  afterAll(async () => {
    await closeDB();
  });

  describe("Cryptographic Integrity & AES-256-GCM", () => {
    const sampleMedicalText = "Patient: Alice Smith | Diagnosis: Type 2 Diabetes | Rx: Metformin 500mg BID";
    const sampleBuffer = Buffer.from(sampleMedicalText, "utf-8");

    it("Should compute accurate SHA-256 hash for document", () => {
      const hash = calculateSha256(sampleBuffer);
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // 256 bits = 64 hex characters
    });

    it("Should encrypt with AES-256-GCM and decrypt back to exact original content", () => {
      const originalHash = calculateSha256(sampleBuffer);
      const { encryptedBuffer, iv, authTag, encryptedKey } = encryptFileBuffer(sampleBuffer);

      expect(encryptedBuffer).not.toEqual(sampleBuffer);
      expect(iv).toBeDefined();
      expect(authTag).toBeDefined();

      const decryptedBuffer = decryptFileBuffer(encryptedBuffer, iv, authTag, encryptedKey);
      const decryptedHash = calculateSha256(decryptedBuffer);

      expect(decryptedBuffer.toString("utf-8")).toEqual(sampleMedicalText);
      expect(decryptedHash).toEqual(originalHash);
    });

    it("Should reject decryption and throw integrity error if ciphertext is tampered with", () => {
      const { encryptedBuffer, iv, authTag, encryptedKey } = encryptFileBuffer(sampleBuffer);

      // Malicious bit-flip tampering on byte index 2
      const tamperedBuffer = Buffer.from(encryptedBuffer);
      tamperedBuffer[2] ^= 0xff;

      expect(() => {
        decryptFileBuffer(tamperedBuffer, iv, authTag, encryptedKey);
      }).toThrow(/tampered/i);
    });
  });

  describe("API Authentication & Role Enforcement", () => {
    it("Should reject unauthorized API calls with missing token", async () => {
      const res = await request(app).get("/api/records");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("Should successfully authenticate seeded patient", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "patient.john@gmail.com",
        password: "Patient@123",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe("PATIENT");
    });

    it("Should successfully authenticate seeded verified doctor", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "dr.sharma@hospital.com",
        password: "Doctor@123",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe("DOCTOR");
      expect(res.body.user.isVerified).toBe(true);
    });

    it("Should reject login with invalid credentials", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "patient.john@gmail.com",
        password: "WrongPassword!99",
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("End-to-End Patient-Doctor Access Control Lifecycle", () => {
    let patientToken, doctorToken, requestId, permissionId;

    beforeAll(async () => {
      // Login patient
      const pRes = await request(app).post("/api/auth/login").send({
        email: "patient.john@gmail.com",
        password: "Patient@123",
      });
      patientToken = pRes.body.token;

      // Login verified doctor
      const dRes = await request(app).post("/api/auth/login").send({
        email: "dr.sharma@hospital.com",
        password: "Doctor@123",
      });
      doctorToken = dRes.body.token;

    });

    it("should find the one seeded report for the doctor", async () => {
      const res = await request(app)
        .get("/api/doctors/search-patients?query=John")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.records).toHaveLength(1);
      expect(res.body.records[0].recordId).toBe("REC-DEMO-LIPID-001");
    });

    it("should deny the doctor before patient consent", async () => {
      const res = await request(app)
        .get("/api/records/REC-DEMO-LIPID-001/download")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(res.status).toBe(403);
    });

    it("should deliver the doctor request to the patient and grant access only after approval", async () => {
      const requestRes = await request(app)
        .post("/api/access/requests")
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({ recordId: "REC-DEMO-LIPID-001", purpose: "Demo clinical review", durationHours: 24 });
      expect(requestRes.status).toBe(201);
      requestId = requestRes.body.accessRequest.requestId;

      const inboxRes = await request(app)
        .get("/api/access/requests/patient")
        .set("Authorization", `Bearer ${patientToken}`);
      expect(inboxRes.status).toBe(200);
      expect(inboxRes.body.requests).toHaveLength(1);
      expect(inboxRes.body.requests[0].status).toBe("PENDING");

      const approveRes = await request(app)
        .post(`/api/access/requests/${requestId}/approve`)
        .set("Authorization", `Bearer ${patientToken}`)
        .send({ customDurationSeconds: 3600 });
      expect(approveRes.status).toBe(200);
      permissionId = approveRes.body.permission.permissionId;

      const res = await request(app)
        .get("/api/records/REC-DEMO-LIPID-001/download")
        .set("Authorization", `Bearer ${doctorToken}`);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/pdf");
      expect(res.headers["x-file-integrity-sha256"]).toBeDefined();
    });

    it("should block doctor decryption again after patient revokes access", async () => {
      const res = await request(app)
        .post(`/api/access/permissions/${permissionId}/revoke`)
        .set("Authorization", `Bearer ${patientToken}`);
      expect(res.status).toBe(200);

      const downloadRes = await request(app)
        .get("/api/records/REC-DEMO-LIPID-001/download")
        .set("Authorization", `Bearer ${doctorToken}`);
      expect(downloadRes.status).toBe(403);
      expect(downloadRes.body.success).toBe(false);
    });
  });
});
