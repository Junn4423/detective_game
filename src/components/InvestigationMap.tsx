import { useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import type { Clue, SuspectProfile, VictimProfile } from '@/types/game'

interface InvestigationMapProps {
  victim?: VictimProfile
  suspects?: SuspectProfile[]
  clues?: Clue[]
  highlightedClueId?: string
}

const defaultCenter: [number, number] = [21.0278, 105.8342]

const iconAssets = {
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
}

L.Icon.Default.mergeOptions(iconAssets)

export const InvestigationMap = ({ victim, suspects, clues, highlightedClueId }: InvestigationMapProps) => {
  const center: [number, number] = useMemo(
    () => (victim ? [victim.lastKnownLocation.lat, victim.lastKnownLocation.lng] : defaultCenter),
    [victim],
  )
  return (
    <section className="panel map-panel">
      <div className="panel-header">
        <h2>Leaflet Map</h2>
        <span>Định vị manh mối</span>
      </div>
      <MapContainer center={center} zoom={5} scrollWheelZoom className="map-shell">
        <TileLayer
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {victim ? (
          <CircleMarker center={[victim.lastKnownLocation.lat, victim.lastKnownLocation.lng]} radius={10} pathOptions={{ color: '#ff4d6d' }}>
            <Popup>Victim last seen: {victim.fullName}</Popup>
          </CircleMarker>
        ) : null}
        {suspects?.map((suspect) => (
          <CircleMarker
            key={suspect.id}
            center={[suspect.coordinates.lat, suspect.coordinates.lng]}
            radius={6}
            pathOptions={{ color: '#2ec4b6' }}
          >
            <Popup>
              <strong>{suspect.fullName}</strong>
              <p>{suspect.residence}</p>
            </Popup>
          </CircleMarker>
        ))}
        {clues?.flatMap((clue) =>
          clue.mapHints.map((hint) => (
            <Circle
              key={`${clue.id}-${hint.id}`}
              center={[hint.point.lat, hint.point.lng]}
              radius={hint.radiusMeters}
              pathOptions={{ color: highlightedClueId === clue.id ? '#ff9f1c' : '#6c757d', weight: highlightedClueId === clue.id ? 3 : 1 }}
            >
              <Popup>
                <strong>{clue.title}</strong>
                <p>{hint.label}</p>
              </Popup>
            </Circle>
          )),
        )}
      </MapContainer>
    </section>
  )
}
