import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "send booking reminders",
  { minutes: 15 },
  internal.reminders.sendDueReminders
);

crons.interval(
  "retry failed webhook deliveries",
  { minutes: 1 },
  internal.webhooks.retryDueDeliveries
);

export default crons;
