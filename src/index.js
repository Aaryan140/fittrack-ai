// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<React.StrictMode><App /></React.StrictMode>);

// Only register service worker in production
if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
} else if ("serviceWorker" in navigator) {
  // Unregister any existing SW in development
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.unregister());
  });
}