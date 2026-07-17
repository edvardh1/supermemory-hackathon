import { scrapeAshby } from "./ashby";
import { scrapeGreenhouse } from "./greenhouse";
import { scrapeLever } from "./lever";
import { scrapeWorkday } from "./workday";
import type { NormalizedJob } from "./types";
import type { Enums } from "../supabase/database.types";

export type ScrapablePlatform = Extract<
  Enums<"ats_platform">,
  "ashby" | "greenhouse" | "lever" | "workday"
>;

/** board slug → normalized jobs, per supported platform */
export const SCRAPERS: Record<ScrapablePlatform, (board: string) => Promise<NormalizedJob[]>> = {
  ashby: scrapeAshby,
  greenhouse: scrapeGreenhouse,
  lever: scrapeLever,
  workday: scrapeWorkday,
};

export function isScrapablePlatform(p: string): p is ScrapablePlatform {
  return p in SCRAPERS;
}
