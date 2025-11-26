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
      </div>
    </section>
  )
}
