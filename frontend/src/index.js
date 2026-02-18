import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress benign ResizeObserver error BEFORE React mounts
// Must use capturing phase to intercept before React's error overlay
const SUPPRESSED_MSGS = ["ResizeObserver loop", "ResizeObserver loop completed"];
const isSuppressed = (msg) => typeof msg === "string" && SUPPRESSED_MSGS.some(s => msg.includes(s));

// Intercept at window level - capturing phase
window.addEventListener("error", (e) => {
  if (isSuppressed(e.message)) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
}, true);

// Patch the global error handler used by CRA's overlay
const origOnerror = window.onerror;
window.onerror = function(message, source, lineno, colno, error) {
  if (isSuppressed(message)) return true;
  if (origOnerror) return origOnerror.call(this, message, source, lineno, colno, error);
};

window.addEventListener("unhandledrejection", (e) => {
  if (isSuppressed(e.reason?.message)) e.preventDefault();
}, true);

const origError = console.error;
console.error = (...args) => {
  if (isSuppressed(args[0])) return;
  origError.apply(console, args);
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
