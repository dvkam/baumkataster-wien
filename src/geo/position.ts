export type Position = {
  readonly latitude: number;
  readonly longitude: number;
};

export type BoundingBox = {
  readonly south: number;
  readonly west: number;
  readonly north: number;
  readonly east: number;
};

/** IUGG mean Earth radius. */
const EARTH_RADIUS_METERS = 6_371_008.8;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

/** Great-circle distance in metres (haversine). */
export function distanceMeters(from: Position, to: Position): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** A latitude/longitude box around `center` whose edges are `radiusMeters` away (exact to millimetres at city scale). */
export function boundingBox(center: Position, radiusMeters: number): BoundingBox {
  const dLat = toDegrees(radiusMeters / EARTH_RADIUS_METERS);
  const dLon = toDegrees(
    radiusMeters / (EARTH_RADIUS_METERS * Math.cos(toRadians(center.latitude))),
  );
  return {
    south: center.latitude - dLat,
    west: center.longitude - dLon,
    north: center.latitude + dLat,
    east: center.longitude + dLon,
  };
}
