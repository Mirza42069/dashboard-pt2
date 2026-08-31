import path from "node:path";

import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({
  path: "../../.env.local",
});

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const isSchemaDiff = process.argv.includes("diff");
const requiresDatabaseUrl =
  process.argv.some((argument) => ["push", "studio"].includes(argument)) ||
  (process.argv.includes("migrate") && !isSchemaDiff);
if (requiresDatabaseUrl && !databaseUrl) {
  throw new Error("DIRECT_URL or DATABASE_URL is required for Prisma migrations and administration.");
}

export default defineConfig({
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    // Generate and validate do not connect, so they must remain usable without owner credentials.
    url: databaseUrl ?? "postgresql://prisma:prisma@localhost:5432/ledgerhouse",
  },
});
