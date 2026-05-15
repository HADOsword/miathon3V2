const cvAnalysisSchema = require("../cvAnalysisSchema");
const buildCVAnalysisPrompt = require("../cvAnalysisPrompt");
const parseJSONResponse = require("../parseJSONResponse");

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const getOpenAIOutputText = (data) => {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  return data.output
    ?.flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("")
    .trim();
};

const analyzeText = async (cvText) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || process.env.AI_MODEL || "gpt-5.5";

  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is missing in backend .env.");
    error.statusCode = 500;
    error.expose = true;
    throw error;
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions:
        "You extract structured CV data and return only valid JSON matching the requested schema.",
      input: buildCVAnalysisPrompt(cvText),
      text: {
        format: {
          type: "json_schema",
          name: "cv_analysis",
          schema: cvAnalysisSchema,
          strict: false,
        },
      },
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data.error?.message || `OpenAI request failed with ${response.status}.`;
    const error = new Error(message);
    error.statusCode = response.status >= 500 ? 502 : 400;
    throw error;
  }

  return {
    provider: "openai",
    model,
    result: parseJSONResponse(getOpenAIOutputText(data)),
  };
};

const analyzeFile = async ({ textContent }) => analyzeText(textContent);

module.exports = {
  analyzeText,
  analyzeFile,
};
