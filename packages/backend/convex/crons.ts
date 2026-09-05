import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 17:05 UTC is 00:05 the following day in Jakarta.
crons.daily("Buat tagihan bulanan dan tandai tunggakan", { hourUTC: 17, minuteUTC: 5 }, internal.invoices.runDailyBilling);

export default crons;
