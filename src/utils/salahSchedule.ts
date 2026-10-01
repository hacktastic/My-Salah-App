// Kept free of Capacitor imports: the background runner bundles this file too.
import {
  CalculationMethod,
  CalculationParameters,
  Coordinates,
  PrayerTimes,
} from "adhan";
import { addDays, addMinutes, format } from "date-fns";
import type {
  SalahNamesTypeAdhanLibrary,
  SalahNotificationSettings,
  userPreferencesType,
} from "../types/types";

export type PlannedNotification = {
  id: number;
  title: string;
  body: string;
  at: Date;
  sound: string;
  channelId: string;
};

export const NOTIFIABLE_SALAHS: SalahNamesTypeAdhanLibrary[] = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

const salahIdMap = {
  fajr: 1,
  sunrise: 2,
  dhuhr: 3,
  asr: 4,
  maghrib: 5,
  isha: 6,
};

const DAYS_TO_SCHEDULE = 8;

export const upperCaseFirstLetter = (text: string) => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const generateNotificationId = (
  salahName: SalahNamesTypeAdhanLibrary,
  date: Date,
) => {
  const dateFormatted = format(date, "ddMMyyyy");

  return Number(dateFormatted + salahIdMap[salahName]);
};

export const buildCalculationParams = (
  latitude: number,
  longitude: number,
  userPreferences: userPreferencesType,
): { params: CalculationParameters; coordinates: Coordinates } | undefined => {
  if (!userPreferences.prayerCalculationMethod) return;

  const coordinates = new Coordinates(latitude, longitude);
  const params = CalculationMethod[userPreferences.prayerCalculationMethod]();

  params.madhab = userPreferences.madhab;
  params.highLatitudeRule = userPreferences.highLatitudeRule;
  params.fajrAngle = Number(userPreferences.fajrAngle);
  params.ishaAngle = Number(userPreferences.ishaAngle);
  params.adjustments.fajr = Number(userPreferences.fajrAdjustment);
  params.adjustments.dhuhr = Number(userPreferences.dhuhrAdjustment);
  params.adjustments.asr = Number(userPreferences.asrAdjustment);
  params.adjustments.maghrib = Number(userPreferences.maghribAdjustment);
  params.adjustments.isha = Number(userPreferences.ishaAdjustment);
  params.shafaq = userPreferences.shafaqRule;
  params.polarCircleResolution = userPreferences.polarCircleResolution;

  return { params, coordinates };
};

const upcomingTimes = (
  coordinates: Coordinates,
  params: CalculationParameters,
  salahName: SalahNamesTypeAdhanLibrary,
  now: Date,
) => {
  const times: Date[] = [];

  for (let i = 0; i < DAYS_TO_SCHEDULE; i++) {
    const salahTime = new PrayerTimes(coordinates, addDays(now, i), params)[
      salahName
    ];

    if (now < salahTime) {
      times.push(salahTime);
    }
  }

  return times;
};

const notificationSound = (
  salahName: SalahNamesTypeAdhanLibrary,
  setting: SalahNotificationSettings,
  platform: string,
) => {
  if (setting !== "adhan") return "default";
  if (platform !== "android") return "adhan.wav";
  return salahName === "fajr" ? "adhan_fajr.mp3" : "adhan.mp3";
};

const notificationChannel = (
  salahName: SalahNamesTypeAdhanLibrary,
  setting: SalahNotificationSettings,
) => {
  if (setting !== "adhan") return "salah-reminders-without-adhan";
  return salahName === "fajr"
    ? "fajr-reminder-with-adhan"
    : "dhuhr-asr-maghrib-isha-reminders-with-adhan";
};

export const buildSalahNotificationPlan = (
  latitude: number,
  longitude: number,
  userPreferences: userPreferencesType,
  salahName: SalahNamesTypeAdhanLibrary,
  setting: SalahNotificationSettings,
  now: Date,
  platform: string,
): PlannedNotification[] => {
  if (setting !== "on" && setting !== "adhan") return [];

  const result = buildCalculationParams(latitude, longitude, userPreferences);
  if (!result) return [];

  const title = upperCaseFirstLetter(salahName);
  const body =
    salahName === "sunrise"
      ? "The sun is rising!"
      : `It's time to pray ${title}`;

  return upcomingTimes(result.coordinates, result.params, salahName, now).map(
    (at) => ({
      id: generateNotificationId(salahName, at),
      title,
      body,
      at,
      sound: notificationSound(salahName, setting, platform),
      channelId: notificationChannel(salahName, setting),
    }),
  );
};

export const buildAfterIshaReminderPlan = (
  latitude: number,
  longitude: number,
  userPreferences: userPreferencesType,
  delayMinutes: number,
  now: Date,
): PlannedNotification[] => {
  const result = buildCalculationParams(latitude, longitude, userPreferences);
  if (!result) return [];

  return upcomingTimes(result.coordinates, result.params, "isha", now).map(
    (ishaTime, i) => ({
      id: 1000 + i,
      title: "Daily Reminder",
      body: "Did you log your prayers today?",
      at: addMinutes(ishaTime, delayMinutes),
      sound: "default",
      channelId: "daily-reminder",
    }),
  );
};

export const buildAllNotificationPlans = (
  latitude: number,
  longitude: number,
  userPreferences: userPreferencesType,
  now: Date,
  platform: string,
): PlannedNotification[] => {
  const salahPlans = NOTIFIABLE_SALAHS.flatMap((salahName) =>
    buildSalahNotificationPlan(
      latitude,
      longitude,
      userPreferences,
      salahName,
      userPreferences[`${salahName}Notification`],
      now,
      platform,
    ),
  );

  const isAfterIshaReminderOn =
    userPreferences.dailyNotification === "1" &&
    userPreferences.dailyNotificationOption === "afterIsha";

  const reminderPlan = isAfterIshaReminderOn
    ? buildAfterIshaReminderPlan(
        latitude,
        longitude,
        userPreferences,
        Number(userPreferences.dailyNotificationAfterIshaDelay),
        now,
      )
    : [];

  return [...salahPlans, ...reminderPlan];
};
