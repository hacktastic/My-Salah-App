// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from "vitest";
import { build } from "esbuild";
import vm from "node:vm";
import { dictPreferencesDefaultValues } from "../utils/constants";
import type { BackgroundState } from "./backgroundPlan";

// Bundles each entry the same way scripts/build-background.mjs does, then runs it in
// an empty VM context: the sandbox and the runner give no DOM and no module loader.
const bundle = async (entry: string) => {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    format: "iife",
    target: "es2020",
    write: false,
  });
  return result.outputFiles[0].text;
};

const DOHA = { latitude: 25.286106, longitude: 51.534817 };
const LONDON = { latitude: 51.5074, longitude: -0.1278 };

const state: BackgroundState = {
  ...DOHA,
  preferences: {
    ...dictPreferencesDefaultValues,
    prayerCalculationMethod: "Qatar",
    fajrNotification: "adhan",
    ishaNotification: "on",
  },
  fullyLoggedDate: null,
};

// The VM context uses the same time zone as the Vitest process.
const DEVICE_OFFSET = -new Date().getTimezoneOffset();

describe("android plan bundle", () => {
  let buildPlanJson: (
    json: string,
    lat: number,
    lng: number,
    offset: number,
  ) => string;

  beforeAll(async () => {
    const context = vm.createContext({});
    vm.runInContext(
      await bundle("src/background/androidPlanEntry.ts"),
      context,
    );
    buildPlanJson = context.buildPlanJson;
  });

  it("returns null when the user did not move more than 5 km", () => {
    expect(
      buildPlanJson(
        JSON.stringify(state),
        DOHA.latitude + 0.01,
        DOHA.longitude,
        DEVICE_OFFSET,
      ),
    ).toBe("null");
  });

  it("returns LocalNotification JSON for the new position after a move", () => {
    const plan = JSON.parse(
      buildPlanJson(
        JSON.stringify(state),
        LONDON.latitude,
        LONDON.longitude,
        DEVICE_OFFSET,
      ),
    );

    expect(plan.length).toBeGreaterThan(0);
    expect(new Set(plan.map((n: { title: string }) => n.title))).toEqual(
      new Set(["Fajr", "Isha"]),
    );

    const fajr = plan.find((n: { title: string }) => n.title === "Fajr");
    expect(fajr.sound).toBe("adhan_fajr.mp3");
    expect(fajr.channelId).toBe("fajr-reminder-with-adhan");
    expect(fajr.schedule.allowWhileIdle).toBe(true);
    expect(fajr.schedule.at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });
});

describe("android plan bundle guards", () => {
  let buildPlanJson: (
    json: string,
    lat: number,
    lng: number,
    offset: number,
  ) => string;

  beforeAll(async () => {
    const context = vm.createContext({});
    vm.runInContext(
      await bundle("src/background/androidPlanEntry.ts"),
      context,
    );
    buildPlanJson = context.buildPlanJson;
  });

  it("throws when the sandbox time zone differs from the device", () => {
    expect(() =>
      buildPlanJson(
        JSON.stringify(state),
        LONDON.latitude,
        LONDON.longitude,
        DEVICE_OFFSET + 60,
      ),
    ).toThrow(/does not match device offset/);
  });
});

describe("iOS runner bundle", () => {
  type Listener = (
    resolve: () => void,
    reject: (error: unknown) => void,
    args?: Record<string, unknown>,
  ) => void;

  const setup = async (position: { latitude: number; longitude: number }) => {
    const kv = new Map<string, string>();
    const listeners: Record<string, Listener> = {};
    const schedule = vi.fn();

    const context = vm.createContext({
      addEventListener: (event: string, callback: Listener) => {
        listeners[event] = callback;
      },
      CapacitorKV: {
        set: (key: string, value: string) => kv.set(key, value),
        get: (key: string) => ({ value: kv.get(key) ?? "" }),
        remove: (key: string) => kv.delete(key),
      },
      CapacitorGeolocation: { getCurrentPosition: () => position },
      CapacitorNotifications: { schedule },
    });
    vm.runInContext(await bundle("src/background/runner.ts"), context);

    const dispatch = (event: string, args?: Record<string, unknown>) =>
      new Promise<void>((resolve, reject) =>
        listeners[event](resolve, reject, args),
      );

    return { kv, schedule, dispatch };
  };

  it("does nothing before the app syncs any state", async () => {
    const { schedule, dispatch } = await setup(LONDON);

    await dispatch("refreshLocation");

    expect(schedule).not.toHaveBeenCalled();
  });

  it("schedules the new times and saves the position after a move", async () => {
    const { kv, schedule, dispatch } = await setup(LONDON);

    await dispatch("syncState", { state });
    await dispatch("refreshLocation");

    expect(schedule).toHaveBeenCalledTimes(1);
    const notifications = schedule.mock.calls[0][0];
    expect(notifications[0]).toMatchObject({ title: expect.any(String) });
    // The Date comes from the VM context, so instanceof Date is false here.
    expect(Object.prototype.toString.call(notifications[0].scheduleAt)).toBe(
      "[object Date]",
    );
    expect(JSON.parse(kv.get("currentLocationState")!)).toMatchObject(LONDON);
  });

  it("does not schedule when the user did not move", async () => {
    const { schedule, dispatch } = await setup(DOHA);

    await dispatch("syncState", { state });
    await dispatch("refreshLocation");

    expect(schedule).not.toHaveBeenCalled();
  });

  it("clears the state when the app syncs no state", async () => {
    const { kv, dispatch } = await setup(LONDON);

    await dispatch("syncState", { state });
    await dispatch("syncState", {});

    expect(kv.has("currentLocationState")).toBe(false);
  });
});
