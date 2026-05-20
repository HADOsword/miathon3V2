# AI Recruitment Workflow Assistant

A full-stack AI recruitment assistant that turns an uploaded CV into structured candidate data, job-market analysis, matched job opportunities, and recruiter/company email discovery.

The project combines a React frontend, an Express/MongoDB backend, Gemini-powered analysis, JSearch job data, Hunter email discovery, and n8n workflow orchestration.

## Features

- User authentication with JWT-protected routes
- CV upload for PDF and DOCX files
- Text extraction and structured resume storage
- Gemini CV/profile analysis
- JSearch-powered job discovery
- AI job-market comparison and skill-gap analysis
- Saved matched jobs with compatibility and success scores
- Hunter-powered company/recruiter email discovery
- n8n workflow callbacks for long-running automation
- Frontend polling for workflow progress until completion
- Dashboard, resume management, market comparison, roadmap, and email discovery views

## Architecture

```txt
Frontend React app
  -> Backend Express API
    -> MongoDB
    -> Gemini
    -> JSearch
    -> Hunter
    -> n8n workflows
      -> Backend callback /api/v1/n8n/events
  -> Frontend reads saved backend state
```

The frontend does not call n8n directly during normal usage. It calls the backend, and the backend triggers n8n.

## Tech Stack

### Frontend

- React
- Vite
- React Router
- Axios
- Tailwind CSS
- Framer Motion
- Lucide React

### Backend

- Node.js
- Express
- MongoDB / Mongoose
- JWT authentication
- Multer file uploads
- PDF/DOCX parsing
- Gemini API
- JSearch API
- Hunter API
- n8n webhooks

## Repository Structure

```txt
.
|-- backend
|   |-- app.js
|   |-- controllers
|   |-- db
|   |-- docs
|   |-- middleware
|   |-- models
|   |-- routes
|   |-- services
|   `-- uploads
|-- frontend
|   |-- src
|   |   |-- api
|   |   |-- components
|   |   `-- pages
|   |-- WORKFLOW_INTEGRATION_GUIDE.md
|   `-- vite.config.js
`-- README.md
```

## Main Workflow

```txt
1. User uploads CV from frontend
2. Backend stores the CV and extracted text
3. Backend creates an AgentRun
4. Backend triggers n8n RESUME_UPLOAD workflow
5. n8n analyzes CV, searches jobs, ranks matches, and discovers company emails
6. n8n sends callbacks to backend
7. Backend stores profiles, market analysis, matches, contacts, and notifications
8. Frontend polls backend until the workflow finishes
9. User reviews matched jobs and discovered recruiter/company emails
```

## Important Routes

### Auth

```txt
POST /api/v1/register
POST /api/v1/login
GET  /api/v1/profile
PATCH /api/v1/profile
```

### CV and Resumes

```txt
POST   /api/v1/cv/upload
GET    /api/v1/resumes
GET    /api/v1/resumes/:id
PATCH  /api/v1/resumes/:id
DELETE /api/v1/resumes/:id
```

### Recruitment Workflow

```txt
GET  /api/v1/recruitment/dashboard
POST /api/v1/recruitment/workflows
POST /api/v1/recruitment/email-discovery
POST /api/v1/recruitment/chat
```

### Jobs and Market Analysis

```txt
GET /api/v1/resumes/:resumeId/jobs
GET /api/v1/resumes/:resumeId/jobs/latest
```

### n8n Callbacks

```txt
POST /api/v1/n8n/events
```

## Environment Variables

Never commit real `.env` files or API keys.

### Backend

Create `backend/.env`:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=3000
JSON_BODY_LIMIT=10mb

AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
AI_MAX_CV_CHARS=60000
AI_MAX_JOB_DESCRIPTION_CHARS=1800

JSEARCH_API_KEY=your_rapidapi_jsearch_key
JSEARCH_API_HOST=jsearch.p.rapidapi.com

HUNTER_API_KEY=your_hunter_api_key
APOLLO_API_KEY=your_apollo_api_key

USE_N8N_RESUME_WORKFLOW=true
N8N_BASE_URL=https://your-n8n-instance
BACKEND_URL=https://your-public-backend-url
N8N_SHARED_SECRET=your_shared_secret

N8N_RESUME_UPLOAD_WEBHOOK=/webhook/recruitment/resume-upload
N8N_MARKET_ANALYSIS_WEBHOOK=/webhook/recruitment/market-analysis
N8N_JOB_MATCHING_WEBHOOK=/webhook/recruitment/job-matching
N8N_EMAIL_DISCOVERY_WEBHOOK=/webhook/recruitment/email-discovery
N8N_APPLICATION_GENERATION_WEBHOOK=/webhook/recruitment/application-generation
N8N_EMAIL_SENDING_WEBHOOK=/webhook/recruitment/email-sending
N8N_GMAIL_MONITORING_WEBHOOK=/webhook/recruitment/gmail-monitoring
N8N_NOTIFICATION_WEBHOOK=/webhook/recruitment/notification
N8N_CHAT_WEBHOOK=/webhook/recruitment/chat
```

For n8n test mode, use `/webhook-test/...` and click **Listen for test event** before triggering the workflow.

For automatic execution, activate the n8n workflow and use `/webhook/...`.

### Frontend

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000/api/v1
```

When testing with ngrok:

```env
VITE_API_URL=https://your-ngrok-domain/api/v1
```

## Installation

Install dependencies for both apps:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Running Locally

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend:

```bash
cd frontend
npm run dev
```

Frontend:

```txt
http://localhost:5173
```

Backend:

```txt
http://localhost:3000/api/v1
```

## n8n Setup Notes

The resume upload workflow should start with a Webhook node:

```txt
POST /webhook/recruitment/resume-upload
```

The backend sends a payload containing:

```json
{
  "workflow": "RESUME_UPLOAD",
  "userId": "...",
  "resumeId": "...",
  "agentRunId": "...",
  "originalFileName": "...",
  "storedFileName": "...",
  "filePath": "...",
  "mimeType": "...",
  "extractedText": "..."
}
```

n8n should call back to:

```txt
POST /api/v1/n8n/events
```

with the shared secret header:

```txt
x-n8n-secret: N8N_SHARED_SECRET
```

The final callback should mark the agent run as complete:

```json
{
  "type": "EMAIL_DISCOVERY_RESULT",
  "agentRunId": "...",
  "status": "COMPLETED",
  "progress": 100,
  "currentStep": "Workflow completed"
}
```

## Useful Docs In This Repo

- `backend/docs/n8n-recruitment-workflows.md`
- `backend/docs/n8n-apply-workflows-setup.md`
- `frontend/WORKFLOW_INTEGRATION_GUIDE.md`

## Build

Build frontend:

```bash
cd frontend
npm run build
```

Run backend:

```bash
cd backend
npm start
```

## Security Notes

- Do not commit `.env` files.
- Rotate any API key that was ever exposed publicly.
- Keep `N8N_SHARED_SECRET` strong and private.
- Use `/webhook/...` only for active n8n workflows.
- Use `/webhook-test/...` only for manual testing.
- Store uploaded CVs carefully; they contain personal data.

## Status

Current implemented workflow:

```txt
CV upload
-> n8n workflow trigger
-> profile extraction
-> job search
-> job matching
-> company/recruiter email discovery
-> backend storage
-> frontend progress/results display
```

Email auto-apply is intentionally separate from the main workflow and should only be enabled after Gmail OAuth, draft review, and user approval are fully verified.
