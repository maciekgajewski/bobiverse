import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { troikaCspPlugin } from "./vite.troika-csp-plugin";

export default defineConfig({
  plugins: [react(), troikaCspPlugin()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: ["bobiverse.local"],
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
    allowedHosts: ["bobiverse.local"],
  },
});
