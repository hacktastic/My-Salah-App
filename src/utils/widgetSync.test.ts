import { vi } from "vitest";
import type { WidgetSnapshot } from "./widgetSnapshot";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  isNativePlatform: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: mocks.isNativePlatform },
  registerPlugin: () => ({ update: mocks.update }),
}));

import { syncWidget } from "./widgetSync";

const SNAPSHOT: WidgetSnapshot = {
  version: 1,
  generatedAt: "2026-10-10T15:00:00.000Z",
  entries: [],
};

describe("syncWidget", () => {
  beforeEach(() => {
    mocks.update.mockReset().mockResolvedValue(undefined);
    mocks.isNativePlatform.mockReset().mockReturnValue(true);
  });

  it("sends the snapshot as JSON on a native platform", async () => {
    await syncWidget(SNAPSHOT);
    expect(mocks.update).toHaveBeenCalledWith({
      json: JSON.stringify(SNAPSHOT),
    });
  });

  it("does nothing on web", async () => {
    mocks.isNativePlatform.mockReturnValue(false);
    await syncWidget(SNAPSHOT);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("does nothing when there is no snapshot", async () => {
    await syncWidget(null);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("logs a plugin error and does not throw it", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.update.mockRejectedValue(new Error("not implemented"));
    await expect(syncWidget(SNAPSHOT)).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
