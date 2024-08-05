import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// vite.config.js
export default {
  server: {
    host: "0.0.0.0", // Listen on all network interfaces
    port: 5173, // Make sure this matches the port you're using
  },
};
