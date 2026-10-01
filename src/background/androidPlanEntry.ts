// Entry for the bundle that CurrentLocationWorker.java runs in JavaScriptSandbox.
// The sandbox passes strings only, so input and output are JSON.
import { BackgroundState, planAfterMove } from "./backgroundPlan";

const buildPlanJson = (
  stateJson: string,
  latitude: number,
  longitude: number,
  deviceUtcOffsetMinutes: number,
) => {
  // Notification IDs and day boundaries use the local date. The sandbox runs in a
  // separate process, so if its time zone differs from the device's, the IDs would
  // not match the app's and the alarms would duplicate instead of replace.
  const engineUtcOffsetMinutes = -new Date().getTimezoneOffset();
  if (engineUtcOffsetMinutes !== deviceUtcOffsetMinutes) {
    throw new Error(
      `Sandbox UTC offset ${engineUtcOffsetMinutes} does not match device offset ${deviceUtcOffsetMinutes}`,
    );
  }

  const state: BackgroundState = JSON.parse(stateJson);
  const plan = planAfterMove(
    state,
    { latitude, longitude },
    new Date(),
    "android",
  );

  if (plan === null) return "null";

  // This is the JSObject shape that LocalNotification.buildNotificationFromJSObject reads.
  return JSON.stringify(
    plan.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      schedule: {
        at: n.at.toISOString(),
        allowWhileIdle: true,
        repeats: false,
      },
      sound: n.sound,
      channelId: n.channelId,
    })),
  );
};

(
  globalThis as unknown as { buildPlanJson: typeof buildPlanJson }
).buildPlanJson = buildPlanJson;
