import type { CaseClueBundle } from '@/types/game'

interface CaseBoardProps {
  bundle?: CaseClueBundle
}

export const CaseBoard = ({ bundle }: CaseBoardProps) => {
  if (!bundle) {
    return (
      <section className="panel">
        <h2>Case Board</h2>
        <p>Đang dựng hồ sơ nghi phạm...</p>
      </section>
    )
  }

  return (
    <section className="panel case-board-panel">
      <div className="panel-header">
        <h2>Case Board</h2>
        <span>#{bundle.victim.victimId}</span>
      </div>
      <div className="stats-grid">
        <article>
          <p>Victim</p>
          <h3>{bundle.victim.fullName}</h3>
        </article>
        <article>
          <p>Suspects</p>
          <h3>{bundle.suspects.length}</h3>
        </article>
        <article>
          <p>Leads</p>
          <h3>{bundle.clueDrafts.length}</h3>
        </article>
        <article>
          <p>Location</p>
          <h3>{bundle.locationName}</h3>
        </article>
      </div>
      {bundle.landmarks.length ? (
        <div className="landmark-list" style={{ marginTop: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.5rem' }}>
            ĐỊA ĐIỂM CHỦ CHỐT
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.4rem' }}>
            {bundle.landmarks.map((landmark) => (
              <li
                key={landmark.id}
                style={{
                  padding: '0.55rem 0.75rem',
                  background: '#0f172a',
                  borderRadius: '6px',
                  border: '1px solid #1e293b',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.15rem',
                }}
              >
                <strong style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>{landmark.label}</strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  ({landmark.coordinates.lat.toFixed(4)}, {landmark.coordinates.lng.toFixed(4)})
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
