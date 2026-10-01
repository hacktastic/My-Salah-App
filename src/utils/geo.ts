// Kept free of Capacitor and cities.json imports: the background bundles use this file.

// Prayer times shift by about one minute per 15–25 km, so smaller moves are noise.
export const MOVE_THRESHOLD_KM = 5;

export type LatLng = { latitude: number; longitude: number };

const EARTH_RADIUS_KM = 6371;
export const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const distanceKm = (a: LatLng, b: LatLng) => {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};
