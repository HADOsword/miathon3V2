const { GoogleGenAI } = require("@google/genai");
const buildInterviewQuestionsPrompt = require("./interviewQuestionsPrompt");

const getClient = () => {
    if (!process.env.GEMINI_API_KEY) {
        const error = new Error("GEMINI_API_KEY is missing in backend .env.");
        error.statusCode = 500;
        error.expose = true;
        throw error;
    }

    return new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
    });
};

const safeParseJSON = (text) => {
    try {
        const cleaned = text
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        return JSON.parse(cleaned);
    } catch (err) {
        console.error("JSON parsing error:", err.message);
        console.error("Raw Gemini response:", text);
        return null;
    }
};

const generateJSON = async (prompt) => {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const ai = getClient();
    const response = await ai.models.generateContent({
        model,
        contents: [
            {
                role: "user",
                parts: [{ text: prompt }]
            }
        ],
        config: {
            responseMimeType: "application/json"
        }
    });

    const rawText =
        response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
        const error = new Error("Empty response from Gemini.");
        error.statusCode = 502;
        throw error;
    }

    const parsed = safeParseJSON(rawText);

    if (!parsed) {
        const error = new Error("Invalid JSON returned by Gemini.");
        error.statusCode = 502;
        throw error;
    }

    return {
        provider: "gemini",
        model,
        result: parsed
    };
};

const getMaxJobDescriptionChars = () => {
    const parsed = Number.parseInt(process.env.AI_MAX_JOB_DESCRIPTION_CHARS, 10);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1800;
};

const truncateText = (text, maxLength) => {
    if (typeof text !== "string") {
        return "";
    }

    const cleanText = text.replace(/\s+/g, " ").trim();

    if (cleanText.length <= maxLength) {
        return cleanText;
    }

    return `${cleanText.slice(0, maxLength).trim()}...`;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const toText = (value) => {
    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value === "string") {
        return value.trim();
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    return "";
};

const collectTextItems = (value) => {
    if (Array.isArray(value)) {
        return value.flatMap(collectTextItems);
    }

    if (value && typeof value === "object") {
        return Object.values(value).flatMap(collectTextItems);
    }

    const text = toText(value);
    return text ? [text] : [];
};

const uniqueItems = (items, limit) => {
    const seen = new Set();

    return items
        .map((item) => toText(item))
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

const getObjectLabel = (item, keys, fallback) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
        return toText(item) || fallback;
    }

    return toText(keys.map((key) => item[key]).find(Boolean)) || fallback;
};

const normalizeQuestion = (item, focusKeys = []) => {
    if (typeof item === "string") {
        return {
            question: item.trim(),
            focus: "",
            reason: "",
        };
    }

    if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
    }

    const question = toText(item.question || item.prompt);

    if (!question) {
        return null;
    }

    const focusKey = focusKeys.find((key) => toText(item[key]));

    return {
        question,
        focus: focusKey ? toText(item[focusKey]) : toText(item.focus || item.topic),
        reason: toText(item.reason || item.why),
    };
};

const normalizeQuestionList = (items, focusKeys) =>
    asArray(items)
        .map((item) => normalizeQuestion(item, focusKeys))
        .filter(Boolean);

const normalizeInterviewQuestions = (questions = {}) => ({
    candidate_profile: toText(questions.candidate_profile || questions.candidateProfile),
    interview_focus: toText(questions.interview_focus || questions.interviewFocus),
    technical_questions: normalizeQuestionList(questions.technical_questions, [
        "skill_or_topic",
        "technology",
        "topic",
        "skill",
    ]),
    behavioral_questions: normalizeQuestionList(questions.behavioral_questions, [
        "competency",
        "topic",
    ]),
    experience_questions: normalizeQuestionList(questions.experience_questions, [
        "role_or_experience",
        "experience",
        "role",
    ]),
    project_questions: normalizeQuestionList(questions.project_questions, [
        "project",
        "topic",
    ]),
    education_questions: normalizeQuestionList(questions.education_questions, [
        "topic",
        "degree",
        "education",
    ]),
});

const getQuestionSourceAnalysis = (resumeAnalysis = {}) => {
    if (!resumeAnalysis || typeof resumeAnalysis !== "object" || Array.isArray(resumeAnalysis)) {
        return {};
    }

    const { interview_questions, interviewQuestions, ...sourceAnalysis } = resumeAnalysis;
    return sourceAnalysis;
};

const buildFallbackInterviewQuestions = (resumeAnalysis = {}) => {
    const profile = toText(resumeAnalysis.main_profile || resumeAnalysis.mainProfile) || "candidate";
    const skills = uniqueItems(
        collectTextItems(resumeAnalysis.technical_skills || resumeAnalysis.skills),
        5
    );
    const technicalTopics = skills.length > 0 ? skills : [profile];
    const experiences = asArray(resumeAnalysis.work_experience || resumeAnalysis.experience).slice(0, 3);
    const projects = asArray(resumeAnalysis.projects).slice(0, 3);
    const education = asArray(resumeAnalysis.education).slice(0, 2);

    return {
        candidate_profile: profile,
        interview_focus: `Validate the candidate's ${profile} skills, project depth, collaboration style, and problem-solving approach.`,
        technical_questions: technicalTopics.map((skill) => ({
            question: `How have you used ${skill} in a real project or work context?`,
            focus: skill,
            reason: `${skill} appears in the candidate's extracted CV data.`,
        })),
        behavioral_questions: [
            {
                question: "Tell me about a time you worked with others to solve a difficult problem.",
                focus: "Teamwork",
                reason: "Assesses collaboration and problem-solving behavior.",
            },
            {
                question: "Describe a situation where you had to explain a technical idea to a non-technical person.",
                focus: "Communication",
                reason: "Assesses communication clarity.",
            },
            {
                question: "Tell me about a time you received feedback and changed your approach.",
                focus: "Adaptability",
                reason: "Assesses learning mindset and coachability.",
            },
            {
                question: "How do you prioritize tasks when several deadlines or issues compete for attention?",
                focus: "Organization",
                reason: "Assesses planning and professional judgment.",
            },
        ],
        experience_questions: experiences.map((experience, index) => {
            const label = getObjectLabel(
                experience,
                ["title", "job_title", "role", "position", "company"],
                `Experience ${index + 1}`
            );

            return {
                question: `Walk me through your responsibilities and strongest result in ${label}.`,
                focus: label,
                reason: "This experience appears in the candidate's CV.",
            };
        }),
        project_questions: projects.map((project, index) => {
            const label = getObjectLabel(project, ["name", "title"], `Project ${index + 1}`);

            return {
                question: `What was the hardest technical or product decision you made in ${label}, and how did you handle it?`,
                focus: label,
                reason: "This project appears in the candidate's CV.",
            };
        }),
        education_questions: education.map((item, index) => {
            const label = getObjectLabel(
                item,
                ["degree", "qualification", "program", "institution"],
                `Education ${index + 1}`
            );

            return {
                question: `Which part of your ${label} background best prepared you for this role?`,
                focus: label,
                reason: "This education item appears in the candidate's CV.",
            };
        }),
    };
};

const analyzeCV = async (cvText) => {
    const prompt = `You are an AI recruitment system. Analyze the CV below and return ONLY a valid JSON.
    Important rules:
    - "main_profile" must be one specific profession/job family based on the CV, without seniority words.
    - Put seniority only in "seniority_level"; do not repeat it in "main_profile".
    - Good "main_profile" examples: "Software Developer", "Full-stack Developer", "Frontend Developer", "Backend Developer", "Mobile Developer", "Data Analyst", "Network Technician", "DevOps Engineer".
    - Bad "main_profile" examples: "Junior Full-stack Developer", "Entry-level Backend Developer", "Computer Engineering Graduate", "Junior Developer", "IT Student", "Aspiring Engineer", "Computer Engineering Graduate & Junior Developer".
    - "seniority_level" must be one of: "Intern", "Entry-level", "Junior", "Mid-level", "Senior", or "" if unclear.
    - Extract geographical and regional signals into "geographical_profile".
    - "geographical_profile.remote_preference" must be one of: "ONSITE", "HYBRID", "REMOTE", "FLEXIBLE", "UNKNOWN".
    - "geographical_profile.relocation_preference" must be one of: "YES", "NO", "OPEN", "UNKNOWN".
    - If several roles fit, choose the most relevant one based on skills, projects, and experience.
    - Keep "main_profile" short, specific, and job-title-like, but profession-only.

    Structure:
    {
      "full_name": "", "email": "", "phone": "", "professional_summary": "",
      "main_profile": "", "seniority_level": "", "years_of_experience": 0,
      "geographical_profile": {
        "country": "", "city": "", "region": "", "timezone": "",
        "preferred_work_locations": [],
        "remote_preference": "UNKNOWN",
        "relocation_preference": "UNKNOWN"
      },
      "education": [], "work_experience": [], "projects": [],
      "hard_skills": [], "technologies": [], "frameworks": [], "certifications": [],
      "languages": [], "tools": [], "cloud_platforms": [], "devops_tools": [],
      "technical_skills": {}, "soft_skills": [],
      "ats_analysis": {}
    }
    CV to analyze: ${cvText}`;

    try {
        return await generateJSON(prompt);
    } catch (error) {
        if (error.status === 429) {
            console.error("Gemini quota exhausted: change model or wait.");
        }

        console.error("Gemini analysis error:", error);
        throw error;
    }
};

const generateInterviewQuestions = async (resumeAnalysis) => {
    const sourceAnalysis = getQuestionSourceAnalysis(resumeAnalysis);

    try {
        const response = await generateJSON(buildInterviewQuestionsPrompt(sourceAnalysis));

        return {
            ...response,
            result: normalizeInterviewQuestions(response.result),
        };
    } catch (error) {
        console.error("Gemini interview question generation error:", error);

        return {
            provider: "local-fallback",
            model: "rule-based-interview-questions",
            result: buildFallbackInterviewQuestions(sourceAnalysis),
            warning: "Interview questions were generated locally because the AI question prompt failed.",
        };
    }
};

const analyzeJobMarket = async ({ profile, jobs }) => {
    const maxDescriptionChars = getMaxJobDescriptionChars();
    const compactJobs = jobs.map((job, index) => ({
        index: index + 1,
        job_id: job.job_id,
        job_title: job.job_title,
        employer_name: job.employer_name,
        publisher: job.publisher,
        employment_type: job.employment_type,
        location: job.location,
        is_remote: job.is_remote,
        apply_url: job.apply_url,
        posted_at: job.posted_at,
        salary_string: job.salary_string,
        description: truncateText(job.description, maxDescriptionChars),
    }));

    const prompt = `You are an AI labor-market analysis system. Analyze the following job offers as a group for the target profile "${profile}" and return ONLY valid JSON.
    Rules:
    - Analyze market trends across all offers, not one offer at a time.
    - Extract dominant skills and requirements that appear repeatedly or are highly important.
    - Do not invent facts. Use only the provided offers.
    - Separate technical skills from soft skills.
    - Keep arrays ordered by importance/frequency when possible.
    - Focus on fields useful for comparing this market demand against a user's CV.
    - Job descriptions may be truncated; extract only clear, repeated, or important signals.

    Return this JSON structure:
    {
      "target_profile": "",
      "jobs_analyzed_count": 0,
      "dominant_technical_skills": [],
      "dominant_soft_skills": [],
      "common_tools": [],
      "common_frameworks": [],
      "common_databases": [],
      "common_programming_languages": [],
      "common_responsibilities": [],
      "common_requirements": [],
      "certifications_mentioned": [],
      "role_keywords": [],
      "market_summary": "",
      "skill_frequency_notes": []
    }

    Job offers JSON:
    ${JSON.stringify(compactJobs)}`;

    try {
        return await generateJSON(prompt);
    } catch (error) {
        console.error("Gemini job market analysis error:", error);
        throw error;
    }
};

const analyzeProfileFit = async ({ resumeAnalysis, marketAnalysis, jobs }) => {
    const maxDescriptionChars = getMaxJobDescriptionChars();
    const compactJobs = jobs.map((job, index) => ({
        index: index + 1,
        job_id: job.job_id,
        job_title: job.job_title,
        employer_name: job.employer_name,
        employment_type: job.employment_type,
        location: job.location,
        is_remote: job.is_remote,
        apply_url: job.apply_url,
        posted_at: job.posted_at,
        salary_string: job.salary_string,
        description: truncateText(job.description, maxDescriptionChars),
    }));

    const prompt = `You are an AI career matching system. Compare the candidate CV analysis with the job-market analysis and the available job offers. Return ONLY valid JSON.
    Rules:
    - Use only the CV analysis, market analysis, and job offers provided below.
    - Compare the candidate's extracted skills with dominant skills/tools required by the market.
    - Recommend job offers according to the person's current skills and realistic gaps.
    - Missing skills must be technologies, tools, frameworks, languages, methods, or important soft skills that appear in the market data.
    - Roadmap items must be practical and specific for each missing or weak technology/tool.
    - Scores must be integers from 0 to 100.
    - Keep the output concise and useful for a job seeker.

    Return this JSON structure:
    {
      "overall_match_percentage": 0,
      "profile_summary": "",
      "matched_skills": [],
      "missing_skills": [
        { "name": "", "category": "", "priority": "High", "reason": "" }
      ],
      "dominant_market_tools": [],
      "workplace_trends": [],
      "recommended_jobs": [
        {
          "job_id": "",
          "match_percentage": 0,
          "matched_skills": [],
          "missing_skills": [],
          "why_good_fit": "",
          "application_advice": ""
        }
      ],
      "roadmap": [
        {
          "technology": "",
          "priority": "High",
          "why": "",
          "steps": [],
          "practice_project": "",
          "estimated_time": ""
        }
      ],
      "application_advice": []
    }

    CV analysis JSON:
    ${JSON.stringify(resumeAnalysis || {})}

    Market analysis JSON:
    ${JSON.stringify(marketAnalysis || {})}

    Job offers JSON:
    ${JSON.stringify(compactJobs)}`;

    try {
        return await generateJSON(prompt);
    } catch (error) {
        console.error("Gemini profile comparison error:", error);
        throw error;
    }
};

module.exports = {
    analyzeCV,
    generateInterviewQuestions,
    analyzeJobMarket,
    analyzeProfileFit
};
