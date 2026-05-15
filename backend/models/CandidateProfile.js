const mongoose = require("mongoose");

const geoProfileSchema = new mongoose.Schema({
  country: { type: String, trim: true, default: "" },
  city: { type: String, trim: true, default: "" },
  region: { type: String, trim: true, default: "" },
  timezone: { type: String, trim: true, default: "" },
  preferredWorkLocations: { type: [String], default: [] },
  remotePreference: {
    type: String,
    enum: ["ONSITE", "HYBRID", "REMOTE", "FLEXIBLE", "UNKNOWN"],
    default: "UNKNOWN",
  },
  relocationPreference: {
    type: String,
    enum: ["YES", "NO", "OPEN", "UNKNOWN"],
    default: "UNKNOWN",
  },
}, { _id: false });

const CandidateProfileSchema = new mongoose.Schema({
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
  fullName: { type: String, trim: true, default: "" },
  email: { type: String, trim: true, lowercase: true, default: "" },
  phone: { type: String, trim: true, default: "" },
  mainProfile: { type: String, trim: true, default: "", index: true },
  seniorityLevel: {
    type: String,
    enum: ["Intern", "Entry-level", "Junior", "Mid-Level", "Senior", "Lead", "Architect", "Unknown", ""],
    default: "",
    index: true,
  },
  yearsOfExperience: { type: Number, min: 0, default: 0 },
  hardSkills: { type: [String], default: [] },
  softSkills: { type: [String], default: [] },
  technologies: { type: [String], default: [] },
  frameworks: { type: [String], default: [] },
  certifications: { type: [String], default: [] },
  languages: { type: [String], default: [] },
  tools: { type: [String], default: [] },
  cloudPlatforms: { type: [String], default: [] },
  devOpsTools: { type: [String], default: [] },
  databases: { type: [String], default: [] },
  education: { type: [mongoose.Schema.Types.Mixed], default: [] },
  experience: { type: [mongoose.Schema.Types.Mixed], default: [] },
  projects: { type: [mongoose.Schema.Types.Mixed], default: [] },
  geoProfile: { type: geoProfileSchema, default: () => ({}) },
  rawAnalysis: { type: mongoose.Schema.Types.Mixed, default: {} },
  source: {
    type: String,
    enum: ["n8n", "gemini", "openai", "manual", "system"],
    default: "n8n",
  },
}, { timestamps: true });

CandidateProfileSchema.index({ user: 1, resume: 1 }, { unique: true });
CandidateProfileSchema.index({ "geoProfile.country": 1, "geoProfile.city": 1 });

module.exports = mongoose.model("CandidateProfile", CandidateProfileSchema);
