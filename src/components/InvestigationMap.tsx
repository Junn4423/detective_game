import { useMemo, useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { Clue, GeoPoint, Landmark, MapHint, SuspectProfile, VictimProfile } from '@/types/game'
import { useGameStore } from '@/store/gameStore'

interface InvestigationMapProps {
  victim?: VictimProfile
  suspects?: SuspectProfile[]
  clues?: Clue[]
  highlightedClueId?: string
  hideoutHint?: MapHint
  accompliceIds?: string[]
  landmarks?: Landmark[]
}

const defaultCenter: [number, number] = [21.0278, 105.8342]

const iconAssets = {
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
}

L.Icon.Default.mergeOptions(iconAssets)

const CAPTURE_RADIUS_METERS = 2000

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
  landmarks,
}: InvestigationMapProps) => {
  const [activeSuspectId, setActiveSuspectId] = useState<string | undefined>(undefined)
  const focusedCitizenId = useGameStore((state) => state.focusedCitizenId)
  const setFocusedCitizenId = useGameStore((state) => state.setFocusedCitizenId)
  const shortlistedIds = useGameStore((state) => state.shortlistedSuspectIds)
  const toggleShortlist = useGameStore((state) => state.toggleShortlist)
  const phase = useGameStore((state) => state.phase)
  const activeTab = useGameStore((state) => state.activeTab)
  const accompliceFound = useGameStore((state) => state.accompliceFound)
  
  // Capturing phase state
  const attemptCapture = useGameStore((state) => state.attemptCapture)
  const confirmCapture = useGameStore((state) => state.confirmCapture)
  const captureAttemptPoint = useGameStore((state) => state.captureAttemptPoint)
  const captureDistance = useGameStore((state) => state.captureDistance)
  const captureSuccess = useGameStore((state) => state.captureSuccess)
  const lockedSuspectId = useGameStore((state) => state.lockedSuspectId)
  const caseBundle = useGameStore((state) => state.caseBundle)

  const center: [number, number] = useMemo(
    () => (victim ? [victim.lastKnownLocation.lat, victim.lastKnownLocation.lng] : defaultCenter),
    [victim],
  )

  const displayedCitizens = useMemo(() => suspects ?? [], [suspects])
  const accompliceCount = accompliceIds?.length ?? 0
  const accompliceShortlistProgress = accompliceIds?.filter((id) => shortlistedIds.includes(id)).length ?? 0
  const hideoutUnlocked = accompliceFound || (accompliceCount > 0 && accompliceIds?.every((id) => shortlistedIds.includes(id)))
  const accompliceStatusLabel = accompliceFound
    ? 'Đồng phạm đã khai tọa độ'
    : `Đồng phạm đã khoanh vùng: ${accompliceShortlistProgress}/${accompliceCount}`
  const activeSuspect = useMemo(
    () => suspects?.find((suspect) => suspect.id === (activeSuspectId ?? focusedCitizenId)),
    [suspects, activeSuspectId, focusedCitizenId],
  )
  
  // Handler for capturing phase
  const handleCaptureClick = (point: GeoPoint) => {
    if (phase !== 'capturing') return
    attemptCapture(point)
  }

  // Get killer info for capturing phase
  const lockedKiller = lockedSuspectId ? caseBundle?.suspects.find(s => s.id === lockedSuspectId) : null

  return (
    <section className="panel map-panel">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h2>{phase === 'capturing' ? '🎯 VÂY BẮT HUNG THỦ' : 'Bản đồ điều tra'}</h2>
          <span style={{ fontSize: '0.8rem', color: phase === 'capturing' ? '#f97316' : '#666' }}>
            {phase === 'capturing' 
              ? 'Chọn vị trí trên bản đồ để triển khai lực lượng vây bắt'
              : '50 tín hiệu nghi vấn đang trùng lặp. Người chơi phải tự đối chiếu lời khai với tọa độ thực địa.'}
          </span>
        </div>
        {accompliceCount > 0 && phase !== 'capturing' && (
          <div style={{ fontSize: '0.8rem', color: '#facc15', fontFamily: 'Courier New' }}>
            {accompliceStatusLabel}
          </div>
        )}
      </div>
      
      {/* Capturing Phase UI */}
      {phase === 'capturing' && (
        <div style={{ 
          margin: '0.5rem 0', 
          padding: '1rem', 
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', 
          borderRadius: '8px',
          border: '2px solid #f97316',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '50%', 
              overflow: 'hidden',
              border: '3px solid #ef4444',
            }}>
              {lockedKiller && <img src={lockedKiller.portrait} alt={lockedKiller.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>HUNG THỦ ĐÃ XÁC ĐỊNH</p>
              <h3 style={{ margin: '0.2rem 0', color: '#ef4444', fontSize: '1.2rem' }}>{lockedKiller?.fullName ?? 'Không xác định'}</h3>
            </div>
          </div>
          
          <p style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.5, margin: '0 0 0.75rem 0' }}>
            📍 <strong>Nhấp vào bản đồ</strong> để chọn vị trí triển khai lực lượng vây bắt.
            {hideoutUnlocked && hideoutHint && (
              <span style={{ color: '#22c55e' }}> Đồng phạm đã khai: khu vực <strong>{hideoutHint.label}</strong></span>
            )}
          </p>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
            ⚠️ Bán kính chấp nhận: <strong style={{ color: '#facc15' }}>{CAPTURE_RADIUS_METERS / 1000}km</strong>. 
            Nếu sai lệch quá xa, hung thủ sẽ trốn thoát!
          </p>
        </div>
      )}
      
      {/* Capture Result */}
      {phase === 'capturing' && captureAttemptPoint && captureDistance !== undefined && (
        <div
          style={{
            margin: '0.5rem 0',
            padding: '1rem',
            borderRadius: '8px',
            background: captureSuccess ? 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)' : 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)',
            border: captureSuccess ? '2px solid #22c55e' : '2px solid #ef4444',
            color: '#f8fafc',
          }}
        >
          <h4 style={{ margin: '0 0 0.5rem 0', color: captureSuccess ? '#22c55e' : '#ef4444' }}>
            {captureSuccess ? '✅ VỊ TRÍ HỢP LỆ!' : '❌ SAI LỆCH QUÁ XA!'}
          </h4>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
            Khoảng cách: <strong>{(captureDistance / 1000).toFixed(2)}km</strong>
            {captureSuccess 
              ? ' - Trong phạm vi bắt giữ!' 
              : ` - Cần trong ${CAPTURE_RADIUS_METERS / 1000}km`}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button
              onClick={confirmCapture}
              style={{
                padding: '0.6rem 1.2rem',
                background: captureSuccess ? '#22c55e' : '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.9rem',
              }}
            >
              {captureSuccess ? '🚔 TIẾN HÀNH BẮT GIỮ' : '💨 HUNG THỦ TRỐN THOÁT'}
            </button>
            {!captureSuccess && (
              <button
                onClick={() => attemptCapture({ lat: 0, lng: 0 })} // Reset - will be handled by clicking map again
                style={{
                  padding: '0.6rem 1.2rem',
                  background: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid #94a3b8',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                }}
              >
                Chọn lại vị trí
              </button>
            )}
          </div>
        </div>
      )}
      
      <MapContainer center={center} zoom={11} scrollWheelZoom className="map-shell">
        <MapResizeHandler isActive={activeTab === 'map'} />
        <MapFocusHandler center={center} focusedCitizenId={focusedCitizenId} citizens={suspects} />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
          maxZoom={19}
        />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        {/* Capturing phase click handler */}
        <PlayerGuessHandler enabled={phase === 'capturing'} onGuess={handleCaptureClick} />
        
        {/* Player's capture attempt marker */}
        {phase === 'capturing' && captureAttemptPoint && captureAttemptPoint.lat !== 0 && (
          <CircleMarker
            center={[captureAttemptPoint.lat, captureAttemptPoint.lng]}
            radius={12}
            pathOptions={{ 
              color: captureSuccess ? '#22c55e' : '#ef4444', 
              fillColor: captureSuccess ? '#22c55e' : '#ef4444', 
              fillOpacity: 0.5,
              weight: 3,
            }}
          >
            <Popup>
              <strong>Điểm vây bắt</strong>
              <p>Khoảng cách: {((captureDistance ?? 0) / 1000).toFixed(2)}km</p>
            </Popup>
          </CircleMarker>
        )}
        
        {/* Capture radius visualization */}
        {phase === 'capturing' && captureAttemptPoint && captureAttemptPoint.lat !== 0 && (
          <Circle
            center={[captureAttemptPoint.lat, captureAttemptPoint.lng]}
            radius={CAPTURE_RADIUS_METERS}
            pathOptions={{ 
              color: captureSuccess ? '#22c55e' : '#ef4444', 
              fillOpacity: 0.1,
              dashArray: '10 5',
            }}
          />
        )}
        
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
        {landmarks?.map((landmark) => (
          <CircleMarker
            key={landmark.id}
            center={[landmark.coordinates.lat, landmark.coordinates.lng]}
            radius={7}
            pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.6 }}
          >
            <Popup>
              <strong>Landmark</strong>
              <p>{landmark.label}</p>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                ({landmark.coordinates.lat.toFixed(4)}, {landmark.coordinates.lng.toFixed(4)})
              </p>
            </Popup>
          </CircleMarker>
        ))}
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
        {hideoutUnlocked && hideoutHint ? (
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
          {hideoutUnlocked && activeSuspect.secondaryTestimony ? (
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
