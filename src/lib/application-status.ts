import type { Enums } from "@job-automation/core/database.types";

type Status = Enums<"application_status">;

export const STATUS_LABELS: Record<Status, string> = {
  draft: "Draft",
  queued: "Queued",
  in_progress: "Applying",
  submitted: "Submitted",
  failed: "Failed",
  needs_review: "Needs you",
  withdrawn: "Withdrawn",
};

/** Tailwind classes for a status pill. */
export const STATUS_CLASSES: Record<Status, string> = {
  draft: "bg-black/[0.06] text-muted",
  queued: "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700",
  submitted: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
  needs_review: "bg-orange-50 text-orange-700",
  withdrawn: "bg-black/[0.06] text-muted",
};

export const ALL_STATUSES: Status[] = [
  "draft",
  "queued",
  "in_progress",
  "submitted",
  "needs_review",
  "failed",
  "withdrawn",
];
