import api from "./client";

export const uploadCV = async (file) => {
    const formData = new FormData();
    formData.append("resume", file);

    const response = await api.post("/cv/upload", formData);
    return response.data;
};
