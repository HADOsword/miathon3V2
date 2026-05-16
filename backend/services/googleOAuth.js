const crypto = require("crypto");
const IntegrationAccount = require("../models/IntegrationAccount");

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

const getClientId = () => process.env.GOOGLE_CLIENT_ID || "";
const getClientSecret = () => process.env.GOOGLE_CLIENT_SECRET || "";
const getRedirectUri = () => process.env.GOOGLE_REDIRECT_URI || "";
const getFrontendUrl = () => (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

const getEncryptionKey = () => {
  const secret = process.env.TOKEN_ENCRYPTION_SECRET || process.env.JWT_SECRET || "";
  return crypto.createHash("sha256").update(secret).digest();
};

const encryptJson = (value) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
};

const decryptJson = (value = "") => {
  const [ivValue, tagValue, encryptedValue] = String(value).split(".");

  if (!ivValue || !tagValue || !encryptedValue) {
    return {};
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivValue, "base64")
  );

  decipher.setAuthTag(Buffer.from(tagValue, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8"));
};

const signStatePayload = (payload) => {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "")
    .update(encoded)
    .digest("base64url");

  return `${encoded}.${signature}`;
};

const verifyStatePayload = (state = "") => {
  const [encoded, signature] = String(state).split(".");

  if (!encoded || !signature) {
    return null;
  }

  const expected = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "")
    .update(encoded)
    .digest("base64url");

  const left = Buffer.from(signature);
  const right = Buffer.from(expected);

  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  const maxAgeMs = 10 * 60 * 1000;

  if (!payload.createdAt || Date.now() - Number(payload.createdAt) > maxAgeMs) {
    return null;
  }

  return payload;
};

const buildGoogleAuthUrl = ({ userId }) => {
  if (!getClientId() || !getRedirectUri()) {
    const error = new Error("Google OAuth is not configured.");
    error.statusCode = 500;
    throw error;
  }

  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES.join(" "),
    state: signStatePayload({ userId, createdAt: Date.now() }),
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
};

const exchangeCodeForTokens = async (code) => {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error_description || data.error || "Google token exchange failed.");
    error.statusCode = 502;
    throw error;
  }

  return data;
};

const fetchGoogleUserInfo = async (accessToken) => {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error?.message || "Failed to fetch Google user info.");
    error.statusCode = 502;
    throw error;
  }

  return data;
};

const saveGmailIntegration = async ({ userId, tokens, profile }) => {
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + Number(tokens.expires_in) * 1000)
    : null;

  const existing = await IntegrationAccount.findOne({ user: userId, provider: "gmail" });
  const currentTokens = existing?.metadata?.tokenVault
    ? decryptJson(existing.metadata.tokenVault)
    : {};

  const tokenVault = encryptJson({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || currentTokens.refreshToken || "",
    tokenType: tokens.token_type || "Bearer",
  });

  return IntegrationAccount.findOneAndUpdate(
    { user: userId, provider: "gmail" },
    {
      user: userId,
      provider: "gmail",
      status: "CONNECTED",
      externalAccountId: profile.id || "",
      email: profile.email || "",
      scopes: GMAIL_SCOPES,
      tokenRef: "metadata.tokenVault",
      expiresAt,
      lastSyncedAt: new Date(),
      metadata: {
        tokenVault,
        profile: {
          id: profile.id || "",
          name: profile.name || "",
          picture: profile.picture || "",
        },
      },
    },
    { upsert: true, new: true, runValidators: true }
  );
};

const refreshGmailAccessToken = async (integration) => {
  const tokens = decryptJson(integration.metadata?.tokenVault);

  if (!tokens.refreshToken) {
    integration.status = "EXPIRED";
    await integration.save();
    throw new Error("Gmail refresh token is missing. Reconnect Gmail.");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      refresh_token: tokens.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    integration.status = "EXPIRED";
    integration.metadata = {
      ...integration.metadata,
      lastError: data.error_description || data.error || "Google token refresh failed.",
    };
    await integration.save();
    throw new Error("Gmail token expired. Reconnect Gmail.");
  }

  const expiresAt = data.expires_in
    ? new Date(Date.now() + Number(data.expires_in) * 1000)
    : null;

  integration.status = "CONNECTED";
  integration.expiresAt = expiresAt;
  integration.lastSyncedAt = new Date();
  integration.metadata = {
    ...integration.metadata,
    tokenVault: encryptJson({
      ...tokens,
      accessToken: data.access_token,
      tokenType: data.token_type || tokens.tokenType || "Bearer",
    }),
  };

  await integration.save();
  return data.access_token;
};

const getConnectedGmail = async (userId) => IntegrationAccount.findOne({
  user: userId,
  provider: "gmail",
  status: "CONNECTED",
});

const getValidGmailAccessToken = async (userId) => {
  const integration = await getConnectedGmail(userId);

  if (!integration) {
    return null;
  }

  const tokens = decryptJson(integration.metadata?.tokenVault);
  const expiresAt = integration.expiresAt ? integration.expiresAt.getTime() : 0;
  const refreshSkewMs = 60 * 1000;

  if (tokens.accessToken && expiresAt > Date.now() + refreshSkewMs) {
    return {
      accessToken: tokens.accessToken,
      senderEmail: integration.email,
      expiresAt: integration.expiresAt,
    };
  }

  const accessToken = await refreshGmailAccessToken(integration);

  return {
    accessToken,
    senderEmail: integration.email,
    expiresAt: integration.expiresAt,
  };
};

module.exports = {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
  getConnectedGmail,
  getFrontendUrl,
  getValidGmailAccessToken,
  saveGmailIntegration,
  verifyStatePayload,
};
