import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Only used by `vitest`. Kept separate so vite.config.js (dev/build) stays untouched.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
});