import api from "./client";

export const registerUser = async (userData) => {
  const response = await api.post("/register", userData);
  return response.data;
};

export const loginUser = async (userData) => {
  const response = await api.post("/login", userData);
  return response.data;
};

export const getDashboard = async () => {
  const response = await api.get("/dashboard");
  return response.data;
};

export const getAllUsers = async () => {
  const response = await api.get("/users");
  return response.data;
};

export const getProfile = async () => {
  const response = await api.get("/profile");
  return response.data;
};

export const updateProfile = async (profileData) => {
  const response = await api.patch("/profile", profileData);
  return response.data;
};

export const updateProfileAvatar = async (file) => {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await api.patch("/profile/avatar", formData);
  return response.data;
};

export const deleteProfileAvatar = async () => {
  const response = await api.delete("/profile/avatar");
  return response.data;
};

export const deleteProfile = async () => {
  const response = await api.delete("/profile");
  return response.data;
};
