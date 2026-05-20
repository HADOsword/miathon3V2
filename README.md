# Miathon AI Recruitment Assistant

Miathon is an AI-powered recruitment workflow app that helps a candidate turn a CV into practical job-search intelligence.

Upload a CV, let the automation analyze the profile, discover relevant job opportunities, calculate match scores, identify skill gaps, and find company or recruiter emails for matched jobs.

## What It Does

- Upload a PDF or DOCX CV
- Extract and structure candidate information
- Analyze the candidate profile with Gemini
- Search job offers with JSearch
- Compare the CV against market demand
- Save matched job opportunities
- Show compatibility and success scores
- Discover company/recruiter emails with Hunter
- Track long-running workflow progress from the frontend
- Store results in MongoDB for later review

## Demo Flow

```txt
1. Sign up or log in
2. Upload a CV
3. The backend starts an n8n workflow
4. n8n analyzes the CV and searches jobs
5. Matching results are saved in MongoDB
6. The frontend waits until the workflow finishes
7. The user reviews matched jobs, scores, gaps, and discovered emails
```

## Screens and User Experience

- Landing page
- Register and login
- Dashboard
- CV upload page
- Resume data manager
- Market comparison page
- Matched jobs and company email discovery
- Notifications and workflow progress

## Architecture

```txt
React frontend
  -> Express backend API
    -> MongoDB
    -> Gemini
    -> JSearch
    -> Hunter
    -> n8n workflow automation
      -> Backend callback endpoint
  -> Frontend reads the saved backend state
```

The frontend does not call n8n directly in normal usage. The frontend calls the backend, and the backend triggers n8n.

## Tech Stack

**Frontend**

- React
- Vite
- React Router
- Tailwind CSS
- Axios
- Framer Motion
- Lucide React

**Backend**

- Node.js
- Express
- MongoDB and Mongoose
- JWT authentication
- Multer uploads
- PDF and DOCX parsing
- Gemini API
- JSearch API
- Hunter API
- n8n webhooks

## Project Structure

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

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- MongoDB database
- Gemini API key
- RapidAPI JSearch key
- Hunter API key
- n8n account or self-hosted n8n instance

### 1. Clone The Repository

```bash
git clone <your-repo-url>
cd miathon3V2
```

### 2. Install Dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 3. Configure Backend Environment

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

JSEARCH_API_KEY=your_jsearch_api_key
JSEARCH_API_HOST=jsearch.p.rapidapi.com
HUNTER_API_KEY=your_hunter_api_key

USE_N8N_RESUME_WORKFLOW=true
N8N_BASE_URL=https://your-n8n-instance
BACKEND_URL=http://localhost:3000
N8N_SHARED_SECRET=your_shared_secret

N8N_RESUME_UPLOAD_WEBHOOK=/webhook/recruitment/resume-upload
N8N_MARKET_ANALYSIS_WEBHOOK=/webhook/recruitment/market-analysis
N8N_JOB_MATCHING_WEBHOOK=/webhook/recruitment/job-matching
N8N_EMAIL_DISCOVERY_WEBHOOK=/webhook/recruitment/email-discovery
```

For manual n8n testing, use `/webhook-test/...` and click **Listen for test event** in n8n before uploading a CV.

For automatic execution, activate the workflow in n8n and use `/webhook/...`.

### 4. Configure Frontend Environment

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000/api/v1
```

If you expose the backend through ngrok:

```env
VITE_API_URL=https://your-ngrok-domain/api/v1
```

### 5. Run The App

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

Open:

```txt
http://localhost:5173
```

## Main API Routes

### Authentication

```txt
POST /api/v1/register
POST /api/v1/login
GET  /api/v1/profile
PATCH /api/v1/profile
```

### CV and Resume Data

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
```

### Market Analysis

```txt
GET /api/v1/resumes/:resumeId/jobs
GET /api/v1/resumes/:resumeId/jobs/latest
```

### n8n Callback

```txt
POST /api/v1/n8n/events
```

## n8n Workflow Notes

The main workflow starts from:

```txt
POST /webhook/recruitment/resume-upload
```

The backend sends:

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

n8n should callback to:

```txt
POST /api/v1/n8n/events
```

with:

```txt
x-n8n-secret: your_shared_secret
```

The final callback should mark the workflow complete:

```json
{
  "type": "EMAIL_DISCOVERY_RESULT",
  "agentRunId": "...",
  "status": "COMPLETED",
  "progress": 100,
  "currentStep": "Workflow completed"
}
```

## Documentation

More setup notes are available in:

- `backend/docs/n8n-recruitment-workflows.md`
- `backend/docs/n8n-apply-workflows-setup.md`
- `frontend/WORKFLOW_INTEGRATION_GUIDE.md`

## Build

Build the frontend:

```bash
cd frontend
npm run build
```

Run the backend in production mode:

```bash
cd backend
npm start
```

## Security Notes

This project handles CVs and API credentials, so treat configuration carefully:

- Do not commit `.env` files.
- Do not commit uploaded CVs.
- Rotate any API key that was accidentally shared.
- Use a strong `JWT_SECRET`.
- Use a strong `N8N_SHARED_SECRET`.
- Keep production n8n workflows on `/webhook/...`.
- Use `/webhook-test/...` only while manually testing.

## Current Status

Implemented:

- CV upload
- AI CV extraction workflow
- Job search and matching workflow
- Company/recruiter email discovery
- Frontend workflow progress tracking
- Match and email display in the market page

Planned or optional:

- Gmail OAuth connection
- User-reviewed application draft generation
- Approved email sending through the user's Gmail account
- Reply monitoring and status classification

## License

This project is currently shared as a portfolio and learning project. Add a license file before allowing external reuse.

