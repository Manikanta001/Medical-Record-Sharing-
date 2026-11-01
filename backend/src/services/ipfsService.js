const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const { calculateSha256 } = require("./encryptionService");

const IPFS_API_URL = process.env.IPFS_API_URL || "http://127.0.0.1:5001";
const LOCAL_STORAGE_DIR = path.join(__dirname, "..", "..", "uploads", "encrypted_store");

// Ensure local encrypted vault directory exists
if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
}

/**
 * Checks if local Kubo IPFS daemon is running and reachable.
 */
async function isIpfsDaemonAvailable() {
  try {
    const res = await axios.post(`${IPFS_API_URL}/api/v0/version`, null, {
      timeout: 1500,
    });
    return res.status === 200;
  } catch (err) {
    return false;
  }
}

/**
 * Helper to compute an IPFS-style CID format from buffer hash.
 */
function generateDeterministicCid(buffer) {
  const hash = calculateSha256(buffer);
  // Base58-like mock CID representation for consistent demo handling
  return `QmMedRec${hash.substring(0, 38)}`;
}

/**
 * Uploads an encrypted file buffer to IPFS (or local secure vault if IPFS daemon is offline).
 * Medical documents are NEVER uploaded unencrypted.
 */
async function uploadEncryptedFile(encryptedBuffer, originalFileName) {
  const isAvailable = await isIpfsDaemonAvailable();

  if (isAvailable) {
    try {
      const formData = new FormData();
      formData.append("file", encryptedBuffer, {
        filename: `${originalFileName}.enc`,
      });

      const response = await axios.post(
        `${IPFS_API_URL}/api/v0/add?pin=true`,
        formData,
        {
          headers: formData.getHeaders(),
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      const ipfsCid = response.data.Hash;

      // Also persist backup in local vault for zero data loss
      const localFilePath = path.join(LOCAL_STORAGE_DIR, `${ipfsCid}.enc`);
      fs.writeFileSync(localFilePath, encryptedBuffer);

      return {
        ipfsCid,
        filePath: localFilePath,
        storageBackend: "IPFS_KUBO",
      };
    } catch (err) {
      console.warn("IPFS upload request failed, falling back to local vault:", err.message);
    }
  }

  // Local Encrypted Vault fallback with deterministic CID
  const ipfsCid = generateDeterministicCid(encryptedBuffer);
  const localFilePath = path.join(LOCAL_STORAGE_DIR, `${ipfsCid}.enc`);
  fs.writeFileSync(localFilePath, encryptedBuffer);

  return {
    ipfsCid,
    filePath: localFilePath,
    storageBackend: "LOCAL_ENCRYPTED_VAULT",
  };
}

/**
 * Retrieves the encrypted file buffer given its IPFS CID and/or local vault path.
 */
async function retrieveEncryptedFile(ipfsCid, filePath) {
  // 1. Try local encrypted vault first for speed and offline reliability
  if (filePath && fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }

  const fallbackPath = path.join(LOCAL_STORAGE_DIR, `${ipfsCid}.enc`);
  if (fs.existsSync(fallbackPath)) {
    return fs.readFileSync(fallbackPath);
  }

  // 2. Try fetching from Kubo IPFS node if available
  const isAvailable = await isIpfsDaemonAvailable();
  if (isAvailable) {
    try {
      const response = await axios.post(
        `${IPFS_API_URL}/api/v0/cat?arg=${ipfsCid}`,
        null,
        {
          responseType: "arraybuffer",
          timeout: 5000,
        }
      );
      const buffer = Buffer.from(response.data);
      // Cache locally
      fs.writeFileSync(fallbackPath, buffer);
      return buffer;
    } catch (err) {
      console.error("Failed to retrieve file from IPFS Kubo node:", err.message);
    }
  }

  throw new Error(`Encrypted medical document could not be retrieved for CID: ${ipfsCid}`);
}

module.exports = {
  isIpfsDaemonAvailable,
  uploadEncryptedFile,
  retrieveEncryptedFile,
};
