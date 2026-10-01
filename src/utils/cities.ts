import cities from "../assets/cities.json";

export type CityType = {
  country: string;
  city: string;
  latitude: string;
  longitude: string;
  search: string;
};

export const allCities: CityType[] = cities.map(
  (obj: { country: string; name: string; lat: string; lng: string }) => {
    return {
      country: obj.country,
      city: obj.name,
      latitude: obj.lat,
      longitude: obj.lng,
      search: obj.name.toLowerCase(),
    };
  },
);
