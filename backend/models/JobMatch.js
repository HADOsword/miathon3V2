const mongoose = require("mongoose");

const JobMatchSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  resume: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", required: true, index: true },
  profile: { type: mongoose.Schema.Types.ObjectId, ref: "CandidateProfile", default: null, index: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: "JobOpportunity", required: true, index: true },
  marketAnalysis: { type: mongoose.Schema.Types.ObjectId, ref: "JobMarketAnalysis", default: null },
  compatibilityScore: { type: Number, min: 0, max: 100, default: 0, index: true },
  successProbability: { type: Number, min: 0, max: 100, default: 0 },
  matchingTechnologies: { type: [String], default: [] },
  missingSkills: { type: [String], default: [] },
  reasons: { type: [String], default: [] },
  recommendation: {
    type: String,
    enum: ["STRONG_MATCH", "GOOD_MATCH", "LOW_MATCH", "REJECTED"],
    default: "GOOD_MATCH",
    index: true,
  },
  status: {
    type: String,
    enum: ["MATCHED", "SHORTLISTED", "DRAFT_REQUESTED", "APPLICATION_GENERATED", "REJECTED", "EXPIRED"],
    default: "MATCHED",
    index: true,
  },
  aiRationale: { type: String, trim: true, default: "" },
}, { timestamps: true });

JobMatchSchema.index({ user: 1, compatibilityScore: -1, createdAt: -1 });
JobMatchSchema.index({ user: 1, job: 1 }, { unique: true });

module.exports = mongoose.model("JobMatch", JobMatchSchema);
