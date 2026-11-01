const crypto = require("crypto");

// AES-256-GCM parameters
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const MASTER_SECRET = process.env.MASTER_ENCRYPTION_SECRET || "medrec_super_secure_master_key_2026_dev_secret_32b";

// Derive 32-byte key from master secret
function getMasterKey() {
  return crypto.createHash("sha256").update(MASTER_SECRET).digest();
}

/**
 * Calculates SHA-256 hash of a buffer.
 * Used for cryptographic tamper verification of files on-chain and in storage.
 */
function calculateSha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Encrypts a Data Encryption Key (DEK) using the system master key.
 */
function encryptDek(dekBuffer) {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", masterKey, iv);
  const encrypted = Buffer.concat([cipher.update(dekBuffer), cipher.final()]);
  return {
    encryptedKey: encrypted.toString("hex"),
    keyIv: iv.toString("hex"),
  };
}

/**
 * Decrypts a Data Encryption Key (DEK) using the system master key.
 */
function decryptDek(encryptedKeyHex, keyIvHex) {
  const masterKey = getMasterKey();
  const iv = Buffer.from(keyIvHex, "hex");
  const encrypted = Buffer.from(encryptedKeyHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", masterKey, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/**
 * Encrypts a file buffer using AES-256-GCM.
 * Generates a unique DEK and IV for every single file.
 */
function encryptFileBuffer(plainBuffer) {
  // 1. Generate unique 256-bit DEK
  const dek = crypto.randomBytes(32);

  // 2. Generate unique 96-bit IV
  const iv = crypto.randomBytes(IV_LENGTH);

  // 3. Encrypt file buffer with AES-256-GCM
  const cipher = crypto.createCipheriv(ALGORITHM, dek, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encryptedBuffer = Buffer.concat([
    cipher.update(plainBuffer),
    cipher.final(),
  ]);

  // 4. Retrieve 16-byte authentication tag
  const authTag = cipher.getAuthTag();

  // 5. Encrypt DEK for safe storage in DB
  const { encryptedKey, keyIv } = encryptDek(dek);

  return {
    encryptedBuffer,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    encryptedKey: `${encryptedKey}:${keyIv}`,
  };
}

/**
 * Decrypts a file buffer using AES-256-GCM.
 * Validates integrity via GCM authentication tag.
 * Throws error if data was tampered with.
 */
function decryptFileBuffer(encryptedBuffer, ivHex, authTagHex, encryptedKeyWithIv) {
  const [encryptedKeyHex, keyIvHex] = encryptedKeyWithIv.split(":");
  const dek = decryptDek(encryptedKeyHex, keyIvHex);

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, dek, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  try {
    const decryptedBuffer = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final(),
    ]);
    return decryptedBuffer;
  } catch (error) {
    throw new Error(
      "Decryption integrity verification failed! The file or authentication tag has been tampered with."
    );
  }
}

module.exports = {
  calculateSha256,
  encryptFileBuffer,
  decryptFileBuffer,
};
