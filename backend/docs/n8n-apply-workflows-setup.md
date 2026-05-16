# n8n Apply Automation Setup

Use these workflows with:

```txt
BACKEND_URL=https://acronym-clerk-unclog.ngrok-free.dev
N8N_SHARED_SECRET=<same value as backend .env>
```

The backend must be running locally and exposed through ngrok before you test.

## Workflow 1: Application Generation

This workflow creates the draft only. It does not send email.

### Node 1: Webhook

- Name: `Apply Draft Webhook`
- Method: `POST`
- Path: `recruitment/application-generation`
- Response mode: `Respond immediately`

Expected incoming payload from backend:

```json
{
  "workflow": "APPLICATION_GENERATION",
  "userId": "...",
  "resumeId": "...",
  "jobMatchId": "...",
  "jobId": "...",
  "agentRunId": "...",
  "correlationId": "..."
}
```

### Node 2: Code

- Name: `Normalize Apply Payload`
- Language: JavaScript
- Mode: `Run Once for All Items`

Why this node is needed: n8n Webhook nodes usually output incoming JSON under `body`, so values like `userId` are at `$json.body.userId`, not `$json.userId`.

```js
const input = $json.body && Object.keys($json.body).length > 0
  ? $json.body
  : $json;

return [
  {
    json: {
      workflow: input.workflow || 'APPLICATION_GENERATION',
      userId: input.userId,
      resumeId: input.resumeId,
      jobMatchId: input.jobMatchId,
      jobId: input.jobId,
      agentRunId: input.agentRunId,
      correlationId: input.correlationId,
    },
  },
];
```

### Node 3: HTTP Request

- Name: `Load Application Context`
- Method: `GET`
- URL:

```txt
{{$env.BACKEND_URL}}/api/v1/n8n/application-context
```

- Send Headers: enabled
- Headers:

```txt
x-n8n-secret: {{$env.N8N_SHARED_SECRET}}
```

- Send Query Parameters: enabled
- Query params:

```txt
userId: {{$json.userId}}
resumeId: {{$json.resumeId}}
jobMatchId: {{$json.jobMatchId}}
```

The response contains:

- `resume.extractedText`
- `job.title`
- `job.companyName`
- `job.description`
- `match.compatibilityScore`
- `match.aiRationale`
- `recruiter.email`
- `sender.email`

### Node 4: IF

- Name: `Has Recruiter Email`
- Condition:

```txt
{{$json.recruiter.email}}
```

- Operation: `is not empty`

If false, call backend with a failed status or stop the workflow.

### Node 5: Gemini

- Name: `Generate Application Draft`
- Model: your current Gemini model
- Input prompt:

```txt
You are generating a factual job application email.

Rules:
- Use only facts found in the candidate CV/profile and job description.
- Do not invent experience, education, skills, certifications, location, salary, or availability.
- Keep the email concise, professional, and human.
- The email will be sent from the candidate's connected Gmail account.
- Return only valid JSON. No markdown.

Candidate CV:
{{$json.resume.extractedText}}

Candidate profile:
{{JSON.stringify($json.profile || {})}}

Job:
Title: {{$json.job.title}}
Company: {{$json.job.companyName}}
Location: {{JSON.stringify($json.job.location || {})}}
Description:
{{$json.job.description}}

Match:
Score: {{$json.match.compatibilityScore}}
Rationale: {{$json.match.aiRationale}}
Matching technologies: {{JSON.stringify($json.match.matchingTechnologies || [])}}
Missing skills: {{JSON.stringify($json.match.missingSkills || [])}}

Recruiter:
Email: {{$json.recruiter.email}}
Name: {{$json.recruiter.fullName || ($json.recruiter.firstName + " " + $json.recruiter.lastName)}}

Return this exact JSON shape:
{
  "subject": "Application for <job title>",
  "body": "email body",
  "coverLetter": "short cover letter or empty string",
  "factualityWarnings": []
}
```

### Node 6: Code

- Name: `Build Draft Callback`
- Language: JavaScript

```js
const context = $('Load Application Context').first().json;
const webhook = $('Normalize Apply Payload').first().json;

let draft = $json;

if (typeof draft === 'string') {
  draft = JSON.parse(draft);
}

if (draft.text) {
  draft = JSON.parse(draft.text.replace(/```json|```/g, '').trim());
}

const recruiterName = [
  context.recruiter?.firstName,
  context.recruiter?.lastName,
].filter(Boolean).join(' ') || context.recruiter?.fullName || '';

return [
  {
    json: {
      type: 'APPLICATION_DRAFT_RESULT',
      agentRunId: webhook.agentRunId,
      correlationId: webhook.correlationId,
      userId: webhook.userId,
      status: 'COMPLETED',
      progress: 100,
      currentStep: 'Application draft generated',
      applications: [
        {
          resumeId: context.resume.id,
          jobId: context.job._id,
          jobMatchId: context.match._id,
          recruiter: {
            email: context.recruiter.email,
            name: recruiterName,
            source: context.recruiter.source || 'hunter',
            metadata: context.recruiter,
          },
          subject: draft.subject || `Application for ${context.job.title}`,
          body: draft.body || '',
          coverLetter: draft.coverLetter || '',
          factualityWarnings: Array.isArray(draft.factualityWarnings)
            ? draft.factualityWarnings
            : [],
        },
      ],
    },
  },
];
```

### Node 7: HTTP Request

- Name: `Store Draft In Backend`
- Method: `POST`
- URL:

```txt
{{$env.BACKEND_URL}}/api/v1/n8n/events
```

- Send Headers: enabled
- Headers:

```txt
Content-Type: application/json
x-n8n-secret: {{$env.N8N_SHARED_SECRET}}
```

- Body Content Type: JSON
- Body: use the full JSON from `Build Draft Callback`.

## Workflow 2: Gmail Email Sending

This workflow sends only after the user approves or edits an application draft.

### Node 1: Webhook

- Name: `Email Sending Webhook`
- Method: `POST`
- Path: `recruitment/email-sending`
- Response mode: `Respond immediately`

Expected incoming payload:

```json
{
  "workflow": "EMAIL_SENDING",
  "userId": "...",
  "applicationId": "...",
  "agentRunId": "...",
  "correlationId": "..."
}
```

### Node 2: Code

- Name: `Normalize Sending Payload`
- Language: JavaScript
- Mode: `Run Once for All Items`

```js
const input = $json.body && Object.keys($json.body).length > 0
  ? $json.body
  : $json;

return [
  {
    json: {
      workflow: input.workflow || 'EMAIL_SENDING',
      userId: input.userId,
      applicationId: input.applicationId,
      agentRunId: input.agentRunId,
      correlationId: input.correlationId,
    },
  },
];
```

### Node 3: HTTP Request

- Name: `Load Send Payload`
- Method: `GET`
- URL:

```txt
{{$env.BACKEND_URL}}/api/v1/n8n/applications/{{$json.applicationId}}/send-payload
```

- Send Headers: enabled
- Headers:

```txt
x-n8n-secret: {{$env.N8N_SHARED_SECRET}}
```

The response contains:

- `gmail.accessToken`
- `from`
- `to`
- `subject`
- `body`
- `resume.downloadUrl`
- `resume.originalFileName`
- `resume.mimeType`

### Node 4: HTTP Request

- Name: `Download CV Attachment`
- Method: `GET`
- URL:

```txt
{{$json.resume.downloadUrl}}
```

- Send Headers: enabled
- Headers:

```txt
x-n8n-secret: {{$env.N8N_SHARED_SECRET}}
```

- Response Format: `File`
- Output property: `cv`

### Node 5: Code

- Name: `Build Gmail MIME`
- Language: JavaScript

```js
const payload = $('Load Send Payload').first().json;
const binary = $binary.cv;

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function foldHeader(value) {
  return String(value || '').replace(/\r?\n/g, ' ').trim();
}

const attachmentBuffer = await this.helpers.getBinaryDataBuffer(0, 'cv');
const attachmentBase64 = attachmentBuffer.toString('base64');
const boundary = `apply_${Date.now()}`;
const fileName = payload.resume.originalFileName || 'resume.pdf';
const mimeType = payload.resume.mimeType || 'application/pdf';

const textBody = [
  payload.body || '',
  payload.coverLetter ? `\n\nCover letter:\n${payload.coverLetter}` : '',
].join('');

const mime = [
  `From: ${foldHeader(payload.from)}`,
  `To: ${foldHeader(payload.to)}`,
  `Subject: ${foldHeader(payload.subject)}`,
  'MIME-Version: 1.0',
  `Content-Type: multipart/mixed; boundary="${boundary}"`,
  '',
  `--${boundary}`,
  'Content-Type: text/plain; charset="UTF-8"',
  'Content-Transfer-Encoding: 7bit',
  '',
  textBody,
  '',
  `--${boundary}`,
  `Content-Type: ${mimeType}; name="${fileName}"`,
  'Content-Transfer-Encoding: base64',
  `Content-Disposition: attachment; filename="${fileName}"`,
  '',
  attachmentBase64.match(/.{1,76}/g).join('\r\n'),
  '',
  `--${boundary}--`,
].join('\r\n');

return [
  {
    json: {
      raw: base64Url(mime),
      accessToken: payload.gmail.accessToken,
      applicationId: payload.applicationId,
    },
  },
];
```

### Node 6: HTTP Request

- Name: `Send Gmail Message`
- Method: `POST`
- URL:

```txt
https://gmail.googleapis.com/gmail/v1/users/me/messages/send
```

- Send Headers: enabled
- Headers:

```txt
Authorization: Bearer {{$json.accessToken}}
Content-Type: application/json
```

- Body Content Type: JSON
- Body:

```json
{
  "raw": "={{$json.raw}}"
}
```

The Gmail API response usually contains:

```json
{
  "id": "message-id",
  "threadId": "thread-id",
  "labelIds": ["SENT"]
}
```

### Node 7: Code

- Name: `Build Sent Callback`
- Language: JavaScript

```js
const webhook = $('Normalize Sending Payload').first().json;
const sendInput = $('Build Gmail MIME').first().json;

return [
  {
    json: {
      type: 'APPLICATION_STATUS_RESULT',
      agentRunId: webhook.agentRunId,
      correlationId: webhook.correlationId,
      applicationId: sendInput.applicationId,
      status: 'SENT',
      threadId: $json.threadId || '',
      messageId: $json.id || '',
      sentAt: new Date().toISOString(),
      statusReason: 'Application email was sent through the user connected Gmail account.',
      notificationType: 'APPLICATION_SENT',
      notificationTitle: 'Application sent',
      notificationSeverity: 'SUCCESS',
    },
  },
];
```

### Node 8: HTTP Request

- Name: `Store Sent Status`
- Method: `POST`
- URL:

```txt
{{$env.BACKEND_URL}}/api/v1/n8n/events
```

- Send Headers: enabled
- Headers:

```txt
Content-Type: application/json
x-n8n-secret: {{$env.N8N_SHARED_SECRET}}
```

- Body Content Type: JSON
- Body: use the full JSON from `Build Sent Callback`.

## n8n Cloud Attachment Note

The email workflow downloads the CV through:

```txt
GET /api/v1/n8n/resumes/:id/download
```

This is why it works with n8n Cloud. The workflow does not need direct access to your local backend filesystem.
