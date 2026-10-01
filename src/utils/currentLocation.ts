import { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { Geolocation } from "@capacitor/geolocation";
import {
  LocationsDataObjType,
  LocationsDataObjTypeArr,
} from "../types/types";
import { allCities, CityType } from "./cities";
import { fetchAllLocations, toggleDBConnection } from "./dbUtils";
import { distanceKm, LatLng, MOVE_THRESHOLD_KM, toRadians } from "./geo";

export { distanceKm, MOVE_THRESHOLD_KM };

let cityCoords: { lat: Float64Array; lng: Float64Array } | undefined;

export const findNearestCity = (
  latitude: number,
  longitude: number,
): CityType | undefined => {
  if (!cityCoords) {
    cityCoords = {
      lat: Float64Array.from(allCities, (c) => Number(c.latitude)),
      lng: Float64Array.from(allCities, (c) => Number(c.longitude)),
    };
  }

  // Equirectangular distance is enough to rank cities and is much cheaper than haversine.
  const cosLat = Math.cos(toRadians(latitude));
  let nearestIndex = -1;
  let nearestDistance = Infinity;

  for (let i = 0; i < cityCoords.lat.length; i++) {
    const dLat = cityCoords.lat[i] - latitude;
    let dLng = Math.abs(cityCoords.lng[i] - longitude);
    if (dLng > 180) dLng = 360 - dLng;
    const distance = dLat * dLat + dLng * cosLat * (dLng * cosLat);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = i;
    }
  }

  return allCities[nearestIndex];
};

export const locationDisplayName = (location: LocationsDataObjType) => {
  if (location.isCurrentLocation !== 1) return location.locationName;

  return location.locationName
    ? `Current Location · ${location.locationName}`
    : "Current Location";
};

export const getCurrentLocationRow = (userLocations: LocationsDataObjTypeArr) =>
  userLocations.find((loc) => loc.isCurrentLocation === 1);

export const sortCurrentLocationFirst = (
  userLocations: LocationsDataObjTypeArr,
) =>
  [...userLocations].sort(
    (a, b) => (b.isCurrentLocation ?? 0) - (a.isCurrentLocation ?? 0),
  );

const hasLocationPermission = async () => {
  const { location, coarseLocation } = await Geolocation.checkPermissions();
  return location === "granted" || coarseLocation === "granted";
};

// The caller must open the DB first, the same as for addUserLocation.
export const addCurrentLocation = async (
  dbConnection: React.MutableRefObject<SQLiteDBConnection | undefined>,
  coords: LatLng,
) => {
  if (!dbConnection.current) {
    throw new Error("dbConnection / dbconnection.current does not exist");
  }

  const cityName = findNearestCity(coords.latitude, coords.longitude)?.city;

  await dbConnection.current.run(`UPDATE userLocationsTable SET isSelected = 0`);

  return dbConnection.current.run(
    `INSERT INTO userLocationsTable (locationName, latitude, longitude, isSelected, isCurrentLocation, updatedAt)
     VALUES (?, ?, ?, 1, 1, ?)`,
    [
      cityName ?? "",
      coords.latitude,
      coords.longitude,
      new Date().toISOString(),
    ],
  );
};

const withOpenDB = async <T>(
  dbConnection: React.MutableRefObject<SQLiteDBConnection | undefined>,
  work: (db: SQLiteDBConnection) => Promise<T>,
) => {
  if (!dbConnection.current) {
    throw new Error("dbConnection / dbconnection.current does not exist");
  }

  try {
    await toggleDBConnection(dbConnection, "open");
    return await work(dbConnection.current);
  } finally {
    await toggleDBConnection(dbConnection, "close");
  }
};

// Reads the row from the DB, not from React state: the appStateChange listener
// in App.tsx is registered once and only sees the state from the first render.
// The DB stays closed during the GPS read, because other code shares the connection.
export const refreshCurrentLocation = async (
  dbConnection: React.MutableRefObject<SQLiteDBConnection | undefined>,
  setUserLocations: React.Dispatch<
    React.SetStateAction<LocationsDataObjTypeArr>
  >,
  { force = false }: { force?: boolean } = {},
): Promise<boolean> => {
  try {
    const row = await withOpenDB(dbConnection, async (db) => {
      const res = await db.query(
        `SELECT * FROM userLocationsTable WHERE isCurrentLocation = 1 LIMIT 1`,
      );
      return res.values?.[0] as LocationsDataObjType | undefined;
    });

    if (!row || !(await hasLocationPermission())) return false;

    const position = await Geolocation.getCurrentPosition({
      timeout: 10000,
      maximumAge: 5 * 60 * 1000,
    });
    const coords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    if (!force && distanceKm(row, coords) <= MOVE_THRESHOLD_KM) return false;

    const cityName = findNearestCity(coords.latitude, coords.longitude)?.city;

    const allLocations = await withOpenDB(dbConnection, async (db) => {
      await db.run(
        `UPDATE userLocationsTable SET locationName = ?, latitude = ?, longitude = ?, updatedAt = ? WHERE id = ?`,
        [
          cityName ?? "",
          coords.latitude,
          coords.longitude,
          new Date().toISOString(),
          row.id,
        ],
      );
      return (await fetchAllLocations(dbConnection)).allLocations;
    });

    setUserLocations(allLocations);

    return true;
  } catch (error) {
    // A failed GPS read keeps the last known coordinates; the next resume tries again.
    console.error("refreshCurrentLocation failed", error);
    return false;
  }
};
