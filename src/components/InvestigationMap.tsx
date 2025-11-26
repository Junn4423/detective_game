import { useMemo, useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Clue, SuspectProfile, VictimProfile, CitizenProfile } from '@/types/game'
import { useGameStore } from '@/store/gameStore'

interface InvestigationMapProps {
  victim?: VictimProfile
  suspects?: SuspectProfile[]
  primeSuspectIds?: string[]
  allCitizens?: CitizenProfile[]
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

const MapFocusHandler = ({
  center,
  focusedCitizenId,
  citizens
}: {
  center: [number, number],
  focusedCitizenId?: string,
  citizens?: CitizenProfile[]
}) => {
  const map = useMap()

  useEffect(() => {
    if (focusedCitizenId && citizens) {
      const target = citizens.find(c => c.id === focusedCitizenId)
      if (target) {
        map.flyTo([target.coordinates.lat, target.coordinates.lng], 15, {
          duration: 2
        })
        return
      }
    }
    // Default to center (victim) if no focus or on load
    map.flyTo(center, 13, {
      duration: 2
    })
  }, [map, center, focusedCitizenId, citizens])

  return null
}

export const InvestigationMap = ({
  victim,
  suspects,
  primeSuspectIds,
  allCitizens,
  clues,
  highlightedClueId,
}: InvestigationMapProps) => {
  const [filterMode, setFilterMode] = useState<'all' | 'area' | 'scene'>('all')
  const focusedCitizenId = useGameStore((state) => state.focusedCitizenId)

  const center: [number, number] = useMemo(
    () => (victim ? [victim.lastKnownLocation.lat, victim.lastKnownLocation.lng] : defaultCenter),
    [victim],
  )

  const displayedCitizens = useMemo(() => {
    if (!victim || !allCitizens) return []

    if (filterMode === 'all') {
      return allCitizens
    }
    if (filterMode === 'area') {
      return suspects || []
    }
    if (filterMode === 'scene') {
      return suspects?.filter((s) => primeSuspectIds?.includes(s.id)) || []
    }
    return []
  }, [filterMode, allCitizens, suspects, primeSuspectIds, victim])

  return (
    <section className="panel map-panel">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h2>Bản đồ điều tra</h2>
          <span style={{ fontSize: '0.8rem', color: '#666' }}>
            Hệ thống vệ tinh toàn cầu đã kích hoạt. Phát hiện 100 tín hiệu sinh trắc học liên quan đến nạn nhân.
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button
            onClick={() => setFilterMode('all')}
            style={{
              padding: '0.3rem 0.6rem',
              background: filterMode === 'all' ? '#3b82f6' : '#1e293b',
              color: 'white',
              border: '1px solid #334155',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilterMode('area')}
            style={{
              padding: '0.3rem 0.6rem',
              background: filterMode === 'area' ? '#3b82f6' : '#1e293b',
              color: 'white',
              border: '1px solid #334155',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Khu vực (50)
          </button>
          <button
            onClick={() => setFilterMode('scene')}
            style={{
              padding: '0.3rem 0.6rem',
              background: filterMode === 'scene' ? '#3b82f6' : '#1e293b',
              color: 'white',
              border: '1px solid #334155',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Hiện trường (10)
          </button>
        </div>
      </div>
      <MapContainer center={center} zoom={11} scrollWheelZoom className="map-shell">
        <MapFocusHandler center={center} focusedCitizenId={focusedCitizenId} citizens={allCitizens} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {victim ? (
          <CircleMarker
            center={[victim.lastKnownLocation.lat, victim.lastKnownLocation.lng]}
            radius={10}
            pathOptions={{ color: '#ff4d6d', fillColor: '#ff4d6d', fillOpacity: 0.8 }}
          >
            <Popup>
              <strong>NẠN NHÂN</strong>
              <br />
              {victim.fullName}
            </Popup>
          </CircleMarker>
        ) : null}
        {displayedCitizens.map((citizen) => {
          if (citizen.id === victim?.id) return null // Skip victim (already drawn)

          const isSuspect = suspects?.some(s => s.id === citizen.id)
          const isPrime = primeSuspectIds?.includes(citizen.id)

          let color = '#3b82f6' // Blue for normal
          let radius = 4

          if (isSuspect) {
            color = '#2ec4b6' // Teal for suspects
            radius = 6
          }
          if (isPrime) {
            color = '#f59e0b' // Orange for prime
            radius = 8
          }

          return (
            <CircleMarker
              key={citizen.id}
              center={[citizen.coordinates.lat, citizen.coordinates.lng]}
              radius={radius}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.6 }}
            >
              <Popup>
                <strong>{citizen.fullName}</strong>
                <p>{citizen.residence}</p>
                {isSuspect && <p style={{ color: '#2ec4b6' }}>Nghi phạm (Khu vực)</p>}
                {isPrime && <p style={{ color: '#f59e0b', fontWeight: 'bold' }}>Nghi phạm chính (Hiện trường)</p>}
              </Popup>
            </CircleMarker>
          )
        })}
        {clues?.flatMap((clue) =>
          clue.mapHints.map((hint) => (
            <Circle
              key={`${clue.id}-${hint.id}`}
              center={[hint.point.lat, hint.point.lng]}
              radius={hint.radiusMeters}
              pathOptions={{
                color: highlightedClueId === clue.id ? '#ff9f1c' : '#6c757d',
                weight: highlightedClueId === clue.id ? 3 : 1,
                fillOpacity: 0.1,
              }}
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
