import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Track subscription error listeners
let subscriptionErrorHandler = null;

export function onSubscriptionError(handler) {
  subscriptionErrorHandler = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error?.response?.data?.detail;
    if (error?.response?.status === 403 && detail?.error === "subscription_limit") {
      if (subscriptionErrorHandler) {
        subscriptionErrorHandler(detail);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE, BACKEND_URL };
