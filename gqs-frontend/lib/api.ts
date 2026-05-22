import axios from "axios";

const api = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshPromise: Promise<{ access_token: string; refresh_token: string }> | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      !original._retry &&
      refreshToken &&
      !original.url?.includes("/auth/refresh")
    ) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = api
            .post("/auth/refresh", { refresh_token: refreshToken })
            .then((res) => res.data.data);
        }
        const tokens = await refreshPromise;
        refreshPromise = null;
        setTokens(tokens.access_token, tokens.refresh_token);
        original.headers.Authorization = `Bearer ${tokens.access_token}`;
        return api(original);
      } catch {
        refreshPromise = null;
        clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
