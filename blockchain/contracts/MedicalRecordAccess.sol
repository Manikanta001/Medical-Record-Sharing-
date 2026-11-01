// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MedicalRecordAccess
 * @notice Patient-Centric Access Control and Integrity Verification for Electronic Health Records (EHR).
 * @dev Stores only record hashes, IPFS CIDs, ownership, and time-bounded permissions on-chain.
 *      Never stores plaintext medical files, PII, diagnoses, or encryption keys.
 */
contract MedicalRecordAccess is Ownable, ReentrancyGuard {

    // --- Custom Errors for Gas Optimization & Clarity ---
    error ZeroAddressNotAllowed();
    error EmptyRecordId();
    error EmptyFileHash();
    error EmptyIpfsCid();
    error RecordAlreadyExists(string recordId);
    error RecordNotFound(string recordId);
    error NotRecordOwner(address caller, address owner);
    error InvalidDuration();
    error AccessNotGranted();

    // --- Structs ---
    struct RecordMetadata {
        string recordId;
        string fileHash;       // SHA-256 hash of original unencrypted or encrypted file for tamper detection
        string ipfsCid;        // IPFS Content Identifier of AES-256-GCM encrypted document
        address patient;       // The patient who owns this medical record
        uint256 registeredAt;  // Block timestamp of registration
        bool exists;
    }

    struct Permission {
        bool isActive;
        uint256 grantedAt;
        uint256 validUntil;    // Unix timestamp after which access expires
        string purpose;        // Reason for access (e.g. "Cardiology Consultation")
    }

    // --- State Variables ---
    // recordId => RecordMetadata
    mapping(string => RecordMetadata) private records;
    
    // recordId => (doctorWallet => Permission)
    mapping(string => mapping(address => Permission)) private recordPermissions;

    // Doctor verification registry (managed by contract admin/hospital authority)
    mapping(address => bool) public approvedDoctors;

    // Total records registered counter
    uint256 public totalRecordsCount;

    // --- Events for Auditing & Indexing ---
    event MedicalRecordRegistered(
        string indexed recordId,
        address indexed patient,
        string fileHash,
        string ipfsCid,
        uint256 timestamp
    );

    event AccessGranted(
        string indexed recordId,
        address indexed patient,
        address indexed doctor,
        uint256 validUntil,
        string purpose,
        uint256 timestamp
    );

    event AccessRevoked(
        string indexed recordId,
        address indexed patient,
        address indexed doctor,
        uint256 timestamp
    );

    event RecordAccessed(
        string indexed recordId,
        address indexed accessor,
        string action,
        uint256 timestamp
    );

    event DoctorStatusUpdated(
        address indexed doctor,
        bool isApproved,
        uint256 timestamp
    );

    constructor() Ownable(msg.sender) {}

    // --- Modifiers ---
    modifier onlyRecordOwner(string memory recordId) {
        if (!records[recordId].exists) revert RecordNotFound(recordId);
        if (records[recordId].patient != msg.sender) {
            revert NotRecordOwner(msg.sender, records[recordId].patient);
        }
        _;
    }

    /**
     * @notice Registers a new encrypted medical record on the blockchain.
     * @param recordId Unique application-generated identifier (UUID/Hex).
     * @param fileHash SHA-256 cryptographic hash of the document.
     * @param ipfsCid IPFS CID where the AES-256-GCM encrypted file is stored.
     */
    function registerRecord(
        string memory recordId,
        string memory fileHash,
        string memory ipfsCid
    ) external nonReentrant {
        if (bytes(recordId).length == 0) revert EmptyRecordId();
        if (bytes(fileHash).length == 0) revert EmptyFileHash();
        if (bytes(ipfsCid).length == 0) revert EmptyIpfsCid();
        if (records[recordId].exists) revert RecordAlreadyExists(recordId);

        records[recordId] = RecordMetadata({
            recordId: recordId,
            fileHash: fileHash,
            ipfsCid: ipfsCid,
            patient: msg.sender,
            registeredAt: block.timestamp,
            exists: true
        });

        totalRecordsCount++;

        emit MedicalRecordRegistered(
            recordId,
            msg.sender,
            fileHash,
            ipfsCid,
            block.timestamp
        );
    }

    /**
     * @notice Grants time-bounded access to a specific doctor for a medical record.
     * @param recordId Unique record ID.
     * @param doctorWallet Ethereum address of the doctor.
     * @param durationInSeconds Duration in seconds for which access remains valid.
     * @param purpose Clinical purpose of access.
     */
    function grantAccess(
        string memory recordId,
        address doctorWallet,
        uint256 durationInSeconds,
        string memory purpose
    ) external onlyRecordOwner(recordId) {
        if (doctorWallet == address(0)) revert ZeroAddressNotAllowed();
        if (durationInSeconds == 0) revert InvalidDuration();

        uint256 validUntil = block.timestamp + durationInSeconds;

        recordPermissions[recordId][doctorWallet] = Permission({
            isActive: true,
            grantedAt: block.timestamp,
            validUntil: validUntil,
            purpose: purpose
        });

        emit AccessGranted(
            recordId,
            msg.sender,
            doctorWallet,
            validUntil,
            purpose,
            block.timestamp
        );
    }

    /**
     * @notice Immediately revokes doctor access to a medical record.
     * @param recordId Unique record ID.
     * @param doctorWallet Ethereum address of the doctor.
     */
    function revokeAccess(
        string memory recordId,
        address doctorWallet
    ) external onlyRecordOwner(recordId) {
        if (doctorWallet == address(0)) revert ZeroAddressNotAllowed();
        
        Permission storage perm = recordPermissions[recordId][doctorWallet];
        if (!perm.isActive) revert AccessNotGranted();

        perm.isActive = false;

        emit AccessRevoked(
            recordId,
            msg.sender,
            doctorWallet,
            block.timestamp
        );
    }

    /**
     * @notice Checks if a doctor currently possesses valid, non-expired access to a record.
     * @param recordId Unique record ID.
     * @param doctorWallet Ethereum address of the doctor.
     * @return isAuthorized True if permission is active and not expired (or if caller is patient owner).
     * @return validUntil Timestamp until which access is valid.
     * @return isExpired True if validUntil is in the past.
     */
    function checkAccess(
        string memory recordId,
        address doctorWallet
    ) external view returns (bool isAuthorized, uint256 validUntil, bool isExpired) {
        if (!records[recordId].exists) {
            return (false, 0, false);
        }

        // Patient always has access to their own record
        if (records[recordId].patient == doctorWallet) {
            return (true, type(uint256).max, false);
        }

        Permission memory perm = recordPermissions[recordId][doctorWallet];
        if (!perm.isActive) {
            return (false, 0, false);
        }

        bool expired = block.timestamp > perm.validUntil;
        bool authorized = perm.isActive && !expired;

        return (authorized, perm.validUntil, expired);
    }

    /**
     * @notice Logs an audit event when a record is viewed or downloaded.
     * @param recordId Unique record ID.
     * @param accessor The wallet address performing the access.
     * @param action The specific action (e.g. "VIEW", "DOWNLOAD", "VERIFY").
     */
    function logAccessEvent(
        string memory recordId,
        address accessor,
        string memory action
    ) external {
        if (!records[recordId].exists) revert RecordNotFound(recordId);
        
        emit RecordAccessed(
            recordId,
            accessor,
            action,
            block.timestamp
        );
    }

    /**
     * @notice Retrieves record details for verification.
     */
    function getRecord(
        string memory recordId
    ) external view returns (
        string memory fileHash,
        string memory ipfsCid,
        address patient,
        uint256 registeredAt
    ) {
        if (!records[recordId].exists) revert RecordNotFound(recordId);
        RecordMetadata memory rec = records[recordId];
        return (rec.fileHash, rec.ipfsCid, rec.patient, rec.registeredAt);
    }

    /**
     * @notice Administrator can approve or update a doctor's verification status on-chain.
     */
    function setDoctorApproval(address doctorWallet, bool approved) external onlyOwner {
        if (doctorWallet == address(0)) revert ZeroAddressNotAllowed();
        approvedDoctors[doctorWallet] = approved;
        emit DoctorStatusUpdated(doctorWallet, approved, block.timestamp);
    }
}
