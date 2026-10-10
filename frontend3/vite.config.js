import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The React app (port 5173) talks to the Flask backend (port 5000) through this proxy,
// so the browser sees one address and no CORS problems.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:5000",
      "/uploads": "http://127.0.0.1:5000",
    },
  },
});
