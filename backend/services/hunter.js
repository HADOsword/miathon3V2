const { getDomainFromUrl } = require("./applicationMapper");

const HUNTER_DOMAIN_SEARCH_URL = "https://api.hunter.io/v2/domain-search";

const blockedDomains = new Set([
  "adzuna.com",
  "bayt.com",
  "careerbuilder.com",
  "glassdoor.com",
  "indeed.com",
  "jsearch.p.rapidapi.com",
  "linkedin.com",
  "monster.com",
  "remoteok.com",
  "simplyhired.com",
  "wellfound.com",
  "workable.com",
  "ziprecruiter.com",
]);

const getHunterApiKey = () => process.env.HUNTER_API_KEY || "";

const cleanDomain = (value = "") => {
  const domain = getDomainFromUrl(value).replace(/^www\./i, "").toLowerCase();

  if (!domain || !domain.includes(".")) {
    return "";
  }

  if (blockedDomains.has(domain)) {
    return "";
  }

  return domain;
};

const resolveJobDomain = (job = {}) =>
  cleanDomain(job.companyDomain) ||
  cleanDomain(job.companyWebsite) ||
  cleanDomain(job.raw?.employer_website) ||
  cleanDomain(job.raw?.companyWebsite);

const normalizeHunterEmail = (item = {}) => {
  const firstName = item.first_name || item.firstName || "";
  const lastName = item.last_name || item.lastName || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || item.fullName || "";

  return {
    email: String(item.value || item.email || "").trim().toLowerCase(),
    firstName,
    lastName,
    fullName,
    position: item.position || "",
    department: item.department || "",
    seniority: item.seniority || "",
    type: item.type || "",
    confidence: Number.isFinite(Number(item.confidence))
      ? Math.max(0, Math.min(100, Math.round(Number(item.confidence))))
      : 0,
    phoneNumber: item.phone_number || item.phoneNumber || "",
    linkedinUrl: item.linkedin || item.linkedin_url || item.linkedinUrl || "",
    source: "hunter",
    discoveredAt: new Date(),
    raw: item,
  };
};

const searchDomainEmails = async ({ domain, limit = 10, department = "", seniority = "" }) => {
  const apiKey = getHunterApiKey();
  const clean = cleanDomain(domain);

  if (!apiKey) {
    const error = new Error("HUNTER_API_KEY is not configured.");
    error.statusCode = 400;
    error.expose = true;
    throw error;
  }

  if (!clean) {
    return {
      domain: "",
      contacts: [],
      raw: {},
      warning: "No valid company domain was available for Hunter search.",
    };
  }

  const url = new URL(HUNTER_DOMAIN_SEARCH_URL);
  url.searchParams.set("domain", clean);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("limit", String(Math.max(1, Math.min(Number(limit) || 10, 100))));

  if (department) {
    url.searchParams.set("department", department);
  }

  if (seniority) {
    url.searchParams.set("seniority", seniority);
  }

  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      payload?.errors?.[0]?.details ||
      payload?.errors?.[0]?.message ||
      payload?.message ||
      "Hunter domain search failed.";
    const error = new Error(message);
    error.statusCode = response.status >= 500 ? 502 : response.status;
    error.expose = response.status < 500;
    throw error;
  }

  const emails = Array.isArray(payload.data?.emails) ? payload.data.emails : [];
  const contacts = emails
    .map(normalizeHunterEmail)
    .filter((contact) => contact.email);

  return {
    domain: clean,
    contacts,
    raw: payload.data || {},
  };
};

module.exports = {
  cleanDomain,
  resolveJobDomain,
  searchDomainEmails,
};
