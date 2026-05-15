const JSEARCH_URL = "https://jsearch.p.rapidapi.com/search";
const JSEARCH_HOST = process.env.JSEARCH_API_HOST || "jsearch.p.rapidapi.com";

const getApiKey = () => {
  const apiKey = process.env.JSEARCH_API_KEY || process.env.RAPIDAPI_KEY;

  if (!apiKey) {
    const error = new Error("JSEARCH_API_KEY is missing in backend .env.");
    error.statusCode = 500;
    error.expose = true;
    throw error;
  }

  return apiKey;
};

const normalizeBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return false;
};

const normalizeJobOffer = (job) => {
  const applyUrl =
    job.job_apply_link ||
    job.apply_options?.find((option) => option?.apply_link)?.apply_link ||
    "";

  return {
    job_id: job.job_id || "",
    job_title: job.job_title || "",
    employer_name: job.employer_name || "",
    employer_logo: job.employer_logo || "",
    employer_website: job.employer_website || "",
    publisher: job.job_publisher || "",
    employment_type: job.job_employment_type || "",
    employment_types: Array.isArray(job.job_employment_types) ? job.job_employment_types : [],
    apply_url: applyUrl,
    apply_is_direct: Boolean(job.job_apply_is_direct),
    description: job.job_description || "",
    is_remote: Boolean(job.job_is_remote),
    posted_at: job.job_posted_at || "",
    posted_at_timestamp: job.job_posted_at_timestamp || null,
    posted_at_datetime_utc: job.job_posted_at_datetime_utc || null,
    location: job.job_location || "",
    city: job.job_city || "",
    state: job.job_state || "",
    country: job.job_country || "",
    latitude: job.job_latitude || null,
    longitude: job.job_longitude || null,
    salary: job.job_salary || null,
    salary_string: job.job_salary_string || "",
    min_salary: job.job_min_salary || null,
    max_salary: job.job_max_salary || null,
    salary_period: job.job_salary_period || "",
    benefits: job.job_benefits || null,
    benefits_strings: job.job_benefits_strings || null,
    google_link: job.job_google_link || "",
    source: "jsearch",
  };
};

const searchJobs = async ({
  query,
  country = "ma",
  language = "en",
  page = 1,
  numPages = 1,
  datePosted = "",
  employmentTypes = "",
  workFromHome = undefined,
}) => {
  const cleanQuery = typeof query === "string" ? query.trim() : "";

  if (!cleanQuery) {
    const error = new Error("A job search query is required.");
    error.statusCode = 400;
    error.expose = true;
    throw error;
  }

  const params = new URLSearchParams({
    query: cleanQuery,
    page: String(page),
    num_pages: String(numPages),
    country,
    language,
  });

  if (datePosted) {
    params.set("date_posted", datePosted);
  }

  if (employmentTypes) {
    params.set("employment_types", employmentTypes);
  }

  if (typeof workFromHome !== "undefined") {
    params.set("work_from_home", String(normalizeBoolean(workFromHome)));
  }

  const response = await fetch(`${JSEARCH_URL}?${params.toString()}`, {
    method: "GET",
    headers: {
      "x-rapidapi-key": getApiKey(),
      "x-rapidapi-host": JSEARCH_HOST,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data.message ||
      data.error?.message ||
      `JSearch request failed with status ${response.status}.`;
    const error = new Error(message);
    error.statusCode = response.status >= 500 ? 502 : response.status;
    error.expose = response.status < 500;
    throw error;
  }

  const jobs = Array.isArray(data.data) ? data.data.map(normalizeJobOffer) : [];

  return {
    query: cleanQuery,
    count: jobs.length,
    jobs,
    raw_status: data.status || "",
  };
};

module.exports = {
  searchJobs,
  normalizeJobOffer,
};
