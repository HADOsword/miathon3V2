const mongoose = require("mongoose");

const JobOpportunitySchema = new mongoose.Schema({
  externalId: { type: String, trim: true, required: true },
  source: {
    type: String,
    enum: ["jsearch", "partner"],
    required: true,
  },
  title: { type: String, trim: true, required: true, index: true },
  companyName: { type: String, trim: true, default: "", index: true },
  companyDomain: { type: String, trim: true, lowercase: true, default: "" },
  companyWebsite: { type: String, trim: true, default: "" },
  description: { type: String, default: "" },
  applyUrl: { type: String, trim: true, default: "" },
  employmentType: { type: String, trim: true, default: "" },
  location: {
    country: { type: String, trim: true, default: "", index: true },
    city: { type: String, trim: true, default: "", index: true },
    region: { type: String, trim: true, default: "" },
    raw: { type: String, trim: true, default: "" },
    isRemote: { type: Boolean, default: false, index: true },
  },
  salary: {
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    currency: { type: String, trim: true, default: "" },
    period: { type: String, trim: true, default: "" },
    raw: { type: String, trim: true, default: "" },
  },
  postedAt: { type: Date, default: null, index: true },
  expiresAt: { type: Date, default: null, index: true },
  qualityFlags: {
    duplicate: { type: Boolean, default: false },
    expired: { type: Boolean, default: false },
    suspicious: { type: Boolean, default: false },
    lowQuality: { type: Boolean, default: false },
  },
  contacts: {
    type: [{
      email: { type: String, trim: true, lowercase: true, required: true },
      firstName: { type: String, trim: true, default: "" },
      lastName: { type: String, trim: true, default: "" },
      fullName: { type: String, trim: true, default: "" },
      position: { type: String, trim: true, default: "" },
      department: { type: String, trim: true, default: "" },
      seniority: { type: String, trim: true, default: "" },
      type: { type: String, trim: true, default: "" },
      confidence: { type: Number, min: 0, max: 100, default: 0 },
      phoneNumber: { type: String, trim: true, default: "" },
      linkedinUrl: { type: String, trim: true, default: "" },
      source: {
        type: String,
        enum: ["hunter", "apollo", "job_api", "manual"],
        default: "hunter",
      },
      selectionReason: { type: String, trim: true, default: "" },
      discoveredAt: { type: Date, default: Date.now },
      raw: { type: mongoose.Schema.Types.Mixed, default: {} },
    }],
    default: [],
  },
  emailDiscovery: {
    status: {
      type: String,
      enum: ["NOT_STARTED", "RUNNING", "FOUND", "NOT_FOUND", "FAILED"],
      default: "NOT_STARTED",
      index: true,
    },
    source: { type: String, trim: true, default: "" },
    domain: { type: String, trim: true, lowercase: true, default: "" },
    lastCheckedAt: { type: Date, default: null },
    error: { type: String, trim: true, default: "" },
  },
  raw: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

JobOpportunitySchema.index({ source: 1, externalId: 1 }, { unique: true });
JobOpportunitySchema.index({ title: "text", description: "text", companyName: "text" });
JobOpportunitySchema.index({ "contacts.email": 1 });

module.exports = mongoose.model("JobOpportunity", JobOpportunitySchema);
