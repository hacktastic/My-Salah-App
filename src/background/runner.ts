// iOS background runner. Android uses CurrentLocationWorker.java, because this
// runner's Android alarms cannot replace or cancel the local-notifications alarms.
import type {
  CapacitorGeolocation as GeolocationAPI,
  CapacitorKV as KVAPI,
  CapacitorNotifications as NotificationsAPI,
} from "@capacitor/background-runner";
import { BackgroundState, planAfterMove } from "./backgroundPlan";

declare const CapacitorKV: KVAPI;
declare const CapacitorGeolocation: GeolocationAPI;
declare const CapacitorNotifications: NotificationsAPI;

type RunnerCallback = (
  resolve: () => void,
  reject: (error: unknown) => void,
  args: Record<string, unknown> | undefined,
) => void;

declare function addEventListener(
  event: string,
  callback: RunnerCallback,
): void;

const STATE_KEY = "currentLocationState";

addEventListener("syncState", (resolve, reject, args) => {
  try {
    if (args?.state) {
      CapacitorKV.set(STATE_KEY, JSON.stringify(args.state));
    } else {
      CapacitorKV.remove(STATE_KEY);
    }
    resolve();
  } catch (error) {
    reject(error);
  }
});

addEventListener("refreshLocation", (resolve, reject) => {
  try {
    const stored = CapacitorKV.get(STATE_KEY)?.value;
    if (!stored) return resolve();

    const state: BackgroundState = JSON.parse(stored);
    const { latitude, longitude } = CapacitorGeolocation.getCurrentPosition();
    const plan = planAfterMove(
      state,
      { latitude, longitude },
      new Date(),
      "ios",
    );

    if (plan === null) return resolve();

    CapacitorNotifications.schedule(
      plan.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        scheduleAt: n.at,
        sound: n.sound,
      })),
    );

    CapacitorKV.set(
      STATE_KEY,
      JSON.stringify({ ...state, latitude, longitude }),
    );
    resolve();
  } catch (error) {
    reject(error);
  }
});
