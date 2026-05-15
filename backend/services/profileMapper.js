const asArray = (value) => (Array.isArray(value) ? value : []);

const uniqueStrings = (items, limit = 50) => {
  const seen = new Set();

  return asArray(items)
    .flatMap((item) => {
      if (typeof item === "string") {
        return [item];
      }

      if (item && typeof item === "object") {
        return Object.values(item).filter((value) => typeof value === "string");
      }

      return [];
    })
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase();

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, limit);
};

const flattenTechnicalSkills = (technicalSkills = {}) => {
  if (Array.isArray(technicalSkills)) {
    return uniqueStrings(technicalSkills);
  }

  if (!technicalSkills || typeof technicalSkills !== "object") {
    return [];
  }

  return uniqueStrings(Object.values(technicalSkills).flat());
};

const normalizeSeniority = (value = "") => {
  const normalized = String(value).trim().toLowerCase();
  const map = {
    intern: "Intern",
    internship: "Intern",
    "entry-level": "Entry-level",
    entry: "Entry-level",
    junior: "Junior",
    "mid-level": "Mid-Level",
    mid: "Mid-Level",
    intermediate: "Mid-Level",
    senior: "Senior",
    lead: "Lead",
    architect: "Architect",
    unknown: "Unknown",
  };

  return map[normalized] || value || "";
};

const normalizeEnum = (value, allowed, fallback) => {
  const normalized = String(value || "").trim().toUpperCase();
  return allowed.includes(normalized) ? normalized : fallback;
};

const mapResumeAnalysisToProfile = ({ userId, resumeId, analysis = {}, source = "n8n" }) => {
  const technicalSkills = analysis.technical_skills || analysis.technicalSkills || {};
  const geo = analysis.geographical_profile || analysis.geoProfile || analysis.location || {};

  return {
    user: userId,
    resume: resumeId,
    fullName: analysis.full_name || analysis.fullName || "",
    email: analysis.email || "",
    phone: analysis.phone || "",
    mainProfile: analysis.main_profile || analysis.mainProfile || "",
    seniorityLevel: normalizeSeniority(analysis.seniority_level || analysis.seniorityLevel || ""),
    yearsOfExperience: Number(analysis.years_of_experience || analysis.yearsOfExperience || 0),
    hardSkills: uniqueStrings(analysis.hard_skills || analysis.hardSkills || flattenTechnicalSkills(technicalSkills)),
    softSkills: uniqueStrings(analysis.soft_skills || analysis.softSkills),
    technologies: uniqueStrings(analysis.technologies || technicalSkills.technologies),
    frameworks: uniqueStrings(analysis.frameworks || technicalSkills.frameworks),
    certifications: uniqueStrings(analysis.certifications),
    languages: uniqueStrings(analysis.languages),
    tools: uniqueStrings(analysis.tools || technicalSkills.tools),
    cloudPlatforms: uniqueStrings(analysis.cloud_platforms || analysis.cloudPlatforms || technicalSkills.cloud),
    devOpsTools: uniqueStrings(analysis.devops_tools || analysis.devOpsTools || technicalSkills.devops),
    databases: uniqueStrings(analysis.databases || technicalSkills.databases),
    education: asArray(analysis.education),
    experience: asArray(analysis.work_experience || analysis.experience),
    projects: asArray(analysis.projects),
    geoProfile: {
      country: geo.country || "",
      city: geo.city || "",
      region: geo.region || geo.state || "",
      timezone: geo.timezone || "",
      preferredWorkLocations: uniqueStrings(geo.preferred_work_locations || geo.preferredWorkLocations),
      remotePreference: normalizeEnum(
        geo.remote_preference || geo.remotePreference,
        ["ONSITE", "HYBRID", "REMOTE", "FLEXIBLE", "UNKNOWN"],
        "UNKNOWN"
      ),
      relocationPreference: normalizeEnum(
        geo.relocation_preference || geo.relocationPreference,
        ["YES", "NO", "OPEN", "UNKNOWN"],
        "UNKNOWN"
      ),
    },
    rawAnalysis: analysis,
    source,
  };
};

module.exports = {
  mapResumeAnalysisToProfile,
  uniqueStrings,
};
