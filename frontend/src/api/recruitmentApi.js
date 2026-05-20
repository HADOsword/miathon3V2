import api from "./client";

export const getRecruitmentDashboard = async () => {
  const response = await api.get("/recruitment/dashboard");
  return response.data;
};

export const startRecruitmentWorkflow = async ({ workflow, resumeId, input = {} }) => {
  const response = await api.post("/recruitment/workflows", {
    workflow,
    resumeId,
    input,
  });
  return response.data;
};

export const discoverMatchedJobEmails = async ({ resumeId, limit = 10, hunterLimit = 10 } = {}) => {
  const response = await api.post("/recruitment/email-discovery", {
    resumeId,
    limit,
    hunterLimit,
  });
  return response.data;
};
