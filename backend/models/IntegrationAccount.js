const mongoose = require("mongoose");

const IntegrationAccountSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  provider: {
    type: String,
    enum: ["gmail", "google", "hunter", "apollo", "jsearch"],
    required: true,
  },
  status: {
    type: String,
    enum: ["CONNECTED", "DISCONNECTED", "ERROR", "EXPIRED"],
    default: "DISCONNECTED",
    index: true,
  },
  externalAccountId: { type: String, trim: true, default: "" },
  email: { type: String, trim: true, lowercase: true, default: "" },
  scopes: { type: [String], default: [] },
  tokenRef: { type: String, trim: true, default: "" },
  expiresAt: { type: Date, default: null },
  lastSyncedAt: { type: Date, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

IntegrationAccountSchema.index({ user: 1, provider: 1 }, { unique: true });

module.exports = mongoose.model("IntegrationAccount", IntegrationAccountSchema);
