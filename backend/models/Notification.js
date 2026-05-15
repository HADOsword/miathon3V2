const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: {
    type: String,
    enum: [
      "AGENT_PROGRESS",
      "PROFILE_READY",
      "MARKET_READY",
      "MATCH_READY",
      "APPLICATION_READY",
      "APPLICATION_SENT",
      "RECRUITER_REPLY",
      "INTERVIEW",
      "REJECTION",
      "OFFER",
      "GHOSTED",
      "SYSTEM",
    ],
    default: "SYSTEM",
    index: true,
  },
  title: { type: String, trim: true, required: true },
  message: { type: String, trim: true, default: "" },
  severity: {
    type: String,
    enum: ["INFO", "SUCCESS", "WARNING", "ERROR"],
    default: "INFO",
  },
  readAt: { type: Date, default: null, index: true },
  action: {
    label: { type: String, trim: true, default: "" },
    href: { type: String, trim: true, default: "" },
  },
  related: {
    resume: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", default: null },
    application: { type: mongoose.Schema.Types.ObjectId, ref: "Application", default: null },
    agentRun: { type: mongoose.Schema.Types.ObjectId, ref: "AgentRun", default: null },
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

NotificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);
