const multer = require("multer");

// Store in memory buffer so we can immediately calculate SHA-256 and encrypt with AES-256-GCM
const storage = multer.memoryStorage();

const allowedMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type (${file.mimetype}). Only PDF, JPEG, PNG, and WebP medical reports are supported.`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 Megabytes max limit
  },
  fileFilter,
});

module.exports = upload;
