// Entry for the bundle that CurrentLocationWorker.java runs in JavaScriptSandbox.
// The sandbox passes strings only, so input and output are JSON.
import { BackgroundState, planAfterMove } from "./backgroundPlan";

const buildPlanJson = (
  stateJson: string,
  latitude: number,
  longitude: number,
) => {
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
      schedule: { at: n.at.toISOString(), allowWhileIdle: true, repeats: false },
      sound: n.sound,
      channelId: n.channelId,
    })),
  );
};

(globalThis as unknown as { buildPlanJson: typeof buildPlanJson }).buildPlanJson =
  buildPlanJson;
