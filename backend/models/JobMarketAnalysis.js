const mongoose = require("mongoose");

const JobMarketAnalysisSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  resume: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Resume",
    required: true,
    index: true,
  },

  source: {
    type: String,
    default: "jsearch",
  },

  query: {
    type: String,
    required: true,
    trim: true,
  },

  mainProfile: {
    type: String,
    trim: true,
    default: "",
  },

  seniorityLevel: {
    type: String,
    trim: true,
    default: "",
    index: true,
  },

  country: {
    type: String,
    trim: true,
    default: "",
  },

  city: {
    type: String,
    trim: true,
    default: "",
    index: true,
  },

  region: {
    type: String,
    trim: true,
    default: "",
  },

  remotePreference: {
    type: String,
    enum: ["ONSITE", "HYBRID", "REMOTE", "FLEXIBLE", "UNKNOWN", ""],
    default: "",
  },

  language: {
    type: String,
    trim: true,
    default: "",
  },

  jobsCount: {
    type: Number,
    default: 0,
  },

  jobs: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },

  marketAnalysis: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  profileComparison: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  technologyFrequency: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },

  salaryTrends: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  regionalDemandAnalysis: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  analysisProvider: {
    type: String,
    default: "gemini",
  },

  analysisModel: {
    type: String,
    default: "",
  },
}, {
  timestamps: true,
});

JobMarketAnalysisSchema.index({ user: 1, resume: 1, createdAt: -1 });

module.exports = mongoose.model("JobMarketAnalysis", JobMarketAnalysisSchema);
