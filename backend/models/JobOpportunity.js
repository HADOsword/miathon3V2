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
  raw: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

JobOpportunitySchema.index({ source: 1, externalId: 1 }, { unique: true });
JobOpportunitySchema.index({ title: "text", description: "text", companyName: "text" });

module.exports = mongoose.model("JobOpportunity", JobOpportunitySchema);
