const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");
const Resume = require("../models/Resume");
const { generateInterviewQuestions } = require("../services/gemini");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const isPlainObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value);

const getResumeQuery = (req) => ({
  _id: req.params.id,
  user: req.user.id,
});

const withQuestionMetadata = (questionResult) => ({
  ...questionResult.result,
  provider: questionResult.provider,
  model: questionResult.model,
  warning: questionResult.warning || "",
  generated_at: new Date().toISOString(),
});

const resolveUploadPath = (filePath) => {
  if (!filePath) {
    return "";
  }

  return path.isAbsolute(filePath)
    ? filePath
    : path.join(__dirname, "..", filePath);
};

const removeResumeFile = async (filePath) => {
  const absolutePath = resolveUploadPath(filePath);

  if (!absolutePath) {
    return;
  }

  await fs.unlink(absolutePath).catch(() => {});
};

const cleanTags = (tags) => {
  if (!Array.isArray(tags)) {
    return null;
  }

  return [...new Set(
    tags
      .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
      .filter(Boolean)
  )].slice(0, 20);
};

const pickResumeFields = (body) => {
  const update = {};

  if (Object.prototype.hasOwnProperty.call(body, "title")) {
    if (typeof body.title !== "string") {
      return { error: "Title must be a string." };
    }

    const title = body.title.trim();

    if (!title || title.length > 120) {
      return { error: "Title must be between 1 and 120 characters." };
    }

    update.title = title;
  }

  if (Object.prototype.hasOwnProperty.call(body, "notes")) {
    if (typeof body.notes !== "string") {
      return { error: "Notes must be a string." };
    }

    if (body.notes.length > 2000) {
      return { error: "Notes must be less than 2000 characters." };
    }

    update.notes = body.notes.trim();
  }

  if (Object.prototype.hasOwnProperty.call(body, "tags")) {
    const tags = cleanTags(body.tags);

    if (!tags) {
      return { error: "Tags must be an array of strings." };
    }

    update.tags = tags;
  }

  if (Object.prototype.hasOwnProperty.call(body, "analysis")) {
    if (!isPlainObject(body.analysis)) {
      return { error: "Analysis must be an object." };
    }

    update.analysis = body.analysis;
  }

  if (Object.prototype.hasOwnProperty.call(body, "extractedText")) {
    if (typeof body.extractedText !== "string") {
      return { error: "Extracted text must be a string." };
    }

    const extractedText = body.extractedText.replace(/\s+/g, " ").trim();

    if (!extractedText) {
      return { error: "Extracted text cannot be empty." };
    }

    update.extractedText = extractedText;
  }

  return { update };
};

const getMyResumes = async (req, res) => {
  const resumes = await Resume.find({ user: req.user.id })
    .select("_id title originalFileName mimeType size processingStatus processingError analysisProvider analysisModel notes tags createdAt updatedAt")
    .sort({ createdAt: -1 });

  return res.status(200).json({ count: resumes.length, resumes });
};

const getResume = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ msg: "Invalid resume id." });
  }

  const resume = await Resume.findOne(getResumeQuery(req));

  if (!resume) {
    return res.status(404).json({ msg: "Resume not found." });
  }

  return res.status(200).json({ resume });
};

const updateResume = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ msg: "Invalid resume id." });
  }

  const { update, error } = pickResumeFields(req.body);

  if (error) {
    return res.status(400).json({ msg: error });
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ msg: "No valid resume fields were provided." });
  }

  const resume = await Resume.findOneAndUpdate(getResumeQuery(req), update, {
    new: true,
    runValidators: true,
  });

  if (!resume) {
    return res.status(404).json({ msg: "Resume not found." });
  }

  return res.status(200).json({
    msg: "Resume updated successfully",
    resume,
  });
};

const generateResumeInterviewQuestions = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ msg: "Invalid resume id." });
  }

  const resume = await Resume.findOne(getResumeQuery(req));

  if (!resume) {
    return res.status(404).json({ msg: "Resume not found." });
  }

  if (!isPlainObject(resume.analysis) || Object.keys(resume.analysis).length === 0) {
    return res.status(400).json({
      msg: "This CV does not have extracted analysis data to generate interview questions from.",
    });
  }

  const questionResult = await generateInterviewQuestions(resume.analysis);
  const interviewQuestions = withQuestionMetadata(questionResult);

  resume.analysis = {
    ...resume.analysis,
    interview_questions: interviewQuestions,
  };
  resume.markModified("analysis");
  await resume.save();

  return res.status(200).json({
    msg: "Interview questions generated successfully",
    interviewQuestions,
    resume,
  });
};

const deleteResume = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ msg: "Invalid resume id." });
  }

  const resume = await Resume.findOneAndDelete(getResumeQuery(req));

  if (!resume) {
    return res.status(404).json({ msg: "Resume not found." });
  }

  await removeResumeFile(resume.filePath);

  return res.status(200).json({
    msg: "Resume deleted successfully",
  });
};

module.exports = {
  getMyResumes,
  getResume,
  updateResume,
  generateResumeInterviewQuestions,
  deleteResume,
};
