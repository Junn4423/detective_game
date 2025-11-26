import './App.css'
import { CaseBoard } from '@/components/CaseBoard'
import { CluePanel } from '@/components/CluePanel'
import { InvestigationMap } from '@/components/InvestigationMap'
import { RelationshipMatrix } from '@/components/RelationshipMatrix'
import { StatusBanner } from '@/components/StatusBanner'
import { SuspectGrid } from '@/components/SuspectGrid'
import { VictimProfileCard } from '@/components/VictimProfile'
import { useCitizenDataset } from '@/hooks/useCitizenDataset'
import { useDetectiveCase } from '@/hooks/useDetectiveCase'
import { useGameStore } from '@/store/gameStore'

function App() {
  const { assemblyQuery, clueQuery } = useDetectiveCase()
  const citizenQuery = useCitizenDataset()
  const caseBundle = useGameStore((state) => state.caseBundle)
  const phase = useGameStore((state) => state.phase)
  const error = useGameStore((state) => state.error)
  const lockedSuspectId = useGameStore((state) => state.lockedSuspectId)
  const highlightedClueId = useGameStore((state) => state.highlightedClueId)
  const lockSuspect = useGameStore((state) => state.lockSuspect)
  const highlightClue = useGameStore((state) => state.highlightClue)

  const isLoading = citizenQuery.isPending || assemblyQuery.isPending || clueQuery.isPending

  return (
    <div className="app-shell">
      <StatusBanner phase={phase} error={error} isLoading={isLoading} />
      <main className="grid-layout">
        <CaseBoard bundle={caseBundle} />
        <VictimProfileCard victim={caseBundle?.victim} />
        <CluePanel
          clues={caseBundle?.clueDrafts}
          highlightedClueId={highlightedClueId}
          onHighlight={highlightClue}
        />
        <SuspectGrid
          suspects={caseBundle?.suspects}
          lockedSuspectId={lockedSuspectId}
          onLock={lockSuspect}
        />
        <InvestigationMap
          victim={caseBundle?.victim}
          suspects={caseBundle?.suspects}
          clues={caseBundle?.clueDrafts}
          highlightedClueId={highlightedClueId}
        />
        <RelationshipMatrix relationships={caseBundle?.relationships} />
      </main>
    </div>
  )
}

export default App
