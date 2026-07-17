import type { TablesInsert } from "../supabase/database.types";

/** Normalized job row, minus company_id (assigned at ingest time). */
export type NormalizedJob = Omit<TablesInsert<"jobs">, "company_id">;
