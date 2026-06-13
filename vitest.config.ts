import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
    env: {
      PUBLIC_API_BASE_URL: "http://localhost:5001",
    },
  },
});
