import axios from "axios";

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

// Main API instance — GraphQL + REST all on one backend
const api = axios.create({
  baseURL: BACKEND_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

// eventApi points to the same backend (REST /api/events)
export const eventApi = axios.create({
  baseURL: BACKEND_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

const addAuth = (config) => {
  const token = localStorage.getItem("socniti_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
};

api.interceptors.request.use(addAuth);
eventApi.interceptors.request.use(addAuth);

export default api;
