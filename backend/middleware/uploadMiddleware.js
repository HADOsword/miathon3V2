const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadPath = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const allowedTypes = new Map([
  [".pdf", "application/pdf"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const expectedMimeType = allowedTypes.get(ext);

  if (!expectedMimeType || file.mimetype !== expectedMimeType) {
    return cb(new Error("Only valid PDF and DOCX files are allowed"));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).fields([
  { name: "resume", maxCount: 1 },
  { name: "cv", maxCount: 1 },
  { name: "file", maxCount: 1 },
]);

const getUploadedResumeFile = (files) => {
  if (!files) {
    return null;
  }

  const uploadedFiles = [
    ...(files.resume || []),
    ...(files.cv || []),
    ...(files.file || []),
  ];

  if (uploadedFiles.length !== 1) {
    return null;
  }

  return uploadedFiles[0];
};

const uploadResumeFile = (req, res, next) => {
  upload(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ msg: "CV file size must be less than 5MB." });
      }

      if (error.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          msg: "Unexpected file field. Use form-data field 'resume'. Accepted aliases are 'cv' and 'file'.",
        });
      }

      return res.status(400).json({ msg: error.message });
    }

    if (error) {
      return res.status(400).json({ msg: error.message });
    }

    const file = getUploadedResumeFile(req.files);

    if (!file) {
      return res.status(400).json({
        msg: "Please upload exactly one CV file using form-data field 'resume'.",
      });
    }

    req.file = file;
    next();
  });
};

module.exports = uploadResumeFile;
