import { SQLiteDBConnection } from "@capacitor-community/sqlite";
import {
  calculationMethod,
  LocationsDataObjTypeArr,
  PreferenceType,
  SalahByDateObjType,
  SalahNamesTypeAdhanLibrary,
  SalahNotificationSettings,
  SalahRecordType,
  salahTimesObjType,
  userPreferencesType,
} from "../types/types";
import { toggleDBConnection } from "./dbUtils";
import {
  buildAfterIshaReminderPlan,
  buildCalculationParams,
  buildSalahNotificationPlan,
  DAILY_REMINDER_BASE_ID,
  DAILY_REMINDER_DAYS,
  PlannedNotification,
  upperCaseFirstLetter,
} from "./salahSchedule";

export { upperCaseFirstLetter };
import {
  CalculationMethod,
  CalculationParameters,
  Coordinates,
  HighLatitudeRule,
  PrayerTimes,
} from "adhan";
import { LocalNotifications } from "@capacitor/local-notifications";
import { addDays, format, isValid, parse, set } from "date-fns";
import { Toast } from "@capacitor/toast";
import { Dialog } from "@capacitor/dialog";
import { Capacitor } from "@capacitor/core";
import { EdgeToEdge } from "@capawesome/capacitor-android-edge-to-edge-support";
import { StatusBar, Style } from "@capacitor/status-bar";
import {
  AndroidSettings,
  IOSSettings,
  NativeSettings,
} from "capacitor-native-settings";

import { BatteryOptimization } from "@capawesome-team/capacitor-android-battery-optimization";

export const showToast = async (text: string, duration: "short" | "long") => {
  await Toast.show({
    text: text,
    position: "center",
    duration: duration,
  });
};

export const salahTableIndividualSquareStyles = `w-[1.5rem] h-[1.5rem] rounded-md`;

export const getMissedSalahCount = (missedSalahList: SalahByDateObjType) => {
  return Object.values(missedSalahList).flat().length;
};

export const isValidDate = (date: string): boolean => {
  const parsedDate = parse(date, "yyyy-MM-dd", new Date());
  // console.log("Date is: ", parsedDate, "and its: ", isValid(parsedDate));
  return isValid(parsedDate);
};

export const showAlert = async (title: string, msg: string) => {
  await Dialog.alert({
    title: title,
    message: msg,
  });
};

export const showConfirmMsg = async (
  title: string,
  msg: string,
): Promise<boolean> => {
  const { value } = await Dialog.confirm({
    title: title,
    message: msg,
  });

  return value;
};

export const setStatusAndNavBarBGColor = async (
  backgroundColor: string,
  textColor: Style,
) => {
  if (Capacitor.getPlatform() === "android") {
    await EdgeToEdge.setBackgroundColor({ color: backgroundColor });
  }
  await StatusBar.setStyle({ style: textColor });
};

export const promptToOpenDeviceSettings = async (
  title: string,
  message: string,
  androidOption: AndroidSettings,
) => {
  const { value } = await Dialog.confirm({
    title: title,
    message: message,
    okButtonTitle: "Open settings",
    cancelButtonTitle: "Cancel",
  });

  if (value) {
    if (Capacitor.getPlatform() === "ios") {
      NativeSettings.openIOS({
        option: IOSSettings.App,
      });
    } else if (Capacitor.getPlatform() === "android") {
      NativeSettings.openAndroid({
        option: androidOption,
      });
    }
  }
};

export const updateUserPrefs = async (
  dbConnection: React.MutableRefObject<SQLiteDBConnection | undefined>,
  preferenceName: PreferenceType,
  preferenceValue: string | string[],
  setUserPreferences: React.Dispatch<React.SetStateAction<userPreferencesType>>,
) => {
  try {
    if (!dbConnection || !dbConnection.current) {
      throw new Error("dbConnection / dbconnection.current does not exist");
    }

    await toggleDBConnection(dbConnection, "open");

    if (preferenceName === "reasons") {
      const query = `UPDATE userPreferencesTable SET preferenceValue = ? WHERE preferenceName = ?`;
      await dbConnection.current.run(query, [
        preferenceValue.toString(),
        preferenceName,
      ]);
    } else {
      const query = `INSERT OR REPLACE INTO userPreferencesTable (preferenceName, preferenceValue) VALUES (?, ?)`;
      await dbConnection.current.run(query, [preferenceName, preferenceValue]);
    }

    setUserPreferences((userPreferences: userPreferencesType) => ({
      ...userPreferences,
      [preferenceName]: preferenceValue,
    }));
  } catch (error) {
    console.error(`ERROR ENTERING ${preferenceName} into DB`);
    console.error(error);
  } finally {
    if (!dbConnection || !dbConnection.current) {
      throw new Error("dbConnection / dbconnection.current does not exist");
    }
    // let DBResultPreferences = await dbConnection.current.query(
    //   `SELECT * FROM userPreferencesTable`,
    // );
    // console.log("DBResultPreferences: ", DBResultPreferences.values);
    await toggleDBConnection(dbConnection, "close");
  }
};

export const getActiveLocation = (userLocations: LocationsDataObjTypeArr) => {
  const activeLocation = userLocations.find((loc) => loc.isSelected === 1);
  // if (!activeLocation) {
  //   console.error("No active location exists");
  // }

  return activeLocation;
};

export const cancelNotifications = async (
  notificationName: SalahNamesTypeAdhanLibrary | "Daily Reminder",
) => {
  // console.log(
  //   "CANCELLING NOTIFICATIONS FOR THE FOLLOWING REMINDERS: ",
  //   notificationName,
  // );

  const pendingNotifications = await LocalNotifications.getPending();

  // console.log(
  //   "pendingNotifications before cancellation: ",
  //   pendingNotifications.notifications,
  // );

  const notificationNameToCancel =
    notificationName !== "Daily Reminder"
      ? upperCaseFirstLetter(notificationName)
      : notificationName;

  const notificationsToCancel = pendingNotifications.notifications
    .filter((item) => item.title === notificationNameToCancel)
    .map((n) => ({
      id: n.id,
    }));

  // console.log("notificationsToCancel: ", notificationsToCancel);

  if (notificationsToCancel.length === 0) return;

  await LocalNotifications.cancel({ notifications: notificationsToCancel });

  // console.log(
  //   "pending notifications after cancelling: ",
  //   (await LocalNotifications.getPending()).notifications,
  // );
};

export const toLocalDateFromUTCClock = (utcDate: Date) => {
  return new Date(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth(),
    utcDate.getUTCDate(),
    utcDate.getUTCHours(),
    utcDate.getUTCMinutes(),
    utcDate.getUTCSeconds(),
  );
};

export const checkNotificationPermissions = async () => {
  const userNotificationPermission =
    await LocalNotifications.checkPermissions();
  return userNotificationPermission.display;
};

export const isDayFullyLogged = (record: SalahRecordType | undefined) =>
  !!record && Object.values(record.salahs).every((status) => status !== "");

// Each reminder is a one-off (not a repeating notification) so that today's
// reminder can be left out once every salah is logged.
export const scheduleFixedTimeDailyNotification = async (
  hour: number,
  minute: number,
  skipToday: boolean,
) => {
  await cancelNotifications("Daily Reminder");

  const now = new Date();
  const notifications = [];

  for (let i = skipToday ? 1 : 0; i < DAILY_REMINDER_DAYS; i++) {
    const reminderTime = set(addDays(now, i), {
      hours: hour,
      minutes: minute,
      seconds: 0,
      milliseconds: 0,
    });

    if (reminderTime <= now) continue;

    notifications.push({
      id: DAILY_REMINDER_BASE_ID + i,
      title: "Daily Reminder",
      body: `Did you log your prayers today?`,
      schedule: {
        at: reminderTime,
        allowWhileIdle: true,
        repeats: false,
      },
      sound: "default",
      channelId: "daily-reminder",
    });
  }

  if (notifications.length === 0) return;

  await LocalNotifications.schedule({ notifications });
};

export const createLocalisedDate = (date: string) => {
  const parsedDate = parse(date, "yyyy-MM-dd", new Date());
  const userLocale = navigator.language || "en-US";
  const formattedParsedDate = new Intl.DateTimeFormat(userLocale, {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  })
    .format(parsedDate)
    .replace(/\//g, ".");
  return [format(parsedDate, "EEEE"), formattedParsedDate];
};

export const scheduleSalahNotifications = async (
  userLocations: LocationsDataObjTypeArr,
  salahName: SalahNamesTypeAdhanLibrary,
  userPreferences: userPreferencesType,
  setting: SalahNotificationSettings,
) => {
  await cancelNotifications(salahName);

  const activeLocation = getActiveLocation(userLocations);
  if (!activeLocation) return;

  const plan = buildSalahNotificationPlan(
    activeLocation.latitude,
    activeLocation.longitude,
    userPreferences,
    salahName,
    setting,
    new Date(),
    Capacitor.getPlatform(),
  );

  await schedulePlannedNotifications(plan);
};

const schedulePlannedNotifications = async (plan: PlannedNotification[]) => {
  for (const { at, ...notification } of plan) {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notification.id,
          title: notification.title,
          body: notification.body,
          schedule: { at, allowWhileIdle: true, repeats: false },
          sound: notification.sound,
          channelId: notification.channelId,
        },
      ],
    });
  }
};

export const generateActiveLocationParams = async (
  userLocations: LocationsDataObjTypeArr,
  userPreferences: userPreferencesType,
) => {
  const activeLocation = getActiveLocation(userLocations);
  if (!activeLocation) return;

  return buildCalculationParams(
    activeLocation.latitude,
    activeLocation.longitude,
    userPreferences,
  );
};

export const setAdhanLibraryDefaults = async (
  dbConnection: React.MutableRefObject<SQLiteDBConnection | undefined>,
  calcMethod: calculationMethod,
  setUserPreferences: React.Dispatch<React.SetStateAction<userPreferencesType>>,
  userPreferences: userPreferencesType,
  userLocations: LocationsDataObjTypeArr,
) => {
  // if (!userPreferences.prayerCalculationMethod) return;

  if (!userLocations) {
    console.error(
      "Unable to set calculation method as no user locations exist",
    );
    return;
  }

  try {
    await toggleDBConnection(dbConnection, "open");

    const activeLocation = getActiveLocation(userLocations);

    const params = CalculationMethod[calcMethod]();

    if (!activeLocation) {
      console.error("Active location does not exist");
      return;
    }

    const coordinates = new Coordinates(
      activeLocation.latitude,
      activeLocation.longitude,
    );

    const defaultCalcMethodValues = {
      prayerCalculationMethod: calcMethod,
      // madhab: params.madhab,
      madhab: userPreferences.madhab,
      highLatitudeRule: HighLatitudeRule.recommended(coordinates),
      fajrAngle: String(params.fajrAngle),
      ishaAngle: String(params.ishaAngle),
      fajrAdjustment: "0",
      dhuhrAdjustment: "0",
      asrAdjustment: "0",
      maghribAdjustment: "0",
      ishaAdjustment: "0",
    };

    // console.log("SETTING DEFAULTS", defaultCalcMethodValues);

    const query = `INSERT OR REPLACE INTO userPreferencesTable (preferenceName, preferenceValue) VALUES (?, ?)`;

    if (!dbConnection || !dbConnection.current) {
      throw new Error("dbConnection / dbconnection.current does not exist");
    }

    for (const [key, value] of Object.entries(defaultCalcMethodValues)) {
      // console.log(key, value);
      await dbConnection.current.run(query, [key, value]);
    }

    setUserPreferences((userPreferences: userPreferencesType) => ({
      ...userPreferences,
      ...defaultCalcMethodValues,
    }));
  } catch (error) {
    console.error(error);
  } finally {
    await toggleDBConnection(dbConnection, "close");
  }
};

export const scheduleAfterIshaDailyNotifications = async (
  delay: number,
  userLocations: LocationsDataObjTypeArr,
  userPreferences: userPreferencesType,
  skipToday: boolean,
) => {
  await cancelNotifications("Daily Reminder");

  const activeLocation = getActiveLocation(userLocations);
  if (!activeLocation) return;

  const plan = buildAfterIshaReminderPlan(
    activeLocation.latitude,
    activeLocation.longitude,
    userPreferences,
    delay,
    new Date(),
    skipToday,
  );

  await schedulePlannedNotifications(plan);
};

export const extractSalahTime = (
  salah: "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha",
  coordinates: Coordinates,
  date: Date,
  params: CalculationParameters,
  userPreferences: userPreferencesType,
) => {
  const salahTime = new PrayerTimes(coordinates, date, params)[salah];

  // if (salah === "maghrib") {
  //   console.log("Salah name: ", salah, "Salah Time: ", salahTime);
  // }

  const locale = navigator.language;

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: userPreferences.timeFormat === "24hr" ? "h23" : "h12",
  }).format(salahTime);
};

export const getSalahTimes = async (
  userLocations: LocationsDataObjTypeArr,
  date: Date,
  userPreferences: userPreferencesType,
  setSalahtimes: React.Dispatch<React.SetStateAction<salahTimesObjType>>,
) => {
  // console.log("GETTING SALAH TIMES FOR: ", date);

  const result = await generateActiveLocationParams(
    userLocations,
    userPreferences,
  );

  // console.log("RESULT IN GETSALAHTIMES: ", result);

  if (!result) return;

  const { params, coordinates } = result;

  if (!params || !coordinates || !date) return;

  // console.log("PARAMS IN GET: ", params);

  setSalahtimes({
    fajr: extractSalahTime("fajr", coordinates, date, params, userPreferences),
    sunrise: extractSalahTime(
      "sunrise",
      coordinates,
      date,
      params,
      userPreferences,
    ),
    dhuhr: extractSalahTime(
      "dhuhr",
      coordinates,
      date,
      params,
      userPreferences,
    ),
    asr: extractSalahTime("asr", coordinates, date, params, userPreferences),
    maghrib: extractSalahTime(
      "maghrib",
      coordinates,
      date,
      params,
      userPreferences,
    ),
    isha: extractSalahTime("isha", coordinates, date, params, userPreferences),
  });
};

export const getNextSalah = async (
  userLocations: LocationsDataObjTypeArr,
  userPreferences: userPreferencesType,
) => {
  const result = await generateActiveLocationParams(
    userLocations,
    userPreferences,
  );

  if (!result) return;

  const { params, coordinates } = result;

  const todaysDate = new Date();

  // console.log("PARAMS: ", result.params);

  let allSalahTimes = new PrayerTimes(coordinates, todaysDate, params);

  // console.log("ALL SALAH TIMES: ", allSalahTimes);

  let next = allSalahTimes.nextPrayer();

  // console.log("NEXT SALAH TIME: ", allSalahTimes.timeForPrayer(next));

  let nextSalahTime: Date | null = null;
  let currentSalah:
    "none" | "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha" = "none";

  // const sunnahTimes = new SunnahTimes(allSalahTimes);
  // console.log("sunnahTimes: ", sunnahTimes);

  if (next === "none") {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    allSalahTimes = new PrayerTimes(coordinates, tomorrow, params);

    currentSalah = "isha";
    next = allSalahTimes.nextPrayer();

    nextSalahTime = allSalahTimes.timeForPrayer(next);
  } else if (next === "sunrise") {
    next = "sunrise";
    nextSalahTime = allSalahTimes.timeForPrayer(next);
    currentSalah = "fajr";
  } else {
    nextSalahTime = allSalahTimes.timeForPrayer(next);
    currentSalah = allSalahTimes.currentPrayer();
  }

  if (nextSalahTime === null) {
    console.error("nextSalahTime is null");
    return;
  }

  const now = new Date();
  const diffMs = nextSalahTime.getTime() - now.getTime();
  // const hours = Math.floor(diffMs / 1000 / 60 / 60);
  // const minutes = Math.ceil((diffMs / 1000 / 60) % 60);
  const totalMinutes = Math.ceil(diffMs / 60000);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // console.log("diffMs: ", diffMs);
  // console.log("hours: ", hours);
  // console.log("minutes: ", minutes);

  return {
    currentSalah: currentSalah,
    nextSalah: next,
    nextSalahTime: nextSalahTime,
    hoursRemaining: hours,
    minsRemaining: minutes,
  };
};

export const handleNotificationPermissions = async () => {
  const userNotificationPermission = await checkNotificationPermissions();

  if (userNotificationPermission === "denied") {
    await promptToOpenDeviceSettings(
      `Notifications are turned off`,
      `You currently have notifications turned off for this application, you can open Settings to re-enable them`,
      AndroidSettings.AppNotification,
    );
    return "denied";
  } else if (userNotificationPermission === "granted") {
    return "granted";
  } else if (
    userNotificationPermission === "prompt" ||
    userNotificationPermission === "prompt-with-rationale"
  ) {
    const requestPermission = await LocalNotifications.requestPermissions();

    if (requestPermission.display === "granted") {
      return "granted";
    } else if (requestPermission.display === "denied") {
      return "denied";
    }
  }
};

export const formatNumberWithSign = (number: number) => {
  if (number > 0) return `+${number}`;
  if (number < 0) return `${number}`;
  return 0;
};

export const isBatteryOptimizationEnabled = async () => {
  if (Capacitor.getPlatform() !== "android") {
    return false;
  }
  const { enabled } = await BatteryOptimization.isBatteryOptimizationEnabled();
  return enabled;
};

export const requestIgnoreBatteryOptimization = async () => {
  if (Capacitor.getPlatform() !== "android") {
    return;
  }
  await BatteryOptimization.requestIgnoreBatteryOptimization();
};
