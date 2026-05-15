const mongoose = require("mongoose");

const ApplicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  resume: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", required: true, index: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: "JobOpportunity", required: true, index: true },
  jobMatch: { type: mongoose.Schema.Types.ObjectId, ref: "JobMatch", default: null, index: true },
  recruiter: {
    email: { type: String, trim: true, lowercase: true, default: "" },
    name: { type: String, trim: true, default: "" },
    source: {
      type: String,
      enum: ["job_api", "hunter", "apollo", "partner", "manual", ""],
      default: "",
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  draft: {
    subject: { type: String, trim: true, default: "" },
    body: { type: String, default: "" },
    coverLetter: { type: String, default: "" },
    factualityWarnings: { type: [String], default: [] },
    generatedBy: { type: String, trim: true, default: "n8n" },
    generatedAt: { type: Date, default: null },
  },
  approval: {
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "EDITED", "REJECTED", "POSTPONED"],
      default: "PENDING",
      index: true,
    },
    decidedAt: { type: Date, default: null },
    editedSubject: { type: String, trim: true, default: "" },
    editedBody: { type: String, default: "" },
    editedCoverLetter: { type: String, default: "" },
    note: { type: String, trim: true, default: "" },
  },
  email: {
    provider: { type: String, enum: ["gmail", ""], default: "" },
    threadId: { type: String, trim: true, default: "", index: true },
    messageId: { type: String, trim: true, default: "", index: true },
    sentAt: { type: Date, default: null },
  },
  status: {
    type: String,
    enum: [
      "DRAFT_READY",
      "WAITING_USER_APPROVAL",
      "APPROVED",
      "REJECTED_BY_USER",
      "POSTPONED",
      "SENT",
      "PENDING",
      "INTERVIEW",
      "ACCEPTED",
      "REJECTED",
      "GHOSTED",
      "OFFER",
      "FAILED",
    ],
    default: "WAITING_USER_APPROVAL",
    index: true,
  },
  statusReason: { type: String, trim: true, default: "" },
  lastReplyAt: { type: Date, default: null },
  nextAction: { type: String, trim: true, default: "" },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

ApplicationSchema.index({ user: 1, status: 1, updatedAt: -1 });
ApplicationSchema.index({ user: 1, job: 1 }, { unique: true });

module.exports = mongoose.model("Application", ApplicationSchema);
