import { addDays, format, parseISO } from "date-fns";
import {
  SalahNamesType,
  SalahRecordType,
  SalahRecordsArrayType,
  SalahStatusType,
} from "../types/types";
import { salahNamesArr } from "./constants";
import { computeStreaks } from "./streaks";

export type WidgetSalah = { name: SalahNamesType; status: SalahStatusType };
export type WidgetEntry = { date: string; streak: number; salah: WidgetSalah[] };
export type WidgetSnapshot = {
  version: 1;
  generatedAt: string;
  entries: WidgetEntry[];
};

const ENTRY_COUNT = 3;

const emptyDay = (date: Date): SalahRecordType => ({
  date: format(date, "yyyy-MM-dd"),
  salahs: { Fajr: "", Dhuhr: "", Asar: "", Maghrib: "", Isha: "" },
});

// Entry dates come from days[0], not from now. If the app stays open past
// midnight, days[0] is yesterday, and the native widget still selects the
// correct entry.
export const buildWidgetSnapshot = (
  days: SalahRecordsArrayType,
  now: Date,
): WidgetSnapshot | null => {
  if (days.length === 0) return null;

  const latestDay = parseISO(days[0].date);
  const entries: WidgetEntry[] = [];
  let paddedDays = days;

  for (let offset = 0; offset < ENTRY_COUNT; offset++) {
    const entryDate = addDays(latestDay, offset);
    if (offset > 0) paddedDays = [emptyDay(entryDate), ...paddedDays];

    entries.push({
      date: format(entryDate, "yyyy-MM-dd"),
      streak: computeStreaks(paddedDays, entryDate).activeStreakCount,
      // SalahNamesType also allows the optional "Asr" key, so the type permits undefined.
      salah: salahNamesArr.map((name) => ({
        name,
        status: paddedDays[0].salahs[name] ?? "",
      })),
    });
  }

  return { version: 1, generatedAt: now.toISOString(), entries };
};
