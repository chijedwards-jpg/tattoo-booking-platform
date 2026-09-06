import type { SubmissionStatus } from "@prisma/client";

/** Submission statuses a client is allowed to book an appointment against. */
export const BOOKABLE_STATUSES: SubmissionStatus[] = ["GREEN_AUTO_BOOKABLE", "APPROVED"];
