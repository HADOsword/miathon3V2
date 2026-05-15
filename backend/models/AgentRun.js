const mongoose = require("mongoose");

const AgentRunSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  resume: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Resume",
    default: null,
    index: true,
  },
  workflow: {
    type: String,
    enum: [
      "RESUME_UPLOAD",
      "MARKET_ANALYSIS",
      "JOB_MATCHING",
      "EMAIL_DISCOVERY",
      "APPLICATION_GENERATION",
      "EMAIL_SENDING",
      "GMAIL_MONITORING",
      "NOTIFICATION",
      "CHAT",
    ],
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ["QUEUED", "RUNNING", "WAITING_USER_APPROVAL", "COMPLETED", "FAILED", "CANCELLED"],
    default: "QUEUED",
    index: true,
  },
  currentStep: { type: String, trim: true, default: "" },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  correlationId: { type: String, trim: true, default: "", index: true },
  n8nExecutionId: { type: String, trim: true, default: "", index: true },
  input: { type: mongoose.Schema.Types.Mixed, default: {} },
  output: { type: mongoose.Schema.Types.Mixed, default: {} },
  error: { type: String, trim: true, default: "" },
  events: {
    type: [{
      type: { type: String, trim: true, default: "INFO" },
      message: { type: String, trim: true, default: "" },
      metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
      createdAt: { type: Date, default: Date.now },
    }],
    default: [],
  },
}, { timestamps: true });

AgentRunSchema.index({ user: 1, createdAt: -1 });
AgentRunSchema.index({ correlationId: 1, workflow: 1 });

module.exports = mongoose.model("AgentRun", AgentRunSchema);
