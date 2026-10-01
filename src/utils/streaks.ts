import { differenceInDays, parseISO, subDays } from "date-fns";
import {
  SalahRecordsArrayType,
  SalahStatusType,
  streakDatesObjType,
} from "../types/types";

export type StreakResult = {
  activeStreakCount: number;
  streaks: streakDatesObjType[];
};

const streakBreakingStatuses: SalahStatusType[] = ["missed", "late", ""];

const isStreakBreakingStatus = (statuses: SalahStatusType[]) =>
  statuses.some((status) => streakBreakingStatuses.includes(status));

const isConsecutiveDay = (date2: Date, date1: Date) =>
  differenceInDays(date1, date2) === 1;

// days is newest first, as App.tsx builds it. The rules are the same as the
// earlier code in App.tsx, including its edge cases.
export const computeStreaks = (
  days: SalahRecordsArrayType,
  today: Date,
): StreakResult => {
  const oldestFirst = [...days].reverse();
  const streaks: streakDatesObjType[] = [];
  const streakDatesArr: Date[] = [];
  let excusedDays = 0;
  let isActiveStreak = false;
  let activeStreakCount = 0;

  const endStreak = () => {
    if (streakDatesArr.length > 0) {
      const streakDays =
        streakDatesArr.length === 1
          ? 1
          : differenceInDays(
              streakDatesArr[streakDatesArr.length - 1],
              subDays(streakDatesArr[0], 1),
            );
      activeStreakCount = isActiveStreak ? streakDays - excusedDays : 0;
      streaks.push({
        startDate: streakDatesArr[0],
        endDate: streakDatesArr[streakDatesArr.length - 1],
        days: streakDays - excusedDays,
        isActive: isActiveStreak,
        excusedDays,
      });
      streakDatesArr.length = 0;
    }
    excusedDays = 0;
  };

  if (oldestFirst.length === 1) {
    const statuses = Object.values(oldestFirst[0].salahs);
    if (!isStreakBreakingStatus(statuses)) {
      if (statuses.includes("excused")) excusedDays += 1;
      streakDatesArr.push(today);
      isActiveStreak = true;
      endStreak();
    }
    return { activeStreakCount, streaks };
  }

  for (let i = 1; i < oldestFirst.length; i++) {
    const statuses = Object.values(oldestFirst[i].salahs);
    const previousDate = parseISO(oldestFirst[i - 1].date);
    const currentDate = parseISO(oldestFirst[i].date);
    const previousDayIsYesterday = isConsecutiveDay(previousDate, today);

    if (
      previousDayIsYesterday &&
      !statuses.includes("late") &&
      !statuses.includes("missed")
    ) {
      isActiveStreak = true;
    }

    if (
      isConsecutiveDay(previousDate, currentDate) &&
      !isStreakBreakingStatus(statuses)
    ) {
      if (statuses.includes("excused")) excusedDays += 1;

      if (
        i === 1 &&
        !isStreakBreakingStatus(Object.values(oldestFirst[0].salahs))
      ) {
        streakDatesArr.push(previousDate, currentDate);
      } else {
        streakDatesArr.push(currentDate);
      }

      if (previousDayIsYesterday) endStreak();
    } else {
      endStreak();
    }
  }

  streaks.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  return { activeStreakCount, streaks };
};
