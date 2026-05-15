const mongoose = require("mongoose");
const Resume = require("../models/Resume");
const CandidateProfile = require("../models/CandidateProfile");
const AgentRun = require("../models/AgentRun");
const JobOpportunity = require("../models/JobOpportunity");
const JobMatch = require("../models/JobMatch");
const Application = require("../models/Application");
const Notification = require("../models/Notification");
const JobMarketAnalysis = require("../models/JobMarketAnalysis");
const { triggerWorkflow, verifySignature } = require("../services/n8n");
const { mapResumeAnalysisToProfile } = require("../services/profileMapper");
const { mapApiJobToOpportunity, mapMatchPayload } = require("../services/applicationMapper");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.expose = true;
  return error;
};

const getUserObjectId = (req) => req.body.userId || req.user?.id;

const getRecruitmentDashboard = async (req, res) => {
  const userId = req.user.id;

  const [
    latestProfile,
    latestMarketAnalysis,
    matches,
    applications,
    notifications,
    agentRuns,
    counts,
  ] = await Promise.all([
    CandidateProfile.findOne({ user: userId }).sort({ updatedAt: -1 }),
    JobMarketAnalysis.findOne({ user: userId }).sort({ updatedAt: -1 }),
    JobMatch.find({ user: userId })
      .populate("job")
      .sort({ compatibilityScore: -1, createdAt: -1 })
      .limit(10),
    Application.find({ user: userId })
      .populate("job")
      .sort({ updatedAt: -1 })
      .limit(10),
    Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(20),
    AgentRun.find({ user: userId }).sort({ updatedAt: -1 }).limit(12),
    Application.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  return res.status(200).json({
    profile: latestProfile,
    marketAnalysis: latestMarketAnalysis,
    matches,
    applications,
    notifications,
    agentRuns,
    applicationStatusCounts: counts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
  });
};

const startWorkflow = async (req, res) => {
  const workflow = String(req.body.workflow || "").trim().toUpperCase();
  const resumeId = req.body.resumeId || null;

  if (!workflow) {
    throw badRequest("workflow is required.");
  }

  if (resumeId && !isValidObjectId(resumeId)) {
    throw badRequest("Invalid resume id.");
  }

  if (resumeId) {
    const resume = await Resume.findOne({ _id: resumeId, user: req.user.id });

    if (!resume) {
      return res.status(404).json({ msg: "Resume not found." });
    }
  }

  const agentRun = await AgentRun.create({
    user: req.user.id,
    resume: resumeId,
    workflow,
    status: "QUEUED",
    currentStep: "Waiting for n8n workflow",
    input: req.body.input || {},
  });

  const n8nResult = await triggerWorkflow(workflow, {
    userId: req.user.id,
    resumeId,
    agentRunId: agentRun._id,
    input: req.body.input || {},
  });

  agentRun.correlationId = n8nResult.correlationId;
  agentRun.events.push({
    type: n8nResult.triggered ? "N8N_TRIGGERED" : "N8N_NOT_CONFIGURED",
    message: n8nResult.warning || `${workflow} workflow started.`,
    metadata: n8nResult.data || {},
  });
  await agentRun.save();

  return res.status(202).json({
    msg: n8nResult.triggered
      ? "Recruitment workflow queued in n8n."
      : "Workflow recorded, but n8n webhook is not configured.",
    agentRun,
    n8n: n8nResult,
  });
};

const updateAgentRunFromN8n = async (payload) => {
  const agentRunId = payload.agentRunId;
  const query = agentRunId && isValidObjectId(agentRunId)
    ? { _id: agentRunId }
    : { correlationId: payload.correlationId };

  const agentRun = await AgentRun.findOne(query);

  if (!agentRun) {
    return null;
  }

  if (payload.status) {
    agentRun.status = payload.status;
  }

  if (payload.currentStep) {
    agentRun.currentStep = payload.currentStep;
  }

  if (typeof payload.progress !== "undefined") {
    agentRun.progress = Math.max(0, Math.min(100, Number(payload.progress) || 0));
  }

  if (payload.n8nExecutionId) {
    agentRun.n8nExecutionId = payload.n8nExecutionId;
  }

  if (payload.output) {
    agentRun.output = payload.output;
  }

  if (payload.error) {
    agentRun.error = payload.error;
  }

  agentRun.events.push({
    type: payload.eventType || "N8N_UPDATE",
    message: payload.message || payload.currentStep || "n8n workflow update received.",
    metadata: payload.metadata || {},
  });

  await agentRun.save();
  return agentRun;
};

const handleResumeAnalysisResult = async (payload, agentRun) => {
  const resumeId = payload.resumeId || agentRun?.resume;
  const userId = payload.userId || agentRun?.user;

  if (!resumeId || !userId || !payload.analysis) {
    return null;
  }

  const profileData = mapResumeAnalysisToProfile({
    userId,
    resumeId,
    analysis: payload.analysis,
    source: "n8n",
  });

  const profile = await CandidateProfile.findOneAndUpdate(
    { user: userId, resume: resumeId },
    profileData,
    { upsert: true, new: true, runValidators: true }
  );

  await Resume.findOneAndUpdate(
    { _id: resumeId, user: userId },
    {
      extractedText: payload.extractedText || undefined,
      analysis: payload.analysis,
      analysisProvider: payload.analysisProvider || "n8n",
      analysisModel: payload.analysisModel || "",
      processingStatus: "PROFILE_EXTRACTED",
      processingError: "",
      profile: profile._id,
    },
    { new: true }
  );

  await Notification.create({
    user: userId,
    type: "PROFILE_READY",
    title: "Candidate profile ready",
    message: `${profile.mainProfile || "Profile"} analysis is ready for market matching.`,
    severity: "SUCCESS",
    related: { resume: resumeId, agentRun: agentRun?._id },
  });

  return profile;
};

const handleMarketAnalysisResult = async (payload, agentRun) => {
  if (!payload.resumeId || !payload.userId) {
    return null;
  }

  const analysis = await JobMarketAnalysis.create({
    user: payload.userId,
    resume: payload.resumeId,
    source: payload.source || "n8n",
    query: payload.query || "",
    mainProfile: payload.mainProfile || "",
    country: payload.country || "",
    language: payload.language || "",
    jobsCount: Array.isArray(payload.jobs) ? payload.jobs.length : payload.jobsCount || 0,
    jobs: payload.jobs || [],
    marketAnalysis: payload.marketAnalysis || {},
    profileComparison: payload.profileComparison || {},
    analysisProvider: payload.analysisProvider || "n8n",
    analysisModel: payload.analysisModel || "",
  });

  await Notification.create({
    user: payload.userId,
    type: "MARKET_READY",
    title: "Market analysis ready",
    message: `Regional demand analysis for ${analysis.mainProfile || analysis.query} is available.`,
    severity: "SUCCESS",
    related: { resume: payload.resumeId, agentRun: agentRun?._id },
  });

  return analysis;
};

const handleJobMatchesResult = async (payload, agentRun) => {
  const userId = payload.userId || agentRun?.user;
  const resumeId = payload.resumeId || agentRun?.resume;
  const matches = Array.isArray(payload.matches) ? payload.matches : [];
  const savedMatches = [];

  for (const item of matches) {
    const jobPayload = item.job || item;
    const jobData = mapApiJobToOpportunity(jobPayload);

    if (!jobData.externalId || !jobData.title) {
      continue;
    }

    const job = await JobOpportunity.findOneAndUpdate(
      { source: jobData.source, externalId: jobData.externalId },
      jobData,
      { upsert: true, new: true, runValidators: true }
    );

    const matchData = mapMatchPayload({
      userId,
      resumeId,
      profileId: payload.profileId || null,
      marketAnalysisId: payload.marketAnalysisId || null,
      jobId: job._id,
      match: item,
    });

    const match = await JobMatch.findOneAndUpdate(
      { user: userId, job: job._id },
      matchData,
      { upsert: true, new: true, runValidators: true }
    );

    savedMatches.push(match);
  }

  if (savedMatches.length > 0) {
    await Notification.create({
      user: userId,
      type: "MATCH_READY",
      title: "Job matches ready",
      message: `${savedMatches.length} high-quality job matches were saved.`,
      severity: "SUCCESS",
      related: { resume: resumeId, agentRun: agentRun?._id },
    });
  }

  return savedMatches;
};

const handleApplicationDraftResult = async (payload, agentRun) => {
  const userId = payload.userId || agentRun?.user;
  const applications = Array.isArray(payload.applications)
    ? payload.applications
    : [payload.application].filter(Boolean);
  const savedApplications = [];

  for (const item of applications) {
    if (!item.jobId || !item.resumeId) {
      continue;
    }

    const application = await Application.findOneAndUpdate(
      { user: userId, job: item.jobId },
      {
        user: userId,
        resume: item.resumeId,
        job: item.jobId,
        jobMatch: item.jobMatchId || null,
        recruiter: item.recruiter || {},
        draft: {
          subject: item.subject || item.draft?.subject || "",
          body: item.body || item.draft?.body || "",
          coverLetter: item.coverLetter || item.draft?.coverLetter || "",
          factualityWarnings: item.factualityWarnings || item.draft?.factualityWarnings || [],
          generatedBy: "n8n",
          generatedAt: new Date(),
        },
        status: "WAITING_USER_APPROVAL",
      },
      { upsert: true, new: true, runValidators: true }
    );

    savedApplications.push(application);
  }

  if (savedApplications.length > 0) {
    await Notification.create({
      user: userId,
      type: "APPLICATION_READY",
      title: "Application drafts need approval",
      message: `${savedApplications.length} generated applications are waiting for your decision.`,
      severity: "INFO",
      related: { agentRun: agentRun?._id },
      action: { label: "Review applications", href: "/applications" },
    });
  }

  return savedApplications;
};

const handleApplicationStatusResult = async (payload, agentRun) => {
  const applicationId = payload.applicationId;

  if (!applicationId || !isValidObjectId(applicationId)) {
    return null;
  }

  const update = {};

  if (payload.status) {
    update.status = payload.status;
  }

  if (payload.statusReason) {
    update.statusReason = payload.statusReason;
  }

  if (payload.threadId || payload.messageId || payload.sentAt) {
    update.email = {
      provider: "gmail",
      threadId: payload.threadId || "",
      messageId: payload.messageId || "",
      sentAt: payload.sentAt || null,
    };
  }

  if (payload.lastReplyAt) {
    update.lastReplyAt = payload.lastReplyAt;
  }

  if (payload.nextAction) {
    update.nextAction = payload.nextAction;
  }

  const application = await Application.findOneAndUpdate(
    { _id: applicationId },
    update,
    { new: true, runValidators: true }
  );

  if (application) {
    await Notification.create({
      user: application.user,
      type: payload.notificationType || "RECRUITER_REPLY",
      title: payload.notificationTitle || `Application status: ${application.status}`,
      message: payload.statusReason || application.nextAction || "Application status changed.",
      severity: payload.notificationSeverity || "INFO",
      related: { application: application._id, agentRun: agentRun?._id },
    });
  }

  return application;
};

const receiveN8nEvent = async (req, res) => {
  if (!verifySignature(req.body, req.headers["x-n8n-signature"], req.headers["x-n8n-secret"])) {
    return res.status(401).json({ msg: "Invalid n8n signature." });
  }

  const payload = req.body || {};
  const agentRun = await updateAgentRunFromN8n(payload);
  let result = null;

  if (payload.type === "RESUME_ANALYSIS_RESULT") {
    result = await handleResumeAnalysisResult(payload, agentRun);
  }

  if (payload.type === "MARKET_ANALYSIS_RESULT") {
    result = await handleMarketAnalysisResult(payload, agentRun);
  }

  if (payload.type === "JOB_MATCHES_RESULT") {
    result = await handleJobMatchesResult(payload, agentRun);
  }

  if (payload.type === "APPLICATION_DRAFT_RESULT") {
    result = await handleApplicationDraftResult(payload, agentRun);
  }

  if (payload.type === "APPLICATION_STATUS_RESULT") {
    result = await handleApplicationStatusResult(payload, agentRun);
  }

  return res.status(200).json({
    msg: "n8n event accepted.",
    agentRun,
    result,
  });
};

const listApplications = async (req, res) => {
  const applications = await Application.find({ user: req.user.id })
    .populate("job")
    .populate("resume", "title originalFileName")
    .sort({ updatedAt: -1 });

  return res.status(200).json({ count: applications.length, applications });
};

const decideApplication = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ msg: "Invalid application id." });
  }

  const decision = String(req.body.decision || "").trim().toUpperCase();
  const allowed = new Set(["APPROVE", "EDIT", "REJECT", "POSTPONE"]);

  if (!allowed.has(decision)) {
    return res.status(400).json({ msg: "decision must be APPROVE, EDIT, REJECT, or POSTPONE." });
  }

  const application = await Application.findOne({ _id: req.params.id, user: req.user.id });

  if (!application) {
    return res.status(404).json({ msg: "Application not found." });
  }

  const statusByDecision = {
    APPROVE: "APPROVED",
    EDIT: "EDITED",
    REJECT: "REJECTED",
    POSTPONE: "POSTPONED",
  };

  application.approval = {
    ...application.approval,
    status: statusByDecision[decision],
    decidedAt: new Date(),
    editedSubject: req.body.subject || application.approval.editedSubject || "",
    editedBody: req.body.body || application.approval.editedBody || "",
    editedCoverLetter: req.body.coverLetter || application.approval.editedCoverLetter || "",
    note: req.body.note || "",
  };

  if (decision === "APPROVE" || decision === "EDIT") {
    application.status = "APPROVED";
  } else if (decision === "REJECT") {
    application.status = "REJECTED_BY_USER";
  } else {
    application.status = "POSTPONED";
  }

  await application.save();

  let n8n = null;

  if (application.status === "APPROVED") {
    const agentRun = await AgentRun.create({
      user: req.user.id,
      resume: application.resume,
      workflow: "EMAIL_SENDING",
      status: "QUEUED",
      currentStep: "Waiting for Gmail sending workflow",
      input: { applicationId: application._id },
    });

    n8n = await triggerWorkflow("EMAIL_SENDING", {
      userId: req.user.id,
      applicationId: application._id,
      agentRunId: agentRun._id,
    });

    agentRun.correlationId = n8n.correlationId;
    await agentRun.save();
  }

  return res.status(200).json({
    msg: application.status === "APPROVED"
      ? "Application approved. Gmail sending workflow has been queued."
      : "Application decision saved.",
    application,
    n8n,
  });
};

const listNotifications = async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(100);

  return res.status(200).json({ count: notifications.length, notifications });
};

const markNotificationRead = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ msg: "Invalid notification id." });
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ msg: "Notification not found." });
  }

  return res.status(200).json({ notification });
};

const chatWithAgent = async (req, res) => {
  const message = typeof req.body.message === "string" ? req.body.message.trim() : "";

  if (!message) {
    return res.status(400).json({ msg: "message is required." });
  }

  const agentRun = await AgentRun.create({
    user: req.user.id,
    workflow: "CHAT",
    status: "QUEUED",
    currentStep: "Waiting for n8n chat agent",
    input: { message },
  });

  const n8n = await triggerWorkflow("CHAT", {
    userId: req.user.id,
    agentRunId: agentRun._id,
    message,
  });

  agentRun.correlationId = n8n.correlationId;
  await agentRun.save();

  return res.status(202).json({
    msg: "Agent chat request queued.",
    agentRun,
    n8n,
  });
};

module.exports = {
  getRecruitmentDashboard,
  startWorkflow,
  receiveN8nEvent,
  listApplications,
  decideApplication,
  listNotifications,
  markNotificationRead,
  chatWithAgent,
};
