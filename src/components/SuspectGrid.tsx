import type { SuspectProfile } from '@/types/game'

interface SuspectGridProps {
  suspects?: SuspectProfile[]
  lockedSuspectId?: string
  onLock: (suspectId: string) => void
}

export const SuspectGrid = ({ suspects, lockedSuspectId, onLock }: SuspectGridProps) => {
  if (!suspects?.length) {
    return (
      <section className="panel">
        <h2>Suspect Lineup</h2>
        <p>Chưa có danh sách nghi phạm.</p>
      </section>
    )
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Suspect Lineup</h2>
        <span>Top {suspects.length}</span>
      </div>
      <div className="suspect-grid">
        {suspects.map((suspect) => {
          const locked = suspect.id === lockedSuspectId
          return (
            <article key={suspect.id} className={`suspect-card ${locked ? 'suspect-locked' : ''}`}>
              <img src={suspect.portrait} alt={suspect.fullName} />
              <div>
                <h3>{suspect.fullName}</h3>
                <p>{suspect.occupation}</p>
                <p>Nghi ngờ: {(suspect.suspicionLevel * 100).toFixed(0)}%</p>
                <button onClick={() => onLock(suspect.id)} disabled={locked}>
                  {locked ? 'Đã khóa' : 'Khóa nghi phạm'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
