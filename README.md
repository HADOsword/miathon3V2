<p align="center">
  <img src="./frontend/public/Logo.png" width="180" alt="Miathon logo">
</p>

<h1 align="center"><b>Miathon AI Recruitment Assistant</b></h1>

<h4 align="center"><b>Turn a CV into job matches, market insight, skill gaps, and recruiter emails with AI-powered workflows.</b></h4>

<p align="center">
  <a href="#about">About</a> &bull;
  <a href="#highlights">Highlights</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#getting-started">Getting Started</a> &bull;
  <a href="#security">Security</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node Express">
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB">
  <img src="https://img.shields.io/badge/n8n-Workflow-EA4B71?style=flat-square&logo=n8n&logoColor=white" alt="n8n">
  <img src="https://img.shields.io/badge/Gemini-AI-8E75B2?style=flat-square&logo=google&logoColor=white" alt="Gemini">
</p>

> [!IMPORTANT]
> Miathon is a workflow assistant. It does not guarantee employment, recruiter responses, or job offer accuracy. Job data and email discovery depend on third-party APIs and should be reviewed by the user before taking action.

## About

**Miathon** is a full-stack AI recruitment assistant built to help candidates move from a raw CV to a focused job-search plan.

Instead of manually reading job boards, comparing requirements, and searching company contact emails, Miathon automates the heavy lifting:

```txt
Upload CV -> Analyze profile -> Search jobs -> Match offers -> Discover recruiter emails -> Review results
```

The app is designed around one simple idea: the frontend should feel calm and useful, while the backend and n8n workflows handle slow AI and external API work in the background.

## Highlights

* **CV intelligence:** Upload a PDF or DOCX and extract structured candidate data.
* **AI profile analysis:** Use Gemini to identify profile, seniority, skills, experience, and market positioning.
* **Job discovery:** Search relevant jobs through JSearch.
* **Match scoring:** Store matched jobs with compatibility and success scores.
* **Skill-gap analysis:** See missing skills and roadmap-style improvement suggestions.
* **Email discovery:** Find company or recruiter emails for matched jobs using Hunter.
* **Workflow tracking:** The frontend waits for n8n and displays live workflow progress.
* **Backend-first automation:** The frontend calls the backend; the backend triggers n8n and stores final results.

***

## Features

### Candidate Profile

* Upload CV files in PDF or DOCX format.
* Extract readable text from uploaded resumes.
* Store resume metadata and extracted text in MongoDB.
* Generate structured profile analysis with Gemini.
* Edit and manage saved resume data from the frontend.
* Keep each CV linked to its own profile, market results, and workflow history.

### Job Matching

* Build job-search queries from the analyzed CV profile.
* Search job opportunities through JSearch.
* Enrich and clean job results before storage.
* Match jobs against the candidate profile.
* Store compatibility scores, success probability, matched skills, missing skills, and rationale.
* Display accurate saved match data in the frontend.

### Market Intelligence

* Compare the candidate profile against market demand.
* Show dominant technical skills and tools.
* Identify missing skills.
* Display matched skills and job-market signals.
* Generate a learning-roadmap style view from profile gaps.
* Preserve the latest market comparison per CV.

### Company Email Discovery

* Use matched job company data to resolve domains.
* Search company/recruiter emails with Hunter.
* Store discovered contacts on the matched job.
* Display recruiter/company emails in the market page.
* Track email discovery as part of the recruitment workflow.

### Workflow Automation

* Uses n8n for long-running workflow orchestration.
* Backend creates `AgentRun` records to track workflow status.
* n8n calls back to the backend with signed events.
* Frontend polls backend state instead of calling n8n directly.
* Supports both n8n test webhooks and active production webhooks.

***

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
  -> Frontend reads saved backend state
```

The main workflow:

```txt
1. User uploads a CV
2. Backend stores the resume and creates an AgentRun
3. Backend triggers n8n
4. n8n analyzes the CV, searches jobs, matches offers, and discovers emails
5. n8n calls back to the backend
6. Backend stores profile, market analysis, matches, contacts, and notifications
7. Frontend polls backend until completion
8. User reviews matched jobs and discovered emails
```

## Tech Stack

### Frontend

* React
* Vite
* React Router
* Tailwind CSS
* Axios
* Framer Motion
* Lucide React

### Backend

* Node.js
* Express
* MongoDB / Mongoose
* JWT authentication
* Multer file uploads
* PDF and DOCX parsing
* Gemini API
* JSearch API
* Hunter API
* n8n webhooks

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

***

## Getting Started

### Prerequisites

* Node.js 18+
* npm
* MongoDB database
* Gemini API key
* RapidAPI JSearch key
* Hunter API key
* n8n account or self-hosted n8n instance

### Installation

```bash
git clone <your-repo-url>
cd miathon3V2

cd backend
npm install

cd ../frontend
npm install
```
### Run Locally

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Open:

```txt
http://localhost:5173
```

***

## n8n Setup

The main workflow should start with:

```txt
POST /webhook/recruitment/resume-upload
```

For manual testing:

```txt
/webhook-test/recruitment/resume-upload
```

For automatic execution:

```txt
/webhook/recruitment/resume-upload
```

> [!TIP]
> `/webhook-test/...` only works while n8n is listening for a test event. Use `/webhook/...` with an active workflow for normal app usage.

n8n should call back to:

```txt
POST /api/v1/n8n/events
```

with:

```txt
x-n8n-secret: your_shared_secret
```

Final callback example:

```json
{
  "type": "EMAIL_DISCOVERY_RESULT",
  "agentRunId": "...",
  "status": "COMPLETED",
  "progress": 100,
  "currentStep": "Workflow completed"
}
```

***

## Security

> [!WARNING]
> Do not commit real `.env` files, API keys, MongoDB URLs, uploaded CVs, or OAuth secrets.

Recommended safety checklist before making the repository public:

* Keep only `.env.example` files in Git.
* Rotate any key that was exposed during development.
* Use a strong `JWT_SECRET`.
* Use a strong `N8N_SHARED_SECRET`.
* Keep uploaded CVs ignored from Git.
* Review n8n workflows before using them in production.
* Avoid sending automated emails without explicit user review and approval.

## Documentation

Additional project notes:

* `backend/docs/n8n-recruitment-workflows.md`
* `backend/docs/n8n-apply-workflows-setup.md`
* `frontend/WORKFLOW_INTEGRATION_GUIDE.md`

## Status

Implemented:

* CV upload
* AI CV extraction workflow
* Job search and matching
* Market comparison
* Skill gap and roadmap display
* Company/recruiter email discovery
* Frontend workflow progress tracking

Planned or optional:

* Gmail OAuth connection
* User-reviewed application draft generation
* Approved email sending through the user's Gmail account
* Reply monitoring and status classification

<h2 align="center">
  <b>From CV upload to job-search intelligence, in one workflow.</b>
</h2>
