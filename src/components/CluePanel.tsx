import type { Clue } from '@/types/game'

interface CluePanelProps {
  clues?: Clue[]
  highlightedClueId?: string
  onHighlight: (clueId: string) => void
}

export const CluePanel = ({ clues, highlightedClueId, onHighlight }: CluePanelProps) => (
  <section className="panel clue-panel">
    <div className="panel-header">
      <h2>Clues</h2>
      <span>{clues?.length ?? 0} manh mối</span>
    </div>
    <ul className="clue-list">
      {(clues ?? []).map((clue) => {
        const active = highlightedClueId === clue.id
        return (
          <li key={clue.id} className={active ? 'clue-active' : ''}>
            <button onClick={() => onHighlight(clue.id)}>
              <strong>{clue.title}</strong>
              <p>{clue.summary}</p>
              <span className={`badge badge-${clue.difficulty}`}>{clue.difficulty}</span>
            </button>
          </li>
        )
      })}
    </ul>
  </section>
)
