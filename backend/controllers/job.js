const mongoose = require("mongoose");
const Resume = require("../models/Resume");
const JobMarketAnalysis = require("../models/JobMarketAnalysis");
const { searchJobs } = require("../services/jsearch");
const { analyzeJobMarket, analyzeProfileFit } = require("../services/gemini");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const asPositiveInteger = (value, fallback, max) => {
  const number = Number.parseInt(value, 10);

  if (!Number.isFinite(number) || number < 1) {
    return fallback;
  }

  return Math.min(number, max);
};

const getResumeForUser = async (resumeId, userId) => {
  if (!isValidObjectId(resumeId)) {
    const error = new Error("Invalid resume id.");
    error.statusCode = 400;
    error.expose = true;
    throw error;
  }

  const resume = await Resume.findOne({ _id: resumeId, user: userId });

  if (!resume) {
    const error = new Error("Resume not found.");
    error.statusCode = 404;
    error.expose = true;
    throw error;
  }

  return resume;
};

const getMainProfile = (resume) => {
  const mainProfile = resume.analysis?.main_profile;

  return typeof mainProfile === "string" ? mainProfile.trim() : "";
};

const compactJobForStorage = (job) => ({
  job_id: job.job_id,
  job_title: job.job_title,
  employer_name: job.employer_name,
  apply_url: job.apply_url,
  posted_at: job.posted_at,
  posted_at_datetime_utc: job.posted_at_datetime_utc,
  location: job.location,
  country: job.country,
  publisher: job.publisher,
  employment_type: job.employment_type,
  is_remote: job.is_remote,
  salary_string: job.salary_string || "",
});

const compactMarketAnalysis = (marketAnalysis = {}) => ({
  target_profile: marketAnalysis.target_profile || "",
  jobs_analyzed_count: marketAnalysis.jobs_analyzed_count || 0,
  dominant_technical_skills: Array.isArray(marketAnalysis.dominant_technical_skills)
    ? marketAnalysis.dominant_technical_skills
    : [],
  dominant_soft_skills: Array.isArray(marketAnalysis.dominant_soft_skills)
    ? marketAnalysis.dominant_soft_skills
    : [],
  common_tools: Array.isArray(marketAnalysis.common_tools) ? marketAnalysis.common_tools : [],
  common_frameworks: Array.isArray(marketAnalysis.common_frameworks)
    ? marketAnalysis.common_frameworks
    : [],
  common_databases: Array.isArray(marketAnalysis.common_databases)
    ? marketAnalysis.common_databases
    : [],
  common_programming_languages: Array.isArray(marketAnalysis.common_programming_languages)
    ? marketAnalysis.common_programming_languages
    : [],
  common_responsibilities: Array.isArray(marketAnalysis.common_responsibilities)
    ? marketAnalysis.common_responsibilities
    : [],
  common_requirements: Array.isArray(marketAnalysis.common_requirements)
    ? marketAnalysis.common_requirements
    : [],
  certifications_mentioned: Array.isArray(marketAnalysis.certifications_mentioned)
    ? marketAnalysis.certifications_mentioned
    : [],
  role_keywords: Array.isArray(marketAnalysis.role_keywords)
    ? marketAnalysis.role_keywords
    : [],
  market_summary: marketAnalysis.market_summary || "",
  skill_frequency_notes: Array.isArray(marketAnalysis.skill_frequency_notes)
    ? marketAnalysis.skill_frequency_notes
    : [],
});

const compactProfileComparison = (comparison = {}) => ({
  overall_match_percentage: Number.isFinite(Number(comparison.overall_match_percentage))
    ? Math.max(0, Math.min(100, Math.round(Number(comparison.overall_match_percentage))))
    : 0,
  profile_summary: comparison.profile_summary || "",
  matched_skills: Array.isArray(comparison.matched_skills) ? comparison.matched_skills : [],
  missing_skills: Array.isArray(comparison.missing_skills) ? comparison.missing_skills : [],
  dominant_market_tools: Array.isArray(comparison.dominant_market_tools)
    ? comparison.dominant_market_tools
    : [],
  workplace_trends: Array.isArray(comparison.workplace_trends)
    ? comparison.workplace_trends
    : [],
  recommended_jobs: Array.isArray(comparison.recommended_jobs)
    ? comparison.recommended_jobs
    : [],
  roadmap: Array.isArray(comparison.roadmap) ? comparison.roadmap : [],
  application_advice: Array.isArray(comparison.application_advice)
    ? comparison.application_advice
    : [],
});

const compactSavedAnalysis = (savedAnalysis) => {
  if (!savedAnalysis) {
    return null;
  }

  return {
    id: savedAnalysis._id,
    query: savedAnalysis.query,
    mainProfile: savedAnalysis.mainProfile,
    country: savedAnalysis.country,
    language: savedAnalysis.language,
    jobsCount: savedAnalysis.jobsCount,
    jobs: savedAnalysis.jobs,
    marketAnalysis: savedAnalysis.marketAnalysis,
    profileComparison: savedAnalysis.profileComparison,
    analysisProvider: savedAnalysis.analysisProvider,
    analysisModel: savedAnalysis.analysisModel,
    createdAt: savedAnalysis.createdAt,
    updatedAt: savedAnalysis.updatedAt,
  };
};

const getSearchQuery = ({ resume, query, location }) => {
  const profile = typeof query === "string" && query.trim()
    ? query.trim()
    : getMainProfile(resume);
  const cleanLocation = typeof location === "string" ? location.trim() : "";

  if (!profile) {
    const error = new Error("Resume analysis does not contain a main_profile to search jobs with.");
    error.statusCode = 400;
    error.expose = true;
    throw error;
  }

  return cleanLocation ? `${profile} in ${cleanLocation}` : profile;
};

const searchJobsForResume = async (req, res) => {
  try {
    const resume = await getResumeForUser(req.params.resumeId, req.user.id);
    const page = asPositiveInteger(req.query.page, 1, 50);
    const numPages = asPositiveInteger(req.query.num_pages || req.query.numPages, 1, 5);
    const jobsLimit = asPositiveInteger(req.query.jobs_limit || req.query.jobsLimit, 10, 25);
    const shouldAnalyze = req.query.analyze !== "false";
    const country = req.query.country || "ma";
    const language = req.query.language || "en";
    const mainProfile = getMainProfile(resume);
    const searchQuery = getSearchQuery({
      resume,
      query: req.query.query,
      location: req.query.location,
    });

    const result = await searchJobs({
      query: searchQuery,
      country,
      language,
      page,
      numPages,
      datePosted: req.query.date_posted || req.query.datePosted || "",
      employmentTypes: req.query.employment_types || req.query.employmentTypes || "",
      workFromHome: req.query.work_from_home || req.query.workFromHome,
    });

    const jobs = result.jobs.slice(0, jobsLimit);
    const compactJobs = jobs.map(compactJobForStorage);
    let savedAnalysis = null;
    let marketAnalysis = null;
    let profileComparison = null;

    if (shouldAnalyze && jobs.length > 0) {
      const analysis = await analyzeJobMarket({
        profile: mainProfile || searchQuery,
        jobs,
      });
      marketAnalysis = compactMarketAnalysis(analysis.result);

      const comparison = await analyzeProfileFit({
        resumeAnalysis: resume.analysis,
        marketAnalysis,
        jobs,
      });
      profileComparison = compactProfileComparison(comparison.result);

      savedAnalysis = await JobMarketAnalysis.create({
        user: req.user.id,
        resume: resume._id,
        query: result.query,
        mainProfile,
        country,
        language,
        jobsCount: jobs.length,
        jobs: compactJobs,
        marketAnalysis,
        profileComparison,
        analysisProvider: comparison.provider || analysis.provider,
        analysisModel: comparison.model || analysis.model,
      });
    }

    return res.status(200).json({
      resumeId: resume._id,
      mainProfile,
      query: result.query,
      count: jobs.length,
      totalFetched: result.count,
      country,
      jobs: compactJobs,
      marketAnalysis,
      profileComparison,
      jobMarketAnalysis: compactSavedAnalysis(savedAnalysis),
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      msg: statusCode >= 500 && !error.expose
        ? "Something went wrong while searching job offers."
        : error.message,
    });
  }
};

const getLatestJobMarketAnalysisForResume = async (req, res) => {
  try {
    const resume = await getResumeForUser(req.params.resumeId, req.user.id);
    const latestAnalysis = await JobMarketAnalysis.findOne({
      user: req.user.id,
      resume: resume._id,
    }).sort({ createdAt: -1 });

    if (!latestAnalysis) {
      return res.status(200).json({
        resumeId: resume._id,
        hasAnalysis: false,
        jobMarketAnalysis: null,
      });
    }

    const compactAnalysis = compactSavedAnalysis(latestAnalysis);

    return res.status(200).json({
      resumeId: resume._id,
      hasAnalysis: true,
      query: compactAnalysis.query,
      mainProfile: compactAnalysis.mainProfile,
      count: compactAnalysis.jobsCount,
      country: compactAnalysis.country,
      jobs: compactAnalysis.jobs || [],
      marketAnalysis: compactAnalysis.marketAnalysis,
      profileComparison: compactAnalysis.profileComparison,
      jobMarketAnalysis: compactAnalysis,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      msg: statusCode >= 500 && !error.expose
        ? "Something went wrong while loading the saved market comparison."
        : error.message,
    });
  }
};

module.exports = {
  searchJobsForResume,
  getLatestJobMarketAnalysisForResume,
};
