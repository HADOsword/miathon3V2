# Frontend Workflow Integration Guide

This guide explains how the frontend should connect to the backend and n8n-powered recruitment workflow.

## Environment

Create `frontend/.env`:

```env
VITE_API_URL=https://acronym-clerk-unclog.ngrok-free.dev/api/v1
VITE_N8N_RESUME_UPLOAD_WEBHOOK=https://alaeloukili.app.n8n.cloud/webhook-test/recruitment/resume-upload
VITE_N8N_APPLICATION_GENERATION_WEBHOOK=https://alaeloukili.app.n8n.cloud/webhook-test/recruitment/application-generation
VITE_N8N_EMAIL_DISCOVERY_WEBHOOK=https://alaeloukili.app.n8n.cloud/webhook-test/recruitment/email-discovery
```

In the app, use the backend route through `VITE_API_URL`. Do not call n8n directly for normal user actions. The n8n URLs are included only for debugging and visibility.

## API Client

The existing API client already reads:

```js
import.meta.env.VITE_API_URL
```

Every authenticated request must include:

```txt
Authorization: Bearer <jwt_token>
```

The existing `frontend/src/api/client.js` already adds this from `localStorage`.

## Main User Flow

The frontend should follow this sequence:

```txt
Login/Register
-> Upload CV
-> Poll dashboard/resume status
-> Show market analysis and matched jobs
-> Trigger email discovery if needed
-> Display saved recruiter contacts
```

Email auto-apply is intentionally ignored for now.

## Routes Used

### 1. Register

```txt
POST /api/v1/register
```

Full URL:

```txt
https://acronym-clerk-unclog.ngrok-free.dev/api/v1/register
```

Body:

```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password"
}
```

Expected response includes a JWT token. Store it in `localStorage` under:

```txt
token
```

### 2. Login

```txt
POST /api/v1/login
```

Full URL:

```txt
https://acronym-clerk-unclog.ngrok-free.dev/api/v1/login
```

Body:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

Store the returned JWT token in `localStorage` as `token`.

### 3. Upload CV

```txt
POST /api/v1/cv/upload
```

Full URL:

```txt
https://acronym-clerk-unclog.ngrok-free.dev/api/v1/cv/upload
```

Headers:

```txt
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

Form data:

```txt
resume: <PDF or DOCX file>
```

Accepted aliases:

```txt
resume
cv
file
```

Recommended frontend helper:

```js
export const uploadCV = async (file) => {
  const formData = new FormData();
  formData.append("resume", file);

  const response = await api.post("/cv/upload", formData);
  return response.data;
};
```

Expected response contains at least:

```json
{
  "resume": {
    "_id": "...",
    "processingStatus": "PARSING"
  },
  "agentRun": {
    "_id": "...",
    "workflow": "RESUME_UPLOAD",
    "status": "QUEUED"
  },
  "n8n": {
    "triggered": true,
    "correlationId": "..."
  }
}
```

After upload, the backend triggers n8n:

```txt
https://alaeloukili.app.n8n.cloud/webhook-test/recruitment/resume-upload
```

The frontend should not call this n8n URL directly.

### 4. List User Resumes

```txt
GET /api/v1/resumes
```

Full URL:

```txt
https://acronym-clerk-unclog.ngrok-free.dev/api/v1/resumes
```

Headers:

```txt
Authorization: Bearer <jwt_token>
```

Use this to show uploaded CVs and their processing state.

### 5. Get One Resume

```txt
GET /api/v1/resumes/:id
```

Example:

```txt
GET https://acronym-clerk-unclog.ngrok-free.dev/api/v1/resumes/RESUME_ID
```

Route parameter:

```txt
id: MongoDB resume _id
```

Use this to display:

```txt
processingStatus
processingError
analysis
profile
extractedText
```

### 6. Recruitment Dashboard

```txt
GET /api/v1/recruitment/dashboard
```

Full URL:

```txt
https://acronym-clerk-unclog.ngrok-free.dev/api/v1/recruitment/dashboard
```

Headers:

```txt
Authorization: Bearer <jwt_token>
```

Use this as the main polling endpoint after CV upload.

It returns:

```txt
profile
marketAnalysis
matches
applications
notifications
agentRuns
applicationStatusCounts
```

Recommended polling:

```txt
Every 3-5 seconds after upload until latest agentRun is COMPLETED or FAILED.
Stop polling after 60-90 seconds if no terminal status appears.
```

### 7. Search Jobs For Resume

```txt
GET /api/v1/resumes/:resumeId/jobs
```

Example:

```txt
GET https://acronym-clerk-unclog.ngrok-free.dev/api/v1/resumes/RESUME_ID/jobs
```

Route parameter:

```txt
resumeId: MongoDB resume _id
```

Supported query parameters:

```txt
query: optional search query override
country: optional country code, example ma, us, fr
location: optional city/location string, example Casablanca
language: optional language code, default en
page: optional page number
num_pages or numPages: optional number of JSearch pages, max 5
jobs_limit or jobsLimit: optional number of jobs returned after search, max 25
analyze: optional, set false to skip AI market comparison
datePosted: optional value supported by backend/JSearch
date_posted: alias for datePosted
work_from_home or workFromHome: optional boolean-like value for remote jobs
employmentTypes: optional comma-separated list
employment_types: alias for employmentTypes
```

Example:

```txt
GET /api/v1/resumes/RESUME_ID/jobs?query=Full%20Stack%20Developer&country=ma&location=Casablanca&page=1&num_pages=1&jobs_limit=10&work_from_home=false
```

Use this only if the frontend has a manual "search jobs" action. The upload workflow already triggers n8n job discovery.

### 8. Latest Job Comparison For Resume

```txt
GET /api/v1/resumes/:resumeId/jobs/latest
```

Example:

```txt
GET https://acronym-clerk-unclog.ngrok-free.dev/api/v1/resumes/RESUME_ID/jobs/latest
```

Route parameter:

```txt
resumeId: MongoDB resume _id
```

Use this to show the latest market analysis for a selected CV.

### 9. Manual Email Discovery For Matched Jobs

```txt
POST /api/v1/recruitment/email-discovery
```

Full URL:

```txt
https://acronym-clerk-unclog.ngrok-free.dev/api/v1/recruitment/email-discovery
```

Headers:

```txt
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

Body:

```json
{
  "resumeId": "RESUME_ID",
  "limit": 10,
  "hunterLimit": 10
}
```

Body parameters:

```txt
resumeId: optional, filters matches by resume
limit: optional, number of matched jobs to check, min 1, max 50
hunterLimit: optional, Hunter contacts per domain, min 1, max 100
```

The same parameters may also be sent as query parameters:

```txt
POST /api/v1/recruitment/email-discovery?resumeId=RESUME_ID&limit=10&hunterLimit=10
```

Expected response:

```json
{
  "msg": "Email discovery completed.",
  "jobsChecked": 10,
  "contactsCount": 4,
  "discoveries": []
}
```

### 10. Notifications

```txt
GET /api/v1/notifications
```

Full URL:

```txt
https://acronym-clerk-unclog.ngrok-free.dev/api/v1/notifications
```

Use notifications to display workflow progress:

```txt
PROFILE_READY
MARKET_READY
MATCH_READY
AGENT_PROGRESS
APPLICATION_READY
```

Mark as read:

```txt
PATCH /api/v1/notifications/:id/read
```

Route parameter:

```txt
id: notification _id
```

### 11. Manual Workflow Trigger

```txt
POST /api/v1/recruitment/workflows
```

Full URL:

```txt
https://acronym-clerk-unclog.ngrok-free.dev/api/v1/recruitment/workflows
```

Body:

```json
{
  "workflow": "MARKET_ANALYSIS",
  "resumeId": "RESUME_ID",
  "input": {}
}
```

Allowed workflow names:

```txt
RESUME_UPLOAD
MARKET_ANALYSIS
JOB_MATCHING
EMAIL_DISCOVERY
APPLICATION_GENERATION
EMAIL_SENDING
GMAIL_MONITORING
NOTIFICATION
CHAT
```

For the current frontend, use mainly:

```txt
MARKET_ANALYSIS
JOB_MATCHING
EMAIL_DISCOVERY
```

Avoid `APPLICATION_GENERATION` and `EMAIL_SENDING` if email auto-apply is disabled.

### 12. Chat Agent

```txt
POST /api/v1/recruitment/chat
```

Body:

```json
{
  "message": "Find stronger backend jobs for this profile"
}
```

Body parameters:

```txt
message: required string
```

## Frontend State Mapping

Recommended UI states after CV upload:

```txt
UPLOADED: file accepted
PARSING: backend extracted text and started workflow
ANALYZING: AI analysis running
PROFILE_EXTRACTED: profile ready
FAILED: show processingError
```

Agent run states:

```txt
QUEUED
RUNNING
WAITING_USER_APPROVAL
COMPLETED
FAILED
CANCELLED
```

Use `agentRuns[current]` from `/recruitment/dashboard` to show progress:

```txt
currentStep
progress
status
error
```

## Recommended Frontend Pages

### CV Upload Page

Use:

```txt
POST /cv/upload
GET /recruitment/dashboard
GET /resumes/:id
```

Behavior:

1. Upload PDF/DOCX.
2. Show immediate "workflow started" state.
3. Poll dashboard.
4. When profile and matches are ready, show a button to open the matches page.

### Matches Page

Use:

```txt
GET /recruitment/dashboard
GET /resumes/:resumeId/jobs/latest
POST /recruitment/email-discovery
```

Display each match:

```txt
job.title
job.companyName
job.location
compatibilityScore
successProbability
matchingTechnologies
missingSkills
recommendation
job.contacts
```

### Notifications Panel

Use:

```txt
GET /notifications
PATCH /notifications/:id/read
```

## Important Notes

- The frontend should call the backend only through `VITE_API_URL`.
- n8n webhooks are backend-facing. Do not send user actions directly to n8n from the frontend.
- Keep `VITE_API_URL` pointed to ngrok while testing.
- If ngrok URL changes, update both frontend `.env` and backend `.env`.
- Restart Vite after changing `frontend/.env`.
- Restart backend after changing `backend/.env`.
