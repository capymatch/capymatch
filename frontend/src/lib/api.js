import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
const API_BASE = `${BACKEND_URL}/api`;

let _authFailCb = null;
let _subErrorCb = null;

export function onAuthFail(cb) { _authFailCb = cb; }
export function onSubscriptionError(cb) { _subErrorCb = cb; }

const api = axios.create({
  baseURL: API_BASE,
});

// Add Bearer token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("session_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 and subscription errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem("session_token");
      if (_authFailCb) _authFailCb();
    }
    if (status === 403 && error.response?.data?.subscription_required && _subErrorCb) {
      _subErrorCb(error.response.data);
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE, BACKEND_URL };
