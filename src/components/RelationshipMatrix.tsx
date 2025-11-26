import type { RelationshipEdge } from '@/types/game'

interface RelationshipMatrixProps {
  relationships?: RelationshipEdge[]
}

export const RelationshipMatrix = ({ relationships }: RelationshipMatrixProps) => (
  <section className="panel relationship-panel">
    <div className="panel-header">
      <h2>Mạng lưới quan hệ</h2>
      <span>{relationships?.length ?? 0} mối liên hệ</span>
    </div>
    <div className="relationship-list">
      {(relationships ?? []).slice(0, 12).map((edge) => (
        <article key={`${edge.sourceId}-${edge.targetId}`}>
          <p>
            <strong>{edge.relationship}</strong>
          </p>
          <p>{edge.description}</p>
        </article>
      ))}
    </div>
  </section>
)
