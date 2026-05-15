const express = require("express");
const router = express.Router();

// ================= USER CONTROLLERS =================
const {
  login,
  register,
  dashboard,
  getAllUsers,
  getProfile,
  updateProfile,
  updateProfileImage,
  deleteProfileImage,
  deleteProfile,
  uploadResume
} = require("../controllers/user");

// ================= RESUME CONTROLLERS =================
const {
  getMyResumes,
  getResume,
  updateResume,
  generateResumeInterviewQuestions,
  deleteResume,
} = require("../controllers/resume");

// ================= JOB CONTROLLERS =================
const {
  searchJobsForResume,
  getLatestJobMarketAnalysisForResume,
} = require("../controllers/job");

// ================= RECRUITMENT AGENT CONTROLLERS =================
const {
  getRecruitmentDashboard,
  startWorkflow,
  discoverMatchedJobEmails,
  receiveN8nEvent,
  listApplications,
  decideApplication,
  listNotifications,
  markNotificationRead,
  chatWithAgent,
} = require("../controllers/recruitment");

// ================= MIDDLEWARE =================
const authMiddleware = require("../middleware/auth");

const uploadCVFile = require("../middleware/uploadMiddleware");

const uploadAvatar = require("../middleware/uploadAvatar");

// ================= UPLOAD RATE LIMIT =================
const uploadHits = new Map();

const uploadLimiter = (req, res, next) => {
  const windowMs = 15 * 60 * 1000;
  const maxUploads = 10;
  const key = req.user?.id || req.ip;
  const now = Date.now();
  const hit = uploadHits.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > hit.resetAt) {
    hit.count = 0;
    hit.resetAt = now + windowMs;
  }

  hit.count += 1;
  uploadHits.set(key, hit);

  if (hit.count > maxUploads) {
    return res.status(429).json({ msg: "Too many uploads. Please try again later." });
  }

  next();
};

// ================= AUTH ROUTES =================
router.route("/login").post(login);

router.route("/register").post(register);

// ================= N8N CALLBACKS =================
router.route("/n8n/events").post(receiveN8nEvent);

// ================= DASHBOARD =================
router.route("/dashboard").get(authMiddleware, dashboard);

router
  .route("/recruitment/dashboard")
  .get(authMiddleware, getRecruitmentDashboard);

router
  .route("/recruitment/workflows")
  .post(authMiddleware, startWorkflow);

router
  .route("/recruitment/email-discovery")
  .post(authMiddleware, discoverMatchedJobEmails);

router
  .route("/recruitment/chat")
  .post(authMiddleware, chatWithAgent);

router
  .route("/applications")
  .get(authMiddleware, listApplications);

router
  .route("/applications/:id/decision")
  .post(authMiddleware, decideApplication);

router
  .route("/notifications")
  .get(authMiddleware, listNotifications);

router
  .route("/notifications/:id/read")
  .patch(authMiddleware, markNotificationRead);

// ================= USERS =================
router.route("/users").get(authMiddleware, getAllUsers);

// ================= PROFILE =================
router
  .route("/profile")
  .get(authMiddleware, getProfile)
  .patch(authMiddleware, updateProfile)
  .delete(authMiddleware, deleteProfile);

// ================= PROFILE AVATAR =================
router
  .route("/profile/avatar")
  .patch(
    authMiddleware,
    uploadAvatar,
    updateProfileImage
  )
  .delete(authMiddleware, deleteProfileImage);

// ================= CV UPLOAD =================
router.route("/cv/upload").post(
  authMiddleware,
  uploadLimiter,
  uploadCVFile,
  uploadResume
);

// ================= RESUMES =================
router
  .route("/resumes")
  .get(authMiddleware, getMyResumes);

router
  .route("/resumes/:id")
  .get(authMiddleware, getResume)
  .patch(authMiddleware, updateResume)
  .delete(authMiddleware, deleteResume);

router
  .route("/resumes/:id/interview-questions")
  .post(authMiddleware, generateResumeInterviewQuestions);

// ================= JOB OFFERS =================
router
  .route("/resumes/:resumeId/jobs/latest")
  .get(authMiddleware, getLatestJobMarketAnalysisForResume);

router
  .route("/resumes/:resumeId/jobs")
  .get(authMiddleware, searchJobsForResume);

module.exports = router;
