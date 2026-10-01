import { format } from "date-fns";
import type { CSSProperties } from "react";
import {
  SalahNamesType,
  SalahNamesTypeAdhanLibrary,
  SalahStatusType,
  userPreferencesType,
} from "../types/types";

export const MODAL_BREAKPOINTS = [0, 1];
export const INITIAL_MODAL_BREAKPOINT = 1;

export const MIN_START_DATE = "1980-01-01";

export const defaultReasons =
  "Alarm,Appointment,Caregiving,Education,Emergency,Family/Friends,Gaming,Guests,Health,Leisure,Shopping,Sleep,Sports,Travel,TV,Other,Work";

export const pageTransitionStyles = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2 },
};

export const prayerCalculationMethodLabels: Record<string, string> = {
  MuslimWorldLeague: "Muslim World League",
  Egyptian: "Egyptian General Authority of Survey",
  Karachi: "University of Islamic Sciences, Karachi",
  UmmAlQura: "Umm Al-Qura University, Makkah",
  Dubai: "Dubai - UAE",
  Qatar: "Qatar Ministry of Awqaf",
  Kuwait: "Kuwait",
  MoonsightingCommittee: "Moonsighting Committee",
  Singapore: "Singapore / Malaysia / Indonesia",
  Turkey: "Diyanet, Turkey",
  Tehran: "University of Tehran",
  NorthAmerica: "North America (ISNA)",
};

export const dictPreferencesDefaultValues: userPreferencesType = {
  userGender: "male",
  userStartDate: format(new Date(), "yyyy-MM-dd"),
  dailyNotification: "0",
  dailyNotificationTime: "21:00",
  reasons: defaultReasons.split(",").sort((a, b) => a.localeCompare(b)),
  showReasons: "0",
  showMissedSalahCount: "1",
  isExistingUser: "0",
  isMissedSalahToolTipShown: "0",
  appLaunchCount: "0",
  saveButtonTapCount: "0",
  haptics: "0",
  theme: "dark",
  timeFormat: "12hr",
  prayerCalculationMethod: "",
  madhab: "shafi",
  highLatitudeRule: "middleofthenight",
  fajrAngle: "18",
  ishaAngle: "17",
  fajrAdjustment: "0",
  dhuhrAdjustment: "0",
  asrAdjustment: "0",
  maghribAdjustment: "0",
  ishaAdjustment: "0",
  fajrNotification: "off",
  sunriseNotification: "off",
  dhuhrNotification: "off",
  asrNotification: "off",
  maghribNotification: "off",
  ishaNotification: "off",
  hasSeenBatteryPrompt: "0",
  shafaqRule: "general",
  polarCircleResolution: "Unresolved",
  country: "",
  dailyNotificationOption: "fixedTime",
  dailyNotificationAfterIshaDelay: "60",
  lastLaunchDate: new Date().toISOString(),
};

export const calculationMethods = [
  "Dubai",
  "Egyptian",
  "MuslimWorldLeague",
  "Karachi",
  "Kuwait",
  "MoonsightingCommittee",
  "Singapore",
  "Qatar",
  "Tehran",
  "Turkey",
  "NorthAmerica",
  "UmmAlQura",
] as const;

export const reasonsStyles =
  "p-2 m-1 text-xs bg-[var(--reasons-bg-color-status-sheet)] rounded-xl";

export const salahStatusColorsHexCodes = {
  group: "#5FAE82",
  "male-alone": "#5FAE82",
  "female-alone": "#5FAE82",
  excused: "#8C4FB5",
  late: "#E5B233",
  missed: "#E5484D",
  "": "#585858",
};

// Jamaah and On Time share a green, so the gold halo (--salah-halo-color) is what tells them apart.
// Keep in sync with the salah-halo animation duration in index.css.
export const SALAH_HALO_PERIOD_SECONDS = 4;

export const showsSalahHalo = (status: SalahStatusType) =>
  status === "group" || status === "female-alone";

// A stable per-key offset keeps neighbouring halos out of step without changing between renders.
export const getSalahHaloDelay = (key: string) => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  const periodMs = SALAH_HALO_PERIOD_SECONDS * 1000;
  return `${-(Math.abs(hash) % periodMs) / 1000}s`;
};

export const getSalahHaloProps = (
  status: SalahStatusType,
  key: string
): { className: string; style: CSSProperties } => {
  if (!showsSalahHalo(status)) return { className: "", style: {} };
  return {
    className: "salah-halo",
    // The fill moves to ::after so the ring in ::before can sit between it and the page.
    style: {
      backgroundColor: "transparent",
      "--halo-fill": salahStatusColorsHexCodes[status],
      "--halo-delay": getSalahHaloDelay(key),
    } as CSSProperties,
  };
};

// export const prayerStatusColorsHexCodes = {
//   group: "#0ec188",
//   "male-alone": "rgb(216, 204, 24)",
//   "female-alone": "#0ec188",
//   excused: "#9c1ae7",
//   late: "#f27c14",
//   missed: "#f7093b",
//   "": "#585858",
// };

export const salahNamesArr: SalahNamesType[] = [
  "Fajr",
  "Dhuhr",
  "Asar",
  "Maghrib",
  "Isha",
];

export const adhanLibrarySalahs: SalahNamesTypeAdhanLibrary[] = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

export const validSalahStatuses = [
  "group",
  "male-alone",
  "female-alone",
  "late",
  "missed",
  "excused",
];
