import { beforeEach, describe, expect, it, vi } from "vitest";
import { SQLiteDBConnection } from "@capacitor-community/sqlite";

const geolocation = vi.hoisted(() => ({
  checkPermissions: vi.fn(),
  getCurrentPosition: vi.fn(),
}));

vi.mock("@capacitor/geolocation", () => ({ Geolocation: geolocation }));

import {
  addCurrentLocation,
  distanceKm,
  findNearestCity,
  locationDisplayName,
  refreshCurrentLocation,
} from "./currentLocation";
import { LocationsDataObjType } from "../types/types";

const DUBAI = { latitude: 25.2048, longitude: 55.2708 };
const LONDON = { latitude: 51.5074, longitude: -0.1278 };

const currentLocationRow: LocationsDataObjType = {
  id: 9,
  locationName: "Dubai",
  ...DUBAI,
  isSelected: 1,
  isCurrentLocation: 1,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const makeDb = (rows: LocationsDataObjType[]) => {
  const run = vi.fn().mockResolvedValue({ changes: { changes: 1 } });
  const query = vi.fn().mockImplementation((sql: string) => {
    if (sql.includes("WHERE isCurrentLocation = 1")) {
      return Promise.resolve({
        values: rows.filter((r) => r.isCurrentLocation === 1),
      });
    }
    return Promise.resolve({ values: rows });
  });

  const dbConnection = {
    current: {
      run,
      query,
      isDBOpen: vi.fn().mockResolvedValue({ result: false }),
      open: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as React.MutableRefObject<SQLiteDBConnection | undefined>;

  return { dbConnection, run };
};

const positionAt = (coords: { latitude: number; longitude: number }) => ({
  coords,
  timestamp: Date.now(),
});

describe("distanceKm", () => {
  it("returns 0 for the same point", () => {
    expect(distanceKm(DUBAI, DUBAI)).toBe(0);
  });

  it("returns about 5,470 km between Dubai and London", () => {
    expect(distanceKm(DUBAI, LONDON)).toBeGreaterThan(5400);
    expect(distanceKm(DUBAI, LONDON)).toBeLessThan(5550);
  });
});

describe("findNearestCity", () => {
  it("finds Dubai for coordinates in Dubai", () => {
    expect(findNearestCity(25.2, 55.27)?.city).toBe("Dubai");
  });

  it("finds London for coordinates in central London", () => {
    expect(findNearestCity(51.5074, -0.1278)?.city).toBe("London");
  });
});

describe("locationDisplayName", () => {
  it("adds the Current Location prefix to the dynamic row", () => {
    expect(locationDisplayName(currentLocationRow)).toBe(
      "Current Location · Dubai",
    );
  });

  it("shows only Current Location when the row has no city name", () => {
    expect(
      locationDisplayName({ ...currentLocationRow, locationName: "" }),
    ).toBe("Current Location");
  });

  it("does not change the name of a static row", () => {
    expect(
      locationDisplayName({ ...currentLocationRow, isCurrentLocation: 0 }),
    ).toBe("Dubai");
  });
});

describe("refreshCurrentLocation", () => {
  const setUserLocations = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    geolocation.checkPermissions.mockResolvedValue({
      location: "granted",
      coarseLocation: "granted",
    });
  });

  it("does nothing when there is no current location row", async () => {
    const { dbConnection, run } = makeDb([]);

    const moved = await refreshCurrentLocation(dbConnection, setUserLocations);

    expect(moved).toBe(false);
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("does nothing when location permission is not granted", async () => {
    const { dbConnection, run } = makeDb([currentLocationRow]);
    geolocation.checkPermissions.mockResolvedValue({
      location: "denied",
      coarseLocation: "denied",
    });

    const moved = await refreshCurrentLocation(dbConnection, setUserLocations);

    expect(moved).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });

  it("does not update the row when the user moved 5 km or less", async () => {
    const { dbConnection, run } = makeDb([currentLocationRow]);
    geolocation.getCurrentPosition.mockResolvedValue(
      positionAt({ latitude: 25.22, longitude: 55.28 }),
    );

    const moved = await refreshCurrentLocation(dbConnection, setUserLocations);

    expect(moved).toBe(false);
    expect(run).not.toHaveBeenCalled();
    expect(setUserLocations).not.toHaveBeenCalled();
  });

  it("updates the row and the state when the user moved more than 5 km", async () => {
    const { dbConnection, run } = makeDb([currentLocationRow]);
    geolocation.getCurrentPosition.mockResolvedValue(positionAt(LONDON));

    const moved = await refreshCurrentLocation(dbConnection, setUserLocations);

    expect(moved).toBe(true);
    const [sql, params] = run.mock.calls[0];
    expect(sql).toContain("UPDATE userLocationsTable");
    expect(params.slice(0, 3)).toEqual([
      "London",
      LONDON.latitude,
      LONDON.longitude,
    ]);
    expect(params[4]).toBe(currentLocationRow.id);
    expect(setUserLocations).toHaveBeenCalled();
  });

  it("updates the row when force is set, even without movement", async () => {
    const { dbConnection, run } = makeDb([currentLocationRow]);
    geolocation.getCurrentPosition.mockResolvedValue(positionAt(DUBAI));

    const moved = await refreshCurrentLocation(dbConnection, setUserLocations, {
      force: true,
    });

    expect(moved).toBe(true);
    expect(run).toHaveBeenCalled();
  });

  it("keeps the last coordinates when the GPS read fails", async () => {
    const { dbConnection, run } = makeDb([currentLocationRow]);
    geolocation.getCurrentPosition.mockRejectedValue(new Error("timeout"));

    const moved = await refreshCurrentLocation(dbConnection, setUserLocations);

    expect(moved).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });
});

describe("addCurrentLocation", () => {
  it("deselects other rows and inserts a selected current location row", async () => {
    const { dbConnection, run } = makeDb([]);

    await addCurrentLocation(dbConnection, LONDON);

    expect(run.mock.calls[0][0]).toBe(
      "UPDATE userLocationsTable SET isSelected = 0",
    );
    const [sql, params] = run.mock.calls[1];
    expect(sql).toContain("INSERT INTO userLocationsTable");
    expect(params.slice(0, 3)).toEqual([
      "London",
      LONDON.latitude,
      LONDON.longitude,
    ]);
  });
});
