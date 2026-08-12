import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "send booking reminders",
  { minutes: 15 },
  internal.reminders.sendDueReminders
);

export default crons;
