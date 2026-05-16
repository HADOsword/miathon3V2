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
- `GET /api/v1/n8n/application-context`: secret-protected context endpoint for application draft generation.
- `GET /api/v1/n8n/applications/:id/send-payload`: secret-protected approved email payload endpoint for Gmail sending.
- `GET /api/v1/n8n/resumes/:id/download`: secret-protected CV download endpoint for n8n Cloud attachments.
- `GET /api/v1/recruitment/dashboard`: dashboard data for the lightweight frontend.
- `GET /api/v1/applications`: generated drafts and sent applications.
- `POST /api/v1/applications/apply`: authenticated user request to apply to a matched job. Requires connected Gmail.
- `POST /api/v1/applications/:id/decision`: `APPROVE`, `EDIT`, `REJECT`, or `POSTPONE`.
- `GET /api/v1/integrations/gmail/connect`: returns the Google OAuth URL for the logged-in user.
- `GET /api/v1/integrations/gmail/status`: returns connected Gmail state.
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

### Email Discovery

```json
{
  "type": "EMAIL_DISCOVERY_RESULT",
  "agentRunId": "...",
  "userId": "...",
  "resumeId": "...",
  "status": "COMPLETED",
  "progress": 100,
  "currentStep": "Recruiter emails discovered",
  "discoveries": [
    {
      "jobMatchId": "...",
      "jobId": "...",
      "domain": "company.com",
      "source": "hunter",
      "contacts": [
        {
          "email": "recruiter@company.com",
          "firstName": "Jane",
          "lastName": "Doe",
          "position": "Talent Acquisition",
          "department": "hr",
          "seniority": "senior",
          "type": "personal",
          "confidence": 92,
          "linkedinUrl": "https://linkedin.com/in/...",
          "source": "hunter"
        }
      ]
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
4. Email Discovery: use recruiter fields or Hunter/Apollo APIs only, then store contacts on the matched `JobOpportunity`.
5. Application Generation: generate factual email and cover letter, call back `APPLICATION_DRAFT_RESULT`.
6. Email Sending: triggered only after user approval, send through Gmail API.
7. Gmail Monitoring: Gmail API watch/poll fallback, classify replies.
8. Notification System: create actionable status updates.

## Gmail-Gated Apply Flow

The user must connect Gmail before the app queues an application draft or sends an email. The sender is always the user's connected Gmail account, never a shared system mailbox.

For local development with ngrok, use this backend base URL in n8n:

```txt
BACKEND_URL=https://acronym-clerk-unclog.ngrok-free.dev
```

In Google Cloud Console, the authorized redirect URI must exactly match:

```txt
https://acronym-clerk-unclog.ngrok-free.dev/api/v1/integrations/gmail/callback
```

Frontend flow:

1. User clicks apply on a saved `JobMatch`.
2. Frontend calls `POST /api/v1/applications/apply` with `{ "jobMatchId": "...", "resumeId": "..." }`.
3. If Gmail is missing, backend returns `409` with `requiresGmailAuth: true`.
4. Frontend calls `GET /api/v1/integrations/gmail/connect`, opens the returned `authUrl`, and waits for Google OAuth callback.
5. User retries apply after `GET /api/v1/integrations/gmail/status` returns `connected: true`.
6. n8n creates the draft and backend stores it as `WAITING_USER_APPROVAL`.
7. User approves or edits with `POST /api/v1/applications/:id/decision`.
8. Backend queues `EMAIL_SENDING`.

### Application Generation Workflow

n8n nodes:

1. **Webhook**
   - Method: `POST`
   - Path: value from `N8N_APPLICATION_GENERATION_WEBHOOK`
   - Expected fields: `userId`, `resumeId`, `jobMatchId`, `jobId`, `agentRunId`.

2. **HTTP Request: Load Application Context**
   - Method: `GET`
   - URL: `{{BACKEND_URL}}/api/v1/n8n/application-context`
   - Headers: `x-n8n-secret: {{N8N_SHARED_SECRET}}`
   - Query params:
     - `userId={{$json.userId}}`
     - `resumeId={{$json.resumeId}}`
     - `jobMatchId={{$json.jobMatchId}}`

3. **Gemini: Generate Draft**
   - Use `resume.extractedText`, `job.description`, `match.aiRationale`, and `recruiter`.
   - Require strict JSON output:

```json
{
  "subject": "Application for Backend Developer",
  "body": "Email body grounded only in the CV and job description.",
  "coverLetter": "Optional factual cover letter.",
  "factualityWarnings": []
}
```

4. **Function: Build Backend Callback**
   - Build this payload:

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
        "email": "recruiter@company.com",
        "name": "Jane Doe",
        "source": "hunter"
      },
      "subject": "...",
      "body": "...",
      "coverLetter": "...",
      "factualityWarnings": []
    }
  ]
}
```

5. **HTTP Request: Store Draft**
   - Method: `POST`
   - URL: `{{BACKEND_URL}}/api/v1/n8n/events`
   - Headers:
     - `Content-Type: application/json`
     - `x-n8n-secret: {{N8N_SHARED_SECRET}}`

### Email Sending Workflow

n8n nodes:

1. **Webhook**
   - Method: `POST`
   - Path: value from `N8N_EMAIL_SENDING_WEBHOOK`
   - Expected fields: `userId`, `applicationId`, `agentRunId`.

2. **HTTP Request: Load Approved Send Payload**
   - Method: `GET`
   - URL: `{{BACKEND_URL}}/api/v1/n8n/applications/{{$json.applicationId}}/send-payload`
   - Headers: `x-n8n-secret: {{N8N_SHARED_SECRET}}`
   - Returns: `to`, `from`, `subject`, `body`, `gmail.accessToken`, and `resume.filePath`.

3. **HTTP Request: Download CV**
   - Method: `GET`
   - URL: `{{$json.resume.downloadUrl}}`
   - Header: `x-n8n-secret: {{N8N_SHARED_SECRET}}`
   - Response format: file
   - Binary property: `cv`

4. **HTTP Request: Gmail Send**
   - Method: `POST`
   - URL: `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`
   - Header: `Authorization: Bearer {{$json.gmail.accessToken}}`
   - Body: raw MIME email encoded as base64url.
   - Include the CV file as an attachment.

5. **HTTP Request: Callback Sent Status**
   - Method: `POST`
   - URL: `{{BACKEND_URL}}/api/v1/n8n/events`
   - Headers:
     - `Content-Type: application/json`
     - `x-n8n-secret: {{N8N_SHARED_SECRET}}`
   - Payload:

```json
{
  "type": "APPLICATION_STATUS_RESULT",
  "agentRunId": "...",
  "applicationId": "...",
  "status": "SENT",
  "threadId": "gmail-thread-id",
  "messageId": "gmail-message-id",
  "sentAt": "2026-05-16T00:00:00.000Z",
  "notificationType": "APPLICATION_SENT",
  "notificationTitle": "Application sent",
  "statusReason": "Application email was sent through the user's connected Gmail account."
}
```
