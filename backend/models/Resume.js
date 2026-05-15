const mongoose = require("mongoose");

const ResumeSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    title: {
        type: String,
        trim: true,
        maxlength: 120,
        default: function () {
            return this.originalFileName
                ? this.originalFileName.replace(/\.[^/.]+$/, "")
                : "";
        }
    },

    originalFileName: {
        type: String,
        trim: true,
        required: true
    },

    storedFileName: {
        type: String,
        trim: true,
        default: ""
    },

    filePath: {
        type: String,
        trim: true,
        required: true
    },

    mimeType: {
        type: String,
        enum: [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],
        required: true
    },

    size: {
        type: Number,
        min: 0,
        required: true
    },

    extractedText: {
        type: String,
        default: ""
    },

    processingStatus: {
        type: String,
        enum: ["UPLOADED", "PARSING", "ANALYZING", "PROFILE_EXTRACTED", "FAILED"],
        default: "UPLOADED",
        index: true
    },

    processingError: {
        type: String,
        trim: true,
        default: ""
    },

    analysis: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    profile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CandidateProfile",
        default: null,
        index: true
    },

    analysisProvider: {
        type: String,
        trim: true,
        default: "gemini"
    },

    analysisModel: {
        type: String,
        trim: true,
        default: ""
    },

    notes: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: ""
    },

    tags: {
        type: [String],
        default: [],
        validate: {
            validator: (tags) => tags.length <= 20,
            message: "A resume can have at most 20 tags."
        }
    }

}, {
    timestamps: true
});

ResumeSchema.pre("validate", function () {
    if (Array.isArray(this.tags)) {
        this.tags = this.tags
            .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
            .filter(Boolean)
            .slice(0, 20);
    }
});

ResumeSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Resume", ResumeSchema);
