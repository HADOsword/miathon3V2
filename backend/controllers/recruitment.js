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
const { mapResumeAnalysisToProfile, normalizeResumeAnalysis } = require("../services/profileMapper");
const { mapApiJobToOpportunity, mapMatchPayload } = require("../services/applicationMapper");
const { resolveJobDomain, searchDomainEmails } = require("../services/hunter");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.expose = true;
  return error;
};

const normalizeN8nPayload = (body = {}) => {
  const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};

  return {
    ...body,
    type: body.type || metadata.type,
    agentRunId: body.agentRunId || metadata.agentRunId,
    correlationId: body.correlationId || metadata.correlationId,
    userId: body.userId || metadata.userId,
    resumeId: body.resumeId || metadata.resumeId,
    profileId: body.profileId || metadata.profileId,
    marketAnalysisId: body.marketAnalysisId || metadata.marketAnalysisId,
    status: body.status || metadata.status,
    progress: typeof body.progress !== "undefined" ? body.progress : metadata.progress,
    currentStep: body.currentStep || metadata.currentStep,
  };
};

const getUserObjectId = (req) => req.body.userId || req.user?.id;

const mergeContacts = (existingContacts = [], newContacts = []) => {
  const contactsByEmail = new Map();

  for (const contact of existingContacts) {
    if (contact?.email) {
      contactsByEmail.set(String(contact.email).toLowerCase(), contact);
    }
  }

  for (const contact of newContacts) {
    if (contact?.email) {
      contactsByEmail.set(String(contact.email).toLowerCase(), {
        ...contact,
        email: String(contact.email).toLowerCase(),
      });
    }
  }

  return [...contactsByEmail.values()];
};

const normalizeDiscoveredContact = (contact = {}) => ({
  email: String(contact.email || contact.value || "").trim().toLowerCase(),
  firstName: contact.firstName || contact.first_name || "",
  lastName: contact.lastName || contact.last_name || "",
  fullName: contact.fullName || contact.name || "",
  position: contact.position || "",
  department: contact.department || "",
  seniority: contact.seniority || "",
  type: contact.type || "",
  confidence: Number.isFinite(Number(contact.confidence))
    ? Math.max(0, Math.min(100, Math.round(Number(contact.confidence))))
    : 0,
  phoneNumber: contact.phoneNumber || contact.phone_number || "",
  linkedinUrl: contact.linkedinUrl || contact.linkedin_url || contact.linkedin || "",
  source: contact.source || "hunter",
  selectionReason: contact.selectionReason || "",
  discoveredAt: contact.discoveredAt || new Date(),
  raw: contact.raw || contact,
});

const saveDiscoveredContactsForJob = async ({ jobId, domain, contacts = [], source = "hunter", error = "" }) => {
  if (!jobId || !isValidObjectId(jobId)) {
    return null;
  }

  const job = await JobOpportunity.findById(jobId);

  if (!job) {
    return null;
  }

  const normalizedContacts = contacts
    .map(normalizeDiscoveredContact)
    .filter((contact) => contact.email);

  job.companyDomain = job.companyDomain || domain || "";
  job.contacts = mergeContacts(job.contacts || [], normalizedContacts);
  job.emailDiscovery = {
    status: error ? "FAILED" : normalizedContacts.length > 0 ? "FOUND" : "NOT_FOUND",
    source,
    domain: domain || job.companyDomain || "",
    lastCheckedAt: new Date(),
    error,
  };

  await job.save();
  return job;
};

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
  const correlationId = typeof payload.correlationId === "string"
    ? payload.correlationId.trim()
    : "";

  let query = null;

  if (agentRunId && isValidObjectId(agentRunId)) {
    query = { _id: agentRunId };
  } else if (correlationId) {
    query = { correlationId };
  }

  if (!query) {
    return null;
  }

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

  const analysis = normalizeResumeAnalysis(payload.analysis);

  const profileData = mapResumeAnalysisToProfile({
    userId,
    resumeId,
    analysis,
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
      analysis,
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
  const userId = payload.userId || agentRun?.user;
  const resumeId = payload.resumeId || agentRun?.resume;

  if (!resumeId || !userId) {
    return null;
  }

  const compactJobs = (payload.enrichedJobs || payload.jobs || []).map((job = {}) => {
    const {
      job_description,
      description,
      ...compactJob
    } = job;

    return compactJob;
  });

  const analysis = await JobMarketAnalysis.create({
    user: userId,
    resume: resumeId,
    source: payload.source || "n8n",
    query: payload.query || "",
    mainProfile: payload.mainProfile || "",
    country: payload.country || "",
    language: payload.language || "",
    jobsCount: compactJobs.length || payload.jobsCount || 0,
    jobs: compactJobs,
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
  let populatedMatches = [];

  if (!userId || !resumeId) {
    throw badRequest("JOB_MATCHES_RESULT requires userId and resumeId.");
  }

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

    populatedMatches = await JobMatch.find({
      _id: { $in: savedMatches.map((match) => match._id) },
    }).populate("job");
    const emailDiscoveryRun = await AgentRun.create({
      user: userId,
      resume: resumeId,
      workflow: "EMAIL_DISCOVERY",
      status: "QUEUED",
      currentStep: "Waiting for Hunter email discovery",
      input: {
        sourceAgentRunId: agentRun?._id,
        matchesCount: populatedMatches.length,
      },
    });

    try {
      const n8nResult = await triggerWorkflow("EMAIL_DISCOVERY", {
        userId,
        resumeId,
        agentRunId: emailDiscoveryRun._id,
        matches: populatedMatches.map((match) => ({
          jobMatchId: match._id,
          jobId: match.job?._id,
          companyName: match.job?.companyName || "",
          companyDomain: match.job?.companyDomain || "",
          companyWebsite: match.job?.companyWebsite || "",
          title: match.job?.title || "",
        })),
      });

      emailDiscoveryRun.correlationId = n8nResult.correlationId;
      emailDiscoveryRun.status = n8nResult.triggered ? "QUEUED" : "CANCELLED";
      emailDiscoveryRun.currentStep = n8nResult.triggered
        ? "Waiting for Hunter email discovery"
        : "Email discovery workflow is not configured";
      emailDiscoveryRun.events.push({
        type: n8nResult.triggered ? "N8N_TRIGGERED" : "N8N_NOT_CONFIGURED",
        message: n8nResult.warning || "Email discovery workflow started.",
        metadata: n8nResult.data || {},
      });
      await emailDiscoveryRun.save();

      if (agentRun) {
        agentRun.events.push({
          type: n8nResult.triggered ? "EMAIL_DISCOVERY_TRIGGERED" : "EMAIL_DISCOVERY_NOT_CONFIGURED",
          message: n8nResult.warning || "Email discovery workflow queued.",
          metadata: { emailDiscoveryAgentRunId: emailDiscoveryRun._id },
        });
        await agentRun.save();
      }
    } catch (error) {
      emailDiscoveryRun.status = "FAILED";
      emailDiscoveryRun.error = error.message;
      emailDiscoveryRun.events.push({
        type: "N8N_TRIGGER_FAILED",
        message: error.message,
      });
      await emailDiscoveryRun.save();

      if (agentRun) {
        agentRun.events.push({
          type: "EMAIL_DISCOVERY_TRIGGER_FAILED",
          message: error.message,
          metadata: { emailDiscoveryAgentRunId: emailDiscoveryRun._id },
        });
        await agentRun.save();
      }
    }
  }

  if (populatedMatches.length > 0) {
    return populatedMatches;
  }

  return savedMatches;
};

const handleEmailDiscoveryResult = async (payload, agentRun) => {
  const userId = payload.userId || agentRun?.user;
  const resumeId = payload.resumeId || agentRun?.resume;
  const discoveries = Array.isArray(payload.discoveries)
    ? payload.discoveries
    : [payload.discovery].filter(Boolean);
  const savedJobs = [];

  for (const item of discoveries) {
    const jobId = item.jobId || item.job || "";
    const job = await saveDiscoveredContactsForJob({
      jobId,
      domain: item.domain || item.companyDomain || "",
      contacts: item.contacts || item.emails || [],
      source: item.source || "hunter",
      error: item.error || "",
    });

    if (job) {
      savedJobs.push(job);
    }
  }

  const contactsCount = savedJobs.reduce((count, job) => count + (job.contacts?.length || 0), 0);

  if (savedJobs.length > 0 && userId) {
    await Notification.create({
      user: userId,
      type: "AGENT_PROGRESS",
      title: contactsCount > 0 ? "Recruiter emails discovered" : "Email discovery completed",
      message: contactsCount > 0
        ? `${contactsCount} contact emails were saved for matched jobs.`
        : "No Hunter contacts were found for the matched company domains.",
      severity: contactsCount > 0 ? "SUCCESS" : "INFO",
      related: { resume: resumeId || null, agentRun: agentRun?._id },
    });
  }

  return savedJobs;
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

  const payload = normalizeN8nPayload(req.body || {});
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

  if (payload.type === "EMAIL_DISCOVERY_RESULT") {
    result = await handleEmailDiscoveryResult(payload, agentRun);
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

const discoverMatchedJobEmails = async (req, res) => {
  const resumeId = req.body.resumeId || req.query.resumeId || null;
  const limit = Math.max(1, Math.min(Number(req.body.limit || req.query.limit || 10), 50));
  const hunterLimit = Math.max(1, Math.min(Number(req.body.hunterLimit || req.query.hunterLimit || 10), 100));

  if (resumeId && !isValidObjectId(resumeId)) {
    return res.status(400).json({ msg: "Invalid resume id." });
  }

  const matchQuery = {
    user: req.user.id,
    recommendation: { $in: ["STRONG_MATCH", "GOOD_MATCH"] },
  };

  if (resumeId) {
    matchQuery.resume = resumeId;
  }

  const matches = await JobMatch.find(matchQuery)
    .populate("job")
    .sort({ compatibilityScore: -1, createdAt: -1 })
    .limit(limit);

  const agentRun = await AgentRun.create({
    user: req.user.id,
    resume: resumeId,
    workflow: "EMAIL_DISCOVERY",
    status: "RUNNING",
    currentStep: "Searching Hunter for matched company emails",
    progress: 10,
    input: { resumeId, limit, hunterLimit },
  });

  const discoveries = [];

  for (const match of matches) {
    const job = match.job;

    if (!job) {
      continue;
    }

    const domain = resolveJobDomain(job);

    try {
      const result = await searchDomainEmails({ domain, limit: hunterLimit });
      const savedJob = await saveDiscoveredContactsForJob({
        jobId: job._id,
        domain: result.domain,
        contacts: result.contacts,
        source: "hunter",
      });

      discoveries.push({
        jobMatchId: match._id,
        jobId: job._id,
        companyName: job.companyName,
        domain: result.domain,
        contactsCount: result.contacts.length,
        contacts: savedJob?.contacts || [],
        warning: result.warning || "",
      });
    } catch (error) {
      await saveDiscoveredContactsForJob({
        jobId: job._id,
        domain,
        contacts: [],
        source: "hunter",
        error: error.message,
      });

      discoveries.push({
        jobMatchId: match._id,
        jobId: job._id,
        companyName: job.companyName,
        domain,
        contactsCount: 0,
        error: error.message,
      });
    }
  }

  const contactsCount = discoveries.reduce((count, item) => count + item.contactsCount, 0);

  agentRun.status = "COMPLETED";
  agentRun.progress = 100;
  agentRun.currentStep = "Hunter email discovery completed";
  agentRun.output = {
    jobsChecked: discoveries.length,
    contactsCount,
  };
  await agentRun.save();

  await Notification.create({
    user: req.user.id,
    type: "AGENT_PROGRESS",
    title: contactsCount > 0 ? "Recruiter emails discovered" : "No recruiter emails found",
    message: contactsCount > 0
      ? `${contactsCount} Hunter contacts were saved from ${discoveries.length} matched jobs.`
      : `Hunter checked ${discoveries.length} matched jobs but did not return contacts.`,
    severity: contactsCount > 0 ? "SUCCESS" : "WARNING",
    related: { resume: resumeId, agentRun: agentRun._id },
  });

  return res.status(200).json({
    msg: "Email discovery completed.",
    agentRun,
    jobsChecked: discoveries.length,
    contactsCount,
    discoveries,
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
  discoverMatchedJobEmails,
  receiveN8nEvent,
  listApplications,
  decideApplication,
  listNotifications,
  markNotificationRead,
  chatWithAgent,
};
