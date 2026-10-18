import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every 6 hours (an interval, so it isn't pinned to the top of the hour).
crons.interval("delete expired reset links and idle rate limits", { hours: 6 }, internal.cleanup.expiredRows, {});

export default crons;
