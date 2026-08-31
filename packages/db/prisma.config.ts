import path from "node:path";

import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({
  path: "../../apps/web/.env",
});

const directUrl = process.env.DIRECT_URL;
const isSchemaDiff = process.argv.includes("diff");
const requiresDirectUrl =
  process.argv.some((argument) => ["push", "studio"].includes(argument)) ||
  (process.argv.includes("migrate") && !isSchemaDiff);
if (requiresDirectUrl && !directUrl) {
  throw new Error("DIRECT_URL is required for Prisma migrations and database administration.");
}

export default defineConfig({
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    // Generate and validate do not connect, so they must remain usable without owner credentials.
    url: directUrl ?? "postgresql://prisma:prisma@localhost:5432/ledgerhouse",
  },
});
