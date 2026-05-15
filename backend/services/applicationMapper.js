const clampScore = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 0;
};

const normalizeRecommendation = (value = "") => {
  const normalized = String(value || "").trim().toUpperCase();
  const allowed = new Set(["STRONG_MATCH", "GOOD_MATCH", "LOW_MATCH", "REJECTED"]);

  return allowed.has(normalized) ? normalized : "GOOD_MATCH";
};

const getDomainFromUrl = (value = "") => {
  if (!value || typeof value !== "string") {
    return "";
  }

  try {
    return new URL(value).hostname.replace(/^www\./i, "").toLowerCase();
  } catch (error) {
    return value
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .toLowerCase();
  }
};

const mapApiJobToOpportunity = (job = {}) => ({
  externalId: job.job_id || job.externalId || job.id,
  source: job.source || "jsearch",
  title: job.job_title || job.title || "",
  companyName: job.employer_name || job.companyName || "",
  companyDomain: job.company_domain || job.companyDomain || getDomainFromUrl(job.employer_website || job.companyWebsite),
  companyWebsite: job.employer_website || job.companyWebsite || "",
  description: job.description || job.job_description || "",
  applyUrl: job.job_apply_link || job.apply_url || job.applyUrl || "",
  employmentType: job.job_employment_type || job.employment_type || job.employmentType || "",
  location: {
    country: job.job_country || job.country || job.location?.country || "",
    city: job.job_city || job.city || job.location?.city || "",
    region: job.state || job.region || job.location?.region || "",
    raw: job.job_location || job.location?.raw || (typeof job.location === "string" ? job.location : ""),
    isRemote: Boolean(job.job_is_remote || job.is_remote || job.location?.isRemote),
  },
  salary: {
    min: job.min_salary || job.salary?.min || null,
    max: job.max_salary || job.salary?.max || null,
    currency: job.salary_currency || job.salary?.currency || "",
    period: job.salary_period || job.salary?.period || "",
    raw: job.job_salary_string || job.salary_string || job.salary?.raw || "",
  },
  postedAt: job.job_posted_at_datetime_utc || job.posted_at_datetime_utc || job.postedAt || null,
  expiresAt: job.expiresAt || null,
  raw: job,
});

const mapMatchPayload = ({ userId, resumeId, profileId, marketAnalysisId, jobId, match = {} }) => ({
  user: userId,
  resume: resumeId,
  profile: profileId || null,
  job: jobId,
  marketAnalysis: marketAnalysisId || null,
  compatibilityScore: clampScore(match.compatibilityScore || match.compatibility_score || match.match_percentage),
  successProbability: clampScore(match.successProbability || match.success_probability),
  matchingTechnologies: match.matchingTechnologies || match.matching_technologies || match.matched_skills || [],
  missingSkills: match.missingSkills || match.missing_skills || [],
  reasons: match.reasons || [],
  recommendation: normalizeRecommendation(match.recommendation),
  status: match.status || "MATCHED",
  aiRationale: match.aiRationale || match.ai_rationale || match.why_good_fit || "",
});

module.exports = {
  getDomainFromUrl,
  mapApiJobToOpportunity,
  mapMatchPayload,
  normalizeRecommendation,
};
