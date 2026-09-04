import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local first (developer secrets), then .env as a fallback.
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
