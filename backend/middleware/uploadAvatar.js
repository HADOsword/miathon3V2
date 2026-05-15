const multer = require("multer");

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, WEBP, and GIF images are accepted."));
    }

    cb(null, true);
  },
}).single("avatar");

const uploadAvatar = (req, res, next) => {
  if (!req.user?.id) {
    return res.status(401).json({ msg: "Unauthorized. Please add valid token" });
  }

  upload(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ msg: "Image size must be less than 2MB." });
      }

      return res.status(400).json({ msg: error.message });
    }

    if (error) {
      return res.status(400).json({ msg: error.message });
    }

    next();
  });
};

module.exports = uploadAvatar;
