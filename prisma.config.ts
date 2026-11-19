import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx --conditions=react-server prisma/seed.ts",
  },
  datasource: {
    // Fallback only lets `prisma generate` run without a database (CI typecheck, Docker build).
    url: process.env.DATABASE_URL ?? "postgresql://build:build@localhost:5432/build",
  },
});
