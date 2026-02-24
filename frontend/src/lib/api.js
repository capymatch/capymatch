import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
// Use current origin to avoid cross-origin issues on custom domains (e.g. app.capymatch.com)
const API_BASE = `${window.location.origin}/api`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Track subscription error listeners
let subscriptionErrorHandler = null;
let authFailHandler = null;

export function onSubscriptionError(handler) {
  subscriptionErrorHandler = handler;
}

export function onAuthFail(handler) {
  authFailHandler = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail;
    if (status === 403 && detail?.error === "subscription_limit") {
      if (subscriptionErrorHandler) {
        subscriptionErrorHandler(detail);
      }
    }
    if (status === 401 && !error.config?.url?.includes("/auth/")) {
      if (authFailHandler) authFailHandler();
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE, BACKEND_URL };
