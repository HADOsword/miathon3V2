# n8n Recruitment Workflows

This backend is the control plane. n8n is the automation brain for slow, external, or AI-heavy work.

## Rules

- Use only official APIs, authorized providers, Gmail API, OAuth, and structured job APIs.
- Do not use Puppeteer, Selenium, Playwright scraping, LinkedIn bots, or HTML job board scraping.
- Every generated application must stop at user approval before Gmail sending.

## Backend Entry Points

- `POST /api/v1/cv/upload`: stores the resume, extracts text quickly, creates an `AgentRun`, then triggers `RESUME_UPLOAD`.
- `POST /api/v1/recruitment/workflows`: authenticated manual workflow trigger.
- `POST /api/v1/n8n/events`: signed callback endpoint used by n8n to update MongoDB.
- `GET /api/v1/recruitment/dashboard`: dashboard data for the lightweight frontend.
- `GET /api/v1/applications`: generated drafts and sent applications.
- `POST /api/v1/applications/:id/decision`: `APPROVE`, `EDIT`, `REJECT`, or `POSTPONE`.
- `GET /api/v1/notifications`: notification center.
- `POST /api/v1/recruitment/chat`: queues a chat-agent request in n8n.

## Callback Signing

n8n should send the JSON payload to `/api/v1/n8n/events` with either the simple local-development header:

```txt
x-n8n-secret: N8N_SHARED_SECRET
```

or the stronger HMAC header:

```txt
x-n8n-signature: HMAC_SHA256(JSON.stringify(payload), N8N_SHARED_SECRET)
```

If `N8N_SHARED_SECRET` is empty, signature verification is disabled for local development.

## Required Callback Payloads

### Resume Analysis

```json
{
  "type": "RESUME_ANALYSIS_RESULT",
  "agentRunId": "...",
  "userId": "...",
  "resumeId": "...",
  "status": "COMPLETED",
  "progress": 100,
  "currentStep": "Candidate profile extracted",
  "extractedText": "optional cleaned text",
  "analysisProvider": "gemini",
  "analysisModel": "gemini-2.5-flash",
  "analysis": {
    "main_profile": "Full Stack Developer",
    "seniority_level": "Junior",
    "geographical_profile": {
      "country": "Morocco",
      "city": "Casablanca",
      "region": "Casablanca-Settat",
      "timezone": "Africa/Casablanca",
      "preferred_work_locations": ["Casablanca", "Remote Europe"],
      "remote_preference": "FLEXIBLE",
      "relocation_preference": "OPEN"
    }
  }
}
```

### Market Analysis

```json
{
  "type": "MARKET_ANALYSIS_RESULT",
  "agentRunId": "...",
  "userId": "...",
  "resumeId": "...",
  "query": "Full Stack Developer Casablanca",
  "mainProfile": "Full Stack Developer",
  "seniorityLevel": "Junior",
  "country": "ma",
  "city": "Casablanca",
  "jobs": [],
  "marketAnalysis": {},
  "profileComparison": {}
}
```

### Job Matches

```json
{
  "type": "JOB_MATCHES_RESULT",
  "agentRunId": "...",
  "userId": "...",
  "resumeId": "...",
  "matches": [
    {
      "job": {
        "job_id": "provider-id",
        "source": "jsearch",
        "job_title": "Backend Developer",
        "employer_name": "Company",
        "description": "Structured API description only"
      },
      "compatibilityScore": 86,
      "successProbability": 62,
      "matchingTechnologies": ["Node.js", "MongoDB"],
      "missingSkills": ["Docker"],
      "recommendation": "STRONG_MATCH"
    }
  ]
}
```

### Application Drafts

```json
{
  "type": "APPLICATION_DRAFT_RESULT",
  "agentRunId": "...",
  "userId": "...",
  "applications": [
    {
      "resumeId": "...",
      "jobId": "...",
      "jobMatchId": "...",
      "recruiter": {
        "email": "recruiter@example.com",
        "source": "hunter"
      },
      "subject": "Application for Backend Developer",
      "body": "Factual email grounded only in the resume",
      "coverLetter": "ATS-friendly factual cover letter",
      "factualityWarnings": []
    }
  ]
}
```

### Gmail Sending or Monitoring Status

```json
{
  "type": "APPLICATION_STATUS_RESULT",
  "agentRunId": "...",
  "applicationId": "...",
  "status": "INTERVIEW",
  "threadId": "gmail-thread-id",
  "messageId": "gmail-message-id",
  "statusReason": "Recruiter invited the candidate to interview.",
  "nextAction": "Reply with availability.",
  "notificationType": "INTERVIEW"
}
```

## Recommended Workflow Order

1. Resume Upload: parse, analyze, extract geo profile, call back `RESUME_ANALYSIS_RESULT`.
2. Market Analysis: query the JSearch API, generate structured intelligence with Gemini.
3. Job Matching: rank jobs, remove duplicates/expired/suspicious offers, save high-quality matches.
4. Email Discovery: use recruiter fields or Hunter/Apollo APIs only.
5. Application Generation: generate factual email and cover letter, call back `APPLICATION_DRAFT_RESULT`.
6. Email Sending: triggered only after user approval, send through Gmail API.
7. Gmail Monitoring: Gmail API watch/poll fallback, classify replies.
8. Notification System: create actionable status updates.
