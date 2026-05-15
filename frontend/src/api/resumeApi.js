import api from "./client";

export const getResumes = async () => {
    const response = await api.get("/resumes");
    return response.data;
};

export const getResume = async (id) => {
    const response = await api.get(`/resumes/${id}`);
    return response.data;
};

export const updateResume = async (id, payload) => {
    const response = await api.patch(`/resumes/${id}`, payload);
    return response.data;
};

export const deleteResume = async (id) => {
    const response = await api.delete(`/resumes/${id}`);
    return response.data;
};

export const generateInterviewQuestions = async (id) => {
    const response = await api.post(`/resumes/${id}/interview-questions`);
    return response.data;
};

export const compareResumeWithJobs = async (id, params = {}) => {
    const response = await api.get(`/resumes/${id}/jobs`, { params });
    return response.data;
};

export const getLatestResumeJobComparison = async (id) => {
    const response = await api.get(`/resumes/${id}/jobs/latest`);
    return response.data;
};
