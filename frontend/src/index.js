import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress benign ResizeObserver error in dev overlay
const SUPPRESSED = "ResizeObserver loop";
window.addEventListener("error", (e) => {
  if (e.message?.includes(SUPPRESSED)) {
    e.stopImmediatePropagation();
    e.stopPropagation();
    e.preventDefault();
  }
});
window.addEventListener("unhandledrejection", (e) => {
  if (e.reason?.message?.includes(SUPPRESSED)) {
    e.preventDefault();
  }
});
// Also patch console.error to prevent React overlay
const origError = console.error;
console.error = (...args) => {
  if (typeof args[0] === "string" && args[0].includes(SUPPRESSED)) return;
  origError.apply(console, args);
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
