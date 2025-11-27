import { useMemo, useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { Clue, GeoPoint, MapHint, SuspectProfile, VictimProfile } from '@/types/game'
import { useGameStore } from '@/store/gameStore'

interface InvestigationMapProps {
  victim?: VictimProfile
  suspects?: SuspectProfile[]
  clues?: Clue[]
  highlightedClueId?: string
  hideoutHint?: MapHint
  accompliceIds?: string[]
}

const defaultCenter: [number, number] = [21.0278, 105.8342]

const iconAssets = {
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
}

L.Icon.Default.mergeOptions(iconAssets)

const CAPTURE_RADIUS_METERS = 2000

const metersBetween = (a: GeoPoint, b: GeoPoint) => {
  const R = 6371e3
  const phi1 = (a.lat * Math.PI) / 180
  const phi2 = (b.lat * Math.PI) / 180
  const deltaPhi = ((b.lat - a.lat) * Math.PI) / 180
  const deltaLambda = ((b.lng - a.lng) * Math.PI) / 180

  const sinDeltaPhi = Math.sin(deltaPhi / 2)
  const sinDeltaLambda = Math.sin(deltaLambda / 2)
  const aVal = sinDeltaPhi * sinDeltaPhi + Math.cos(phi1) * Math.cos(phi2) * sinDeltaLambda * sinDeltaLambda
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal))
  return R * c
}

const PlayerGuessHandler = ({ enabled, onGuess }: { enabled: boolean; onGuess: (point: GeoPoint) => void }) => {
  useMapEvents({
    click: (event) => {
      if (!enabled) return
      onGuess({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })
  return null
}

const isValidHint = (hint?: MapHint | null): hint is MapHint =>
  Boolean(
    hint &&
    hint.point &&
    typeof hint.point.lat === 'number' &&
    typeof hint.point.lng === 'number',
  )

const MapFocusHandler = ({
  center,
  focusedCitizenId,
  citizens
}: {
  center: [number, number],
  focusedCitizenId?: string,
  citizens?: SuspectProfile[]
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

// Keeps Leaflet layout consistent when the tab visibility changes.
const MapResizeHandler = ({ isActive }: { isActive: boolean }) => {
  const map = useMap()

  useEffect(() => {
    if (!isActive) return
    const frame = requestAnimationFrame(() => map.invalidateSize())
    return () => cancelAnimationFrame(frame)
  }, [isActive, map])

  useEffect(() => {
    if (!isActive) return
    const handleResize = () => map.invalidateSize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isActive, map])

  return null
}

export const InvestigationMap = ({
  victim,
  suspects,
  clues,
  highlightedClueId,
  hideoutHint,
  accompliceIds,
}: InvestigationMapProps) => {
  const [activeSuspectId, setActiveSuspectId] = useState<string | undefined>(undefined)
  const [guessResult, setGuessResult] = useState<{ success: boolean; distance: number } | null>(null)
  const focusedCitizenId = useGameStore((state) => state.focusedCitizenId)
  const setFocusedCitizenId = useGameStore((state) => state.setFocusedCitizenId)
  const shortlistedIds = useGameStore((state) => state.shortlistedSuspectIds)
  const toggleShortlist = useGameStore((state) => state.toggleShortlist)
  const phase = useGameStore((state) => state.phase)
  const activeTab = useGameStore((state) => state.activeTab)

  const center: [number, number] = useMemo(
    () => (victim ? [victim.lastKnownLocation.lat, victim.lastKnownLocation.lng] : defaultCenter),
    [victim],
  )

  const displayedCitizens = useMemo(() => suspects ?? [], [suspects])
  const accompliceCount = accompliceIds?.length ?? 0
  const accomplicesLocked = accompliceCount > 0 && accompliceIds?.every((id) => shortlistedIds.includes(id))
  const capturedAccomplices = accompliceIds?.filter((id) => shortlistedIds.includes(id)).length ?? 0
  const activeSuspect = useMemo(
    () => suspects?.find((suspect) => suspect.id === (activeSuspectId ?? focusedCitizenId)),
    [suspects, activeSuspectId, focusedCitizenId],
  )
  const handleHideoutGuess = (point: GeoPoint) => {
    if (!hideoutHint) return
    const distance = metersBetween(point, hideoutHint.point)
    const success = distance <= CAPTURE_RADIUS_METERS
    setGuessResult({ success, distance })
  }

  return (
    <section className="panel map-panel">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h2>Bản đồ điều tra</h2>
          <span style={{ fontSize: '0.8rem', color: '#666' }}>
            50 tín hiệu nghi vấn đang trùng lặp. Người chơi phải tự đối chiếu lời khai với tọa độ thực địa.
          </span>
        </div>
        {accompliceCount > 0 && (
          <div style={{ fontSize: '0.8rem', color: '#facc15', fontFamily: 'Courier New' }}>
            Đồng phạm đã khoanh vùng: {capturedAccomplices}/{accompliceCount}
          </div>
        )}
      </div>
      {phase === 'accusing' && hideoutHint ? (
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.3rem 0 0.6rem 0' }}>
          Giai đoạn buộc tội: nhấn bất kỳ vị trí nào trên bản đồ để chỉ điểm nơi hung thủ đang ẩn náu. Nếu sai lệch không quá {CAPTURE_RADIUS_METERS / 1000}km, hệ thống sẽ cho phép tiến hành bắt giữ.
        </p>
      ) : null}
      {guessResult ? (
        <div
          style={{
            marginBottom: '0.6rem',
            padding: '0.5rem 0.8rem',
            borderRadius: '4px',
            background: guessResult.success ? '#064e3b' : '#3f1d1d',
            color: '#f8fafc',
            fontSize: '0.85rem',
          }}
        >
          {guessResult.success
            ? `Chuẩn! Bạn đã khoá mục tiêu trong bán kính ${(guessResult.distance / 1000).toFixed(2)}km. Tiến hành bắt giữ ngay!`
            : `Sai lệch ${(guessResult.distance / 1000).toFixed(2)}km. Đối chiếu lại lời khai và thử lại.`}
        </div>
      ) : null}
      <MapContainer center={center} zoom={11} scrollWheelZoom className="map-shell">
        <MapResizeHandler isActive={activeTab === 'map'} />
        <MapFocusHandler center={center} focusedCitizenId={focusedCitizenId} citizens={suspects} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {hideoutHint ? (
          <PlayerGuessHandler enabled={phase === 'accusing'} onGuess={handleHideoutGuess} />
        ) : null}
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
          const isShortlisted = shortlistedIds.includes(citizen.id)
          const isActive = activeSuspect?.id === citizen.id
          const color = isActive ? '#f97316' : isShortlisted ? '#facc15' : '#475569'
          const radius = isActive ? 9 : isShortlisted ? 7 : 5

          return (
            <CircleMarker
              key={citizen.id}
              center={[citizen.coordinates.lat, citizen.coordinates.lng]}
              radius={radius}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.75 }}
              eventHandlers={{
                click: () => {
                  setActiveSuspectId(citizen.id)
                  setFocusedCitizenId(citizen.id)
                },
              }}
            >
              <Popup>
                <strong>{citizen.fullName}</strong>
                <p>{citizen.residence}</p>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Nhấn để đọc lời khai chi tiết</p>
              </Popup>
            </CircleMarker>
          )
        })}
        {clues?.flatMap((clue) => {
          const hints = Array.isArray(clue.mapHints) ? clue.mapHints : []
          return hints
            .filter(isValidHint)
            .map((hint) => (
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
            ))
        })}
        {activeSuspect && isValidHint(activeSuspect.testimony.mapHint) ? (
          <Circle
            key={`focus-${activeSuspect.id}`}
            center={[activeSuspect.testimony.mapHint.point.lat, activeSuspect.testimony.mapHint.point.lng]}
            radius={activeSuspect.testimony.mapHint.radiusMeters}
            pathOptions={{
              color: '#f97316',
              weight: 2,
              dashArray: '4 4',
              fillOpacity: 0.08,
            }}
          />
        ) : null}
        {accomplicesLocked && hideoutHint ? (
          <Circle
            key={`hideout-${hideoutHint.id}`}
            center={[hideoutHint.point.lat, hideoutHint.point.lng]}
            radius={hideoutHint.radiusMeters}
            pathOptions={{ color: '#22c55e', weight: 2, fillOpacity: 0.12 }}
          >
            <Popup>
              <strong>Tọa độ ẩn náu đã giải mã</strong>
              <p>{hideoutHint.label}</p>
            </Popup>
          </Circle>
        ) : null}
      </MapContainer>
      {activeSuspect ? (
        <div className="map-detail-drawer" style={{ marginTop: '1rem', background: '#0f172a', color: '#e2e8f0', padding: '1rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0 }}>{activeSuspect.fullName}</h3>
              <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: '#94a3b8' }}>{activeSuspect.occupation}</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#eab308' }}>Lời khai chính ({activeSuspect.testimony.timeframe})</p>
            </div>
            <button
              onClick={() => {
                setActiveSuspectId(undefined)
                setFocusedCitizenId(undefined)
              }}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              ×
            </button>
          </div>
          <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', lineHeight: 1.5 }}>{activeSuspect.testimony.narrative}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            <span>Quan hệ: {activeSuspect.testimony.relationshipSummary}</span>
            <span>Địa điểm: {activeSuspect.testimony.locationLabel}</span>
            <span>Tín nhiệm: {activeSuspect.testimony.reliability === 'solid' ? 'Ổn định' : 'Mâu thuẫn'}</span>
          </div>
          {accomplicesLocked && activeSuspect.secondaryTestimony ? (
            <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '4px', background: '#052e16', border: '1px dashed #16a34a' }}>
              <strong>Lời khai 2 (Đồng phạm):</strong>
              <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.9rem' }}>{activeSuspect.secondaryTestimony.narrative}</p>
            </div>
          ) : null}
          {phase === 'investigating' ? (
            <button
              onClick={() => toggleShortlist(activeSuspect.id)}
              style={{
                marginTop: '1rem',
                padding: '0.6rem 1.2rem',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                background: shortlistedIds.includes(activeSuspect.id) ? '#ef4444' : '#3b82f6',
                color: '#fff',
                fontWeight: 'bold',
              }}
            >
              {shortlistedIds.includes(activeSuspect.id) ? 'Bỏ khỏi danh sách tình nghi' : 'Đưa vào danh sách tình nghi'}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
