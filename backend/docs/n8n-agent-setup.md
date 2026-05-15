# n8n Agent Setup: Gemini + JSearch

Use this setup with the backend `.env` values already configured.

## Important Architecture Rule

Do not let the main workflow send Gmail immediately after generating an application.

Correct flow:

```txt
Resume upload
-> CV analysis
-> market analysis
-> job matching
-> application draft generation
-> backend callback
-> frontend approval
-> separate email sending workflow
```

The user must approve before Gmail sends anything.

## Credentials To Create In n8n

Create these credentials:

- Gemini / Google Gemini API credential using `GEMINI_API_KEY`.
- Gmail OAuth2 credential using your Google OAuth client ID and secret.
- Optional Hunter API credential using `HUNTER_API_KEY`.
- Optional Apollo API credential using `APOLLO_API_KEY`.

If n8n shows `access to env vars denied`, do not use `{{$env...}}` in nodes.
Create n8n credentials instead, or paste the value into the node credential fields.
The backend `.env` is not automatically available inside n8n.

If n8n does not have a native Gemini node, use an HTTP Request node:

```txt
POST https://generativelanguage.googleapis.com/v1beta/models/{{$env.GEMINI_MODEL || "gemini-2.5-flash"}}:generateContent?key={{$env.GEMINI_API_KEY}}
```

No-env fallback:

```txt
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=YOUR_GEMINI_API_KEY
```

## Backend Callback Node

Every workflow should finish with an HTTP Request node:

```txt
Method: POST
URL: http://localhost:3000/api/v1/n8n/events
Header: Content-Type = application/json
Header: x-n8n-secret = your N8N_SHARED_SECRET value
Body Content Type: JSON
```

## Workflow 1: Resume Upload

Webhook node:

```txt
Path: recruitment/resume-upload
Method: POST
Response: Immediately
```

Input from backend:

```json
{
  "userId": "...",
  "resumeId": "...",
  "agentRunId": "...",
  "extractedText": "...",
  "workflow": "RESUME_UPLOAD",
  "correlationId": "..."
}
```

Use this detailed Gemini prompt for CV analysis:

```txt
You are a strict recruitment CV parser.
Analyze the CV text and return ONLY valid JSON. No markdown, no comments.

Rules:
- Use only facts explicitly present in the CV.
- Do not invent skills, projects, employers, certifications, education, dates, or location.
- If a field is missing, use "" or [].
- main_profile must be a job family without seniority, for example "Full-stack Developer".
- seniority_level must be separate: Intern, Entry-level, Junior, Mid-Level, Senior, Lead, Architect, or Unknown.
- For a student/recent graduate with internships, use "Entry-level" unless the CV clearly says Junior.
- Keep original language when useful, but normalize dates where possible.
- Split technical skills by category. Do not put frameworks as programming languages.
- Extract projects with name, technologies if clear, and short factual description.
- Extract geographic profile from address, nationality, city, country, preferred work mode, or remote/relocation hints.

Return:
{
  "full_name": "",
  "email": "",
  "phone": "",
  "professional_summary": "",
  "main_profile": "",
  "seniority_level": "",
  "years_of_experience": 0,
  "geographical_profile": {
    "country": "",
    "city": "",
    "region": "",
    "timezone": "",
    "preferred_work_locations": [],
    "remote_preference": "UNKNOWN",
    "relocation_preference": "UNKNOWN"
  },
  "education": [
    {
      "degree": "",
      "field_of_study": "",
      "institution": "",
      "start_date": "",
      "end_date": "",
      "location": ""
    }
  ],
  "work_experience": [
    {
      "title": "",
      "company": "",
      "start_date": "",
      "end_date": "",
      "location": "",
      "description": []
    }
  ],
  "projects": [
    {
      "name": "",
      "description": "",
      "technologies": [],
      "type": ""
    }
  ],
  "hard_skills": [],
  "soft_skills": [],
  "technical_skills": {
    "programming_languages": [],
    "frameworks_libraries": [],
    "databases": [],
    "tools_and_platforms": [],
    "ides": [],
    "cloud_platforms": [],
    "devops_tools": [],
    "methodologies": []
  },
  "technologies": [],
  "frameworks": [],
  "certifications": [],
  "languages": [
    {
      "language": "",
      "level": ""
    }
  ],
  "tools": [],
  "cloud_platforms": [],
  "devops_tools": [],
  "databases": [],
  "interests": [],
  "ats_analysis": {}
}

CV:
{{$json.extractedText}}
```

Important n8n mapping:

- Store the parsed Gemini JSON in a field named `analysis`.
- If the Gemini node returns text, add a Code node after it:

```js
const raw = $json.text || $json.output || $json.content || "";
const cleaned = raw.replace(/```json|```/g, "").trim();
return [{ json: { ...$input.first().json, analysis: JSON.parse(cleaned) } }];
```

Backend callback body:

```json
{
  "type": "RESUME_ANALYSIS_RESULT",
  "agentRunId": "={{$json.agentRunId}}",
  "userId": "={{$json.userId}}",
  "resumeId": "={{$json.resumeId}}",
  "status": "COMPLETED",
  "progress": 100,
  "currentStep": "Candidate profile extracted",
  "analysisProvider": "gemini",
  "analysisModel": "gemini-2.5-flash",
  "analysis": "={{$json.analysis}}"
}
```

Then trigger Workflow 2 with another HTTP Request node:

```txt
POST http://localhost:5678/webhook/recruitment/market-analysis
```

Body:

```json
{
  "userId": "={{$json.userId}}",
  "resumeId": "={{$json.resumeId}}",
  "agentRunId": "={{$json.agentRunId}}",
  "analysis": "={{$json.analysis}}"
}
```

## Workflow 2: Market Analysis

Webhook path:

```txt
recruitment/market-analysis
```

JSearch HTTP Request:

```txt
Method: GET
URL: https://jsearch.p.rapidapi.com/search
Header: x-rapidapi-key = your JSEARCH_API_KEY
Header: x-rapidapi-host = jsearch.p.rapidapi.com
Query:
  query = {{$json.analysis.main_profile}} {{$json.analysis.geographical_profile.city}}
  country = ma
  language = en
  page = 1
  num_pages = 1
```

Gemini market prompt:

```txt
Analyze these JSearch jobs for the candidate profile.
Return ONLY JSON with:
{
  "target_profile": "",
  "jobs_analyzed_count": 0,
  "dominant_technical_skills": [],
  "dominant_soft_skills": [],
  "common_frameworks": [],
  "common_programming_languages": [],
  "common_tools": [],
  "common_databases": [],
  "common_certifications": [],
  "common_responsibilities": [],
  "hiring_trends": [],
  "cloud_technologies_demand": [],
  "devops_demand": [],
  "ai_data_trends": [],
  "frontend_backend_trends": [],
  "salary_trends": {},
  "regional_demand_analysis": {},
  "role_popularity": [],
  "technology_frequency": [],
  "market_summary": ""
}

Candidate:
{{JSON.stringify($json.analysis)}}

Jobs:
{{JSON.stringify($json.jobs)}}
```

Callback body:

```json
{
  "type": "MARKET_ANALYSIS_RESULT",
  "agentRunId": "={{$json.agentRunId}}",
  "userId": "={{$json.userId}}",
  "resumeId": "={{$json.resumeId}}",
  "status": "COMPLETED",
  "progress": 100,
  "query": "={{$json.query}}",
  "mainProfile": "={{$json.analysis.main_profile}}",
  "seniorityLevel": "={{$json.analysis.seniority_level}}",
  "country": "ma",
  "city": "={{$json.analysis.geographical_profile.city}}",
  "jobs": "={{$json.jobs}}",
  "marketAnalysis": "={{$json.marketAnalysis}}",
  "profileComparison": {}
}
```

Then trigger Workflow 3.

## Workflow 3: Job Matching

Input:

```json
{
  "userId": "...",
  "resumeId": "...",
  "analysis": {},
  "jobs": [],
  "marketAnalysis": {}
}
```

Gemini matching prompt:

```txt
Compare the resume analysis, market analysis, and jobs.
Keep only high-quality relevant jobs.
Remove duplicates, expired jobs, suspicious offers, and low-quality matches.
Return ONLY JSON:
{
  "matches": [
    {
      "job": {},
      "compatibilityScore": 0,
      "successProbability": 0,
      "matchingTechnologies": [],
      "missingSkills": [],
      "reasons": [],
      "recommendation": "STRONG_MATCH",
      "aiRationale": ""
    }
  ]
}

Resume:
{{JSON.stringify($json.analysis)}}

Market:
{{JSON.stringify($json.marketAnalysis)}}

Jobs:
{{JSON.stringify($json.jobs)}}
```

Callback type:

```txt
JOB_MATCHES_RESULT
```

Then trigger Workflow 4.

## Workflow 4: Email Discovery

Webhook path:

```txt
recruitment/email-discovery
```

Input from the backend after job matching:

```json
{
  "userId": "...",
  "resumeId": "...",
  "agentRunId": "...",
  "matches": [
    {
      "jobMatchId": "...",
      "jobId": "...",
      "companyName": "Company",
      "companyDomain": "company.com",
      "companyWebsite": "https://company.com",
      "title": "Backend Developer"
    }
  ]
}
```

For each match, choose the domain in this order:

```txt
companyDomain
domain from companyWebsite
```

Do not use job-board domains like linkedin.com, indeed.com, glassdoor.com, or workable.com.

Hunter HTTP Request:

```txt
Method: GET
URL: https://api.hunter.io/v2/domain-search
Query:
  domain = {{$json.companyDomain}}
  api_key = YOUR_HUNTER_API_KEY
  limit = 10
```

Backend callback body:

```json
{
  "type": "EMAIL_DISCOVERY_RESULT",
  "agentRunId": "={{$json.agentRunId}}",
  "userId": "={{$json.userId}}",
  "resumeId": "={{$json.resumeId}}",
  "status": "COMPLETED",
  "progress": 100,
  "currentStep": "Recruiter emails discovered",
  "discoveries": [
    {
      "jobMatchId": "={{$json.jobMatchId}}",
      "jobId": "={{$json.jobId}}",
      "domain": "={{$json.domain}}",
      "source": "hunter",
      "contacts": "={{$json.data.emails}}"
    }
  ]
}
```

The backend also exposes a direct test endpoint:

```txt
POST /api/v1/recruitment/email-discovery
Authorization: Bearer <token>
Body: { "resumeId": "...", "limit": 10, "hunterLimit": 10 }
```

It searches Hunter for the user's matched jobs and stores contacts on `JobOpportunity.contacts`.

## Workflow 5: Application Generation

Only generate drafts for matched jobs. Do not send Gmail.

Gemini prompt:

```txt
Generate a factual application email and concise ATS-friendly cover letter.

Rules:
- Use only factual information from the resume.
- Do not invent skills, projects, certifications, employers, or years of experience.
- Do not exaggerate.
- Keep the email concise and professional.

Return ONLY JSON:
{
  "applications": [
    {
      "resumeId": "",
      "jobId": "",
      "jobMatchId": "",
      "recruiter": {
        "email": "",
        "source": "job_api"
      },
      "subject": "",
      "body": "",
      "coverLetter": "",
      "factualityWarnings": []
    }
  ]
}
```

Callback type:

```txt
APPLICATION_DRAFT_RESULT
```

The frontend will show these drafts for approval.

## Workflow 6: Email Sending

This workflow starts only after the backend receives approval from:

```txt
POST /api/v1/applications/:id/decision
```

Webhook path:

```txt
recruitment/email-sending
```

Steps:

1. Fetch application data from backend or use incoming `applicationId`.
2. Gmail node sends email.
3. Callback backend with:

```json
{
  "type": "APPLICATION_STATUS_RESULT",
  "agentRunId": "={{$json.agentRunId}}",
  "applicationId": "={{$json.applicationId}}",
  "status": "SENT",
  "threadId": "={{$json.threadId}}",
  "messageId": "={{$json.messageId}}",
  "statusReason": "Application email sent through Gmail.",
  "notificationType": "APPLICATION_SENT"
}
```

## Workflow 7: Gmail Monitoring

Use Gmail Trigger or a scheduled Gmail Search node.

Classify replies with Gemini:

```txt
Classify this recruiter email into one of:
PENDING, INTERVIEW, ACCEPTED, REJECTED, GHOSTED, OFFER.

Return ONLY JSON:
{
  "status": "",
  "statusReason": "",
  "nextAction": "",
  "notificationType": ""
}

Email:
{{$json.text}}
```

Callback type:

```txt
APPLICATION_STATUS_RESULT
```
