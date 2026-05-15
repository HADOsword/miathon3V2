const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Resume = require("../models/Resume");
const CandidateProfile = require("../models/CandidateProfile");
const AgentRun = require("../models/AgentRun");
const Notification = require("../models/Notification");
const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");
const { analyzeCV, generateInterviewQuestions } = require("../services/gemini");
const { triggerWorkflow } = require("../services/n8n");
const { mapResumeAnalysisToProfile } = require("../services/profileMapper");

const createToken = (user) =>
  jwt.sign({ id: user._id, name: user.name }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

const getAvatarUrl = (user) => {
  const imageData = user.profileImage?.data;
  const mimeType = user.profileImage?.mimeType;

  if (!imageData || !mimeType) {
    return "";
  }

  return `data:${mimeType};base64,${imageData.toString("base64")}`;
};

const formatUserProfile = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatarUrl: getAvatarUrl(user),
});

const withQuestionMetadata = (questionResult) => ({
  ...questionResult.result,
  provider: questionResult.provider,
  model: questionResult.model,
  warning: questionResult.warning || "",
  generated_at: new Date().toISOString(),
});

const allowedResumeTypes = new Map([
  ["application/pdf", ".pdf"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
]);

const allowedAvatarMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const emailRegex =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const removeUploadedFile = async (filePath) => {
  if (!filePath) {
    return;
  }

  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(__dirname, "..", filePath);

  await fsPromises.unlink(absolutePath).catch(() => {});
};

const detectFileType = async (buffer) => {
  const { fileTypeFromBuffer } = await import("file-type");
  return fileTypeFromBuffer(buffer);
};

const validateUploadedResume = async (file, buffer) => {
  const expectedExtension = allowedResumeTypes.get(file.mimetype);
  const ext = path.extname(file.originalname).toLowerCase();

  if (!expectedExtension || ext !== expectedExtension) {
    return "Only valid PDF and DOCX files are allowed.";
  }

  const detectedType = await detectFileType(buffer);

  if (!detectedType || detectedType.mime !== file.mimetype) {
    return "Uploaded file content does not match its file type.";
  }

  return "";
};

const validateUploadedAvatar = async (file) => {
  if (!allowedAvatarMimeTypes.has(file.mimetype)) {
    return "Only JPG, PNG, WEBP, and GIF images are accepted.";
  }

  const detectedType = await detectFileType(file.buffer);

  if (!detectedType || detectedType.mime !== file.mimetype) {
    return "Uploaded image content does not match its file type.";
  }

  return "";
};

const extractResumeText = async (file, buffer) => {
  if (file.mimetype === "application/pdf") {
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();
      return result.text || "";
    } finally {
      await parser.destroy().catch(() => {});
    }
  }

  if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  return "";
};

const login = async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const { password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      msg: "Bad request. Please add email and password in the request body",
    });
  }

  let foundUser = await User.findOne({ email }).select("+password");
  if (foundUser) {
    const isMatch = await foundUser.comparePassword(password);

    if (isMatch) {
      const token = createToken(foundUser);

      return res.status(200).json({ msg: "user logged in", token });
    } else {
      return res.status(400).json({ msg: "Bad password" });
    }
  } else {
    return res.status(400).json({ msg: "Bad credentails" });
  }
};

const dashboard = async (req, res) => {
  const luckyNumber = Math.floor(Math.random() * 100);

  res.status(200).json({
    msg: `Hello, ${req.user.name}`,
    secret: `Here is your authorized data, your lucky number is ${luckyNumber}`,
  });
};

const getAllUsers = async (req, res) => {
  let users = await User.find({}).select("_id name email profileImage.mimeType createdAt updatedAt");

  return res.status(200).json({ users });
};

const getProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select("+profileImage.data");

  if (!user) {
    return res.status(404).json({ msg: "User not found." });
  }

  return res.status(200).json({ user: formatUserProfile(user) });
};

const updateProfile = async (req, res) => {
  const user = await User.findById(req.user.id)
    .select("+profileImage.data +password");

  if (!user) {
    return res.status(404).json({ msg: "User not found." });
  }

  const { name, email, currentPassword, newPassword } = req.body;
  const requestedName = typeof name === "string"
    ? name
    : typeof req.body.username === "string"
      ? req.body.username
      : undefined;
  let hasUpdates = false;

  if (typeof requestedName === "string") {
    const cleanName = requestedName.trim();

    if (cleanName.length < 3 || cleanName.length > 50) {
      return res.status(400).json({ msg: "Name must be between 3 and 50 characters." });
    }

    user.name = cleanName;
    hasUpdates = true;
  }

  if (typeof email === "string") {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({ msg: "Email is required." });
    }

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ msg: "Please provide a valid email." });
    }

    const existingUser = await User.findOne({
      email: cleanEmail,
      _id: { $ne: user._id },
    });

    if (existingUser) {
      return res.status(400).json({ msg: "Email already in use." });
    }

    user.email = cleanEmail;
    hasUpdates = true;
  }

  if (typeof newPassword === "string" || typeof currentPassword === "string") {
    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return res.status(400).json({ msg: "Please provide currentPassword and newPassword." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ msg: "Password must be at least 8 characters." });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({ msg: "Current password is incorrect." });
    }

    user.password = newPassword;
    hasUpdates = true;
  }

  if (!hasUpdates) {
    return res.status(400).json({ msg: "No valid profile fields were provided." });
  }

  await user.save();

  return res.status(200).json({
    msg: "Profile updated successfully",
    token: createToken(user),
    user: formatUserProfile(user),
  });
};

const updateProfileImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: "Please upload a profile image." });
  }

  const validationError = await validateUploadedAvatar(req.file);

  if (validationError) {
    return res.status(400).json({ msg: validationError });
  }

  const user = await User.findById(req.user.id).select("+profileImage.data");

  if (!user) {
    return res.status(404).json({ msg: "User not found." });
  }

  user.profileImage = {
    data: req.file.buffer,
    mimeType: req.file.mimetype,
  };
  await user.save();

  return res.status(200).json({
    msg: "Profile image updated successfully",
    user: formatUserProfile(user),
  });
};

const deleteProfileImage = async (req, res) => {
  const user = await User.findById(req.user.id).select("+profileImage.data");

  if (!user) {
    return res.status(404).json({ msg: "User not found." });
  }

  user.profileImage.data = undefined;
  user.profileImage.mimeType = "";
  await user.save();

  return res.status(200).json({
    msg: "Profile image removed successfully",
    user: formatUserProfile(user),
  });
};

const deleteProfile = async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ msg: "User not found." });
  }

  const resumes = await Resume.find({ user: req.user.id }).select("filePath");

  await Promise.all(resumes.map((resume) => removeUploadedFile(resume.filePath)));
  await Resume.deleteMany({ user: req.user.id });
  await User.deleteOne({ _id: req.user.id });

  return res.status(200).json({ msg: "Profile deleted successfully" });
};

const register = async (req, res) => {
  const usernameSource = typeof req.body.username === "string"
    ? req.body.username
    : typeof req.body.name === "string"
      ? req.body.name
      : "";
  const username = usernameSource.trim();
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!username || !email || !password) {
    return res.status(400).json({ msg: "Please add all values in the request body" });
  }

  if (username.length < 3 || username.length > 50) {
    return res.status(400).json({ msg: "Name must be between 3 and 50 characters." });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ msg: "Please provide a valid email." });
  }

  if (password.length < 8) {
    return res.status(400).json({ msg: "Password must be at least 8 characters." });
  }

  let foundUser = await User.findOne({ email });
  if (foundUser) {
    return res.status(400).json({ msg: "Email already in use" });
  }

  const person = new User({
    name: username,
    email,
    password,
  });
  await person.save();

  return res.status(201).json({
    msg: "User registered successfully",
    user: formatUserProfile(person),
  });
};


const uploadResume = async (req, res) => {

  try {

    if (!req.file) {
      return res.status(400).json({
        msg: "No CV uploaded"
      });
    }

    const dataBuffer = fs.readFileSync(req.file.path);
    const validationError = await validateUploadedResume(req.file, dataBuffer);

    if (validationError) {
      await removeUploadedFile(req.file.path);
      return res.status(400).json({ msg: validationError });
    }

    const extractedText = await extractResumeText(req.file, dataBuffer);
    const cleanedText = extractedText.replace(/\s+/g, ' ').trim();

    if (!cleanedText) {
      await removeUploadedFile(req.file.path);
      return res.status(400).json({ msg: "Could not extract readable text from the uploaded CV." });
    }

    const shouldUseN8n = process.env.USE_N8N_RESUME_WORKFLOW !== "false";

    if (shouldUseN8n) {
      const resume = await Resume.create({
        user: req.user.id,
        title: path.parse(req.file.originalname).name,
        originalFileName: req.file.originalname,
        storedFileName: req.file.filename,
        filePath: req.file.path,
        mimeType: req.file.mimetype,
        size: req.file.size,
        extractedText: cleanedText,
        processingStatus: "PARSING",
        analysisProvider: "n8n",
      });

      const agentRun = await AgentRun.create({
        user: req.user.id,
        resume: resume._id,
        workflow: "RESUME_UPLOAD",
        status: "QUEUED",
        currentStep: "Resume uploaded, waiting for n8n profile extraction",
        input: {
          resumeId: resume._id,
          originalFileName: resume.originalFileName,
          mimeType: resume.mimeType,
          size: resume.size,
        },
      });

      const n8nResult = await triggerWorkflow("RESUME_UPLOAD", {
        userId: req.user.id,
        resumeId: resume._id,
        agentRunId: agentRun._id,
        originalFileName: resume.originalFileName,
        storedFileName: resume.storedFileName,
        filePath: resume.filePath,
        mimeType: resume.mimeType,
        extractedText: cleanedText,
      });

      agentRun.correlationId = n8nResult.correlationId;
      agentRun.events.push({
        type: n8nResult.triggered ? "N8N_TRIGGERED" : "N8N_NOT_CONFIGURED",
        message: n8nResult.warning || "Resume analysis workflow started.",
        metadata: n8nResult.data || {},
      });
      await agentRun.save();

      await Notification.create({
        user: req.user.id,
        type: "AGENT_PROGRESS",
        title: "Resume received",
        message: n8nResult.triggered
          ? "The recruitment agent has started profile extraction."
          : "Resume is stored. Configure the n8n resume webhook to automate extraction.",
        related: { resume: resume._id, agentRun: agentRun._id },
      });

      return res.status(202).json({
        success: true,
        msg: n8nResult.triggered
          ? "CV uploaded. n8n resume analysis workflow started."
          : "CV uploaded. n8n resume webhook is not configured yet.",
        resume,
        agentRun,
        n8n: n8nResult,
      });
    }

    const aiResult = await analyzeCV(cleanedText);
    const questionResult = await generateInterviewQuestions(aiResult.result);
    const analysis = {
      ...aiResult.result,
      interview_questions: withQuestionMetadata(questionResult),
    };

    const resume = await Resume.create({

      user: req.user.id,

      title: path.parse(req.file.originalname).name,

      originalFileName: req.file.originalname,

      storedFileName: req.file.filename,

      filePath: req.file.path,

      mimeType: req.file.mimetype,

      size: req.file.size,

      extractedText: cleanedText,

      analysis,

      analysisProvider: aiResult.provider,

      analysisModel: aiResult.model,

      processingStatus: "PROFILE_EXTRACTED"

    });

    const profile = await CandidateProfile.findOneAndUpdate(
      { user: req.user.id, resume: resume._id },
      mapResumeAnalysisToProfile({
        userId: req.user.id,
        resumeId: resume._id,
        analysis,
        source: aiResult.provider,
      }),
      { upsert: true, new: true, runValidators: true }
    );

    resume.profile = profile._id;
    await resume.save();

    return res.status(201).json({
      success: true,
      resume,
      profile
    });

  } catch (error) {

    console.log(error);

    if (req.file?.path) {
      await removeUploadedFile(req.file.path);
    }

    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      msg: statusCode >= 500 && !error.expose
        ? "Something went wrong while processing your CV."
        : error.message
    });
  }
};

module.exports = {
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
};
