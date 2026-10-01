import { format, parseISO, subDays } from "date-fns";
import { SalahRecordsArrayType, SalahStatusType } from "../types/types";

export const GOOD: SalahStatusType[] = [
  "group",
  "male-alone",
  "female-alone",
  "group",
  "group",
];
export const EXCUSED: SalahStatusType[] = [
  "excused",
  "excused",
  "excused",
  "excused",
  "excused",
];
export const EMPTY: SalahStatusType[] = ["", "", "", "", ""];

// Builds days newest first, as App.tsx does. statusesByDay[0] is the latest day.
export const buildDays = (
  statusesByDay: SalahStatusType[][],
  latestDate = "2026-10-10",
): SalahRecordsArrayType =>
  statusesByDay.map((s, index) => ({
    date: format(subDays(parseISO(latestDate), index), "yyyy-MM-dd"),
    salahs: { Fajr: s[0], Dhuhr: s[1], Asar: s[2], Maghrib: s[3], Isha: s[4] },
  }));
