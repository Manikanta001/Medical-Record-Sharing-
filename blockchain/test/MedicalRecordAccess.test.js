const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("MedicalRecordAccess Smart Contract", function () {
  let contract;
  let owner, patient, doctor1, doctor2, unauthorizedUser;

  const sampleRecordId = "REC-2026-001";
  const sampleFileHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const sampleIpfsCid = "QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx";

  beforeEach(async function () {
    [owner, patient, doctor1, doctor2, unauthorizedUser] = await ethers.getSigners();
    const MedicalRecordAccess = await ethers.getContractFactory("MedicalRecordAccess");
    contract = await MedicalRecordAccess.deploy();
    await contract.waitForDeployment();
  });

  describe("Record Registration", function () {
    it("Should allow a patient to register a medical record", async function () {
      const tx = await contract.connect(patient).registerRecord(
        sampleRecordId,
        sampleFileHash,
        sampleIpfsCid
      );

      await expect(tx)
        .to.emit(contract, "MedicalRecordRegistered")
        .withArgs(
          sampleRecordId,
          patient.address,
          sampleFileHash,
          sampleIpfsCid,
          await time.latest()
        );

      const record = await contract.getRecord(sampleRecordId);
      expect(record.fileHash).to.equal(sampleFileHash);
      expect(record.ipfsCid).to.equal(sampleIpfsCid);
      expect(record.patient).to.equal(patient.address);
      expect(await contract.totalRecordsCount()).to.equal(1n);
    });

    it("Should reject duplicate record registration", async function () {
      await contract.connect(patient).registerRecord(
        sampleRecordId,
        sampleFileHash,
        sampleIpfsCid
      );

      await expect(
        contract.connect(patient).registerRecord(sampleRecordId, sampleFileHash, sampleIpfsCid)
      ).to.be.revertedWithCustomError(contract, "RecordAlreadyExists");
    });

    it("Should reject registration with empty parameters", async function () {
      await expect(
        contract.connect(patient).registerRecord("", sampleFileHash, sampleIpfsCid)
      ).to.be.revertedWithCustomError(contract, "EmptyRecordId");

      await expect(
        contract.connect(patient).registerRecord(sampleRecordId, "", sampleIpfsCid)
      ).to.be.revertedWithCustomError(contract, "EmptyFileHash");

      await expect(
        contract.connect(patient).registerRecord(sampleRecordId, sampleFileHash, "")
      ).to.be.revertedWithCustomError(contract, "EmptyIpfsCid");
    });
  });

  describe("Access Control & Permissions", function () {
    beforeEach(async function () {
      await contract.connect(patient).registerRecord(
        sampleRecordId,
        sampleFileHash,
        sampleIpfsCid
      );
    });

    it("Should return false for a doctor who has not been granted access", async function () {
      const [isAuthorized, validUntil, isExpired] = await contract.checkAccess(
        sampleRecordId,
        doctor1.address
      );
      expect(isAuthorized).to.be.false;
      expect(isExpired).to.be.false;
    });

    it("Should return true for the patient themselves", async function () {
      const [isAuthorized] = await contract.checkAccess(
        sampleRecordId,
        patient.address
      );
      expect(isAuthorized).to.be.true;
    });

    it("Should allow the patient to grant access to a doctor", async function () {
      const duration = 3600; // 1 hour
      const purpose = "Cardiology evaluation";

      const tx = await contract.connect(patient).grantAccess(
        sampleRecordId,
        doctor1.address,
        duration,
        purpose
      );

      await expect(tx)
        .to.emit(contract, "AccessGranted")
        .withArgs(
          sampleRecordId,
          patient.address,
          doctor1.address,
          (await time.latest()) + duration,
          purpose,
          await time.latest()
        );

      const [isAuthorized, validUntil, isExpired] = await contract.checkAccess(
        sampleRecordId,
        doctor1.address
      );
      expect(isAuthorized).to.be.true;
      expect(isExpired).to.be.false;
      expect(validUntil).to.be.greaterThan(await time.latest());
    });

    it("Should prevent non-owners from granting access", async function () {
      await expect(
        contract.connect(unauthorizedUser).grantAccess(
          sampleRecordId,
          doctor2.address,
          3600,
          "Malicious grant"
        )
      ).to.be.revertedWithCustomError(contract, "NotRecordOwner");
    });

    it("Should allow the patient to revoke access immediately", async function () {
      await contract.connect(patient).grantAccess(
        sampleRecordId,
        doctor1.address,
        3600,
        "Consultation"
      );

      const tx = await contract.connect(patient).revokeAccess(
        sampleRecordId,
        doctor1.address
      );

      await expect(tx)
        .to.emit(contract, "AccessRevoked")
        .withArgs(
          sampleRecordId,
          patient.address,
          doctor1.address,
          await time.latest()
        );

      const [isAuthorized] = await contract.checkAccess(
        sampleRecordId,
        doctor1.address
      );
      expect(isAuthorized).to.be.false;
    });

    it("Should invalidate access automatically after duration expires", async function () {
      const duration = 600; // 10 minutes
      await contract.connect(patient).grantAccess(
        sampleRecordId,
        doctor1.address,
        duration,
        "Quick Checkup"
      );

      // Fast forward time past duration
      await time.increase(601);

      const [isAuthorized, validUntil, isExpired] = await contract.checkAccess(
        sampleRecordId,
        doctor1.address
      );
      expect(isAuthorized).to.be.false;
      expect(isExpired).to.be.true;
    });
  });

  describe("Audit Events & Doctor Approvals", function () {
    beforeEach(async function () {
      await contract.connect(patient).registerRecord(
        sampleRecordId,
        sampleFileHash,
        sampleIpfsCid
      );
    });

    it("Should log record access events for on-chain auditing", async function () {
      const tx = await contract.connect(doctor1).logAccessEvent(
        sampleRecordId,
        doctor1.address,
        "DOWNLOAD_DECRYPTED"
      );

      await expect(tx)
        .to.emit(contract, "RecordAccessed")
        .withArgs(
          sampleRecordId,
          doctor1.address,
          "DOWNLOAD_DECRYPTED",
          await time.latest()
        );
    });

    it("Should allow owner to approve doctor and emit event", async function () {
      const tx = await contract.connect(owner).setDoctorApproval(doctor1.address, true);

      await expect(tx)
        .to.emit(contract, "DoctorStatusUpdated")
        .withArgs(doctor1.address, true, await time.latest());

      expect(await contract.approvedDoctors(doctor1.address)).to.be.true;
    });

    it("Should reject non-owner from updating doctor approval", async function () {
      await expect(
        contract.connect(unauthorizedUser).setDoctorApproval(doctor1.address, true)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });
  });
});
