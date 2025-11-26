import type { GeoPoint, MapHint } from '@/types/game'
import type { RNG } from '@/utils/random'

export const jitterPoint = (point: GeoPoint, rng: RNG, delta = 0.3): GeoPoint => ({
  lat: point.lat + (rng() - 0.5) * delta,
  lng: point.lng + (rng() - 0.5) * delta,
})

export const createMapHint = (
  label: string,
  point: GeoPoint,
  rng: RNG,
  radiusMeters = 400,
): MapHint => ({
  id: `${label}-${Math.round(rng() * 10_000)}`,
  label,
  point: jitterPoint(point, rng, 0.1),
  radiusMeters,
})

export const getLastKnownLocation = (point: GeoPoint, rng: RNG): GeoPoint =>
  jitterPoint(point, rng, 0.05)
