const crypto = require("crypto");

const WORKFLOW_PATHS = {
  RESUME_UPLOAD: process.env.N8N_RESUME_UPLOAD_WEBHOOK,
  MARKET_ANALYSIS: process.env.N8N_MARKET_ANALYSIS_WEBHOOK,
  JOB_MATCHING: process.env.N8N_JOB_MATCHING_WEBHOOK,
  EMAIL_DISCOVERY: process.env.N8N_EMAIL_DISCOVERY_WEBHOOK,
  APPLICATION_GENERATION: process.env.N8N_APPLICATION_GENERATION_WEBHOOK,
  EMAIL_SENDING: process.env.N8N_EMAIL_SENDING_WEBHOOK,
  GMAIL_MONITORING: process.env.N8N_GMAIL_MONITORING_WEBHOOK,
  NOTIFICATION: process.env.N8N_NOTIFICATION_WEBHOOK,
  CHAT: process.env.N8N_CHAT_WEBHOOK,
};

const getBaseUrl = () => (process.env.N8N_BASE_URL || "").replace(/\/$/, "");

const getWorkflowUrl = (workflow) => {
  const rawUrl = WORKFLOW_PATHS[workflow] || "";

  if (!rawUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  const baseUrl = getBaseUrl();
  return baseUrl ? `${baseUrl}/${rawUrl.replace(/^\//, "")}` : "";
};

const getSharedSecret = () => process.env.N8N_SHARED_SECRET || "";

const isUnregisteredWebhookError = (response, data) => {
  const message = `${data.message || ""} ${data.msg || ""}`.toLowerCase();

  return response.status === 404 && message.includes("webhook") && message.includes("not registered");
};

const signPayload = (payload) => {
  const secret = getSharedSecret();

  if (!secret) {
    return "";
  }

  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
};

const verifySignature = (payload, signature = "", sharedSecretHeader = "") => {
  const secret = getSharedSecret();

  if (!secret) {
    return true;
  }

  if (sharedSecretHeader && sharedSecretHeader === secret) {
    return true;
  }

  const expected = signPayload(payload);
  const left = Buffer.from(String(signature));
  const right = Buffer.from(expected);

  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const triggerWorkflow = async (workflow, payload) => {
  const url = getWorkflowUrl(workflow);
  const correlationId = payload.correlationId || crypto.randomUUID();

  if (!url) {
    return {
      triggered: false,
      correlationId,
      warning: `No n8n webhook configured for ${workflow}.`,
    };
  }

  const requestPayload = {
    ...payload,
    workflow,
    correlationId,
    requestedAt: new Date().toISOString(),
  };

  let response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-n8n-signature": signPayload(requestPayload),
      },
      body: JSON.stringify(requestPayload),
    });
  } catch (error) {
    return {
      triggered: false,
      correlationId,
      warning: `n8n is not reachable at ${url}. Start n8n or update N8N_BASE_URL.`,
      error: error.message,
    };
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (isUnregisteredWebhookError(response, data)) {
      return {
        triggered: false,
        correlationId,
        warning: `n8n webhook for ${workflow} is not registered at ${url}. Activate the workflow, or click "Listen for test event" if you are using a /webhook-test URL.`,
        error: data.message || data.msg || "n8n webhook is not registered.",
      };
    }

    const error = new Error(data.message || data.msg || `n8n workflow ${workflow} failed to start.`);
    error.statusCode = response.status >= 500 ? 502 : response.status;
    error.expose = response.status < 500;
    throw error;
  }

  return {
    triggered: true,
    correlationId,
    data,
  };
};

module.exports = {
  triggerWorkflow,
  verifySignature,
};
