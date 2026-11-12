const API_BASE = import.meta.env.VITE_API_URL || "/api";

export async function apiRequest(path, options = {}) {
  const headers = { ...options.headers };
  const token = localStorage.getItem("noticeBoardToken");
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Request failed (${response.status})`);
  }
  return payload;
}

export const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA");
};

// ==========================================
// AUTHENTICATION API
// ==========================================
export const getSetupStatus = () => apiRequest("/auth/setup-status");
export const setupAdmin = (data) =>
  apiRequest("/auth/setup", { method: "POST", body: JSON.stringify(data) });
export const login = (email, password) =>
  apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
export const register = (data) =>
  apiRequest("/auth/register", { method: "POST", body: JSON.stringify(data) });
export const getCurrentUser = () => apiRequest("/auth/me");

// ==========================================
// ANNOUNCEMENTS API
// ==========================================
export const getAnnouncements = (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append("search", params.search);
  if (params.category && params.category !== "All") query.append("category", params.category);
  if (params.status) query.append("status", params.status);
  const qStr = query.toString();
  return apiRequest(`/announcements${qStr ? `?${qStr}` : ""}`);
};
export const getAnnouncementById = (id) => apiRequest(`/announcements/${id}`);
export const createAnnouncement = (data) =>
  apiRequest("/announcements", { method: "POST", body: JSON.stringify(data) });
export const updateAnnouncement = (id, data) =>
  apiRequest(`/announcements/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteAnnouncement = (id) =>
  apiRequest(`/announcements/${id}`, { method: "DELETE" });

// ==========================================
// CATEGORIES API
// ==========================================
export const getCategories = () => apiRequest("/categories");
export const getCategoryById = (id) => apiRequest(`/categories/${id}`);
export const createCategory = (data) =>
  apiRequest("/categories", { method: "POST", body: JSON.stringify(data) });
export const updateCategory = (id, data) =>
  apiRequest(`/categories/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteCategory = (id) =>
  apiRequest(`/categories/${id}`, { method: "DELETE" });

// ==========================================
// SCHEDULED NOTICES API
// ==========================================
export const getScheduledNotices = (all = false) =>
  apiRequest(`/scheduled${all ? "?all=true" : ""}`);
export const getScheduledNoticeById = (id) => apiRequest(`/scheduled/${id}`);
export const createScheduledNotice = (data) =>
  apiRequest("/scheduled", { method: "POST", body: JSON.stringify(data) });
export const updateScheduledNotice = (id, data) =>
  apiRequest(`/scheduled/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteScheduledNotice = (id, hard = false) =>
  apiRequest(`/scheduled/${id}${hard ? "?hard=true" : ""}`, { method: "DELETE" });

// ==========================================
// USERS MANAGEMENT API
// ==========================================
export const getUsers = () => apiRequest("/users");
export const getUserById = (id) => apiRequest(`/users/${id}`);
export const createUser = (data) =>
  apiRequest("/users", { method: "POST", body: JSON.stringify(data) });
export const updateUser = (id, data) =>
  apiRequest(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteUser = (id) =>
  apiRequest(`/users/${id}`, { method: "DELETE" });

// ==========================================
// DASHBOARD STATS & REPORTS API
// ==========================================
export const getDashboardStats = () => apiRequest("/dashboard/stats");
export const getPublicationReport = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/reports/publications${query ? `?${query}` : ""}`);
};
export const getCategoryReport = () => apiRequest("/reports/categories");
export const getExpiredReport = () => apiRequest("/reports/expired");

// ==========================================
// SETTINGS API
// ==========================================
export const getSettings = () => apiRequest("/settings");
export const updateSettings = (data) =>
  apiRequest("/settings", { method: "PUT", body: JSON.stringify(data) });
