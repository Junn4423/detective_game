import { create } from 'zustand'
import type { CaseClueBundle, CasePhase, CitizenProfile } from '@/types/game'

interface GameState {
  citizens: CitizenProfile[]
  caseBundle?: CaseClueBundle
  phase: CasePhase
  lockedSuspectId?: string
  highlightedClueId?: string
  error?: string
  setCitizens: (citizens: CitizenProfile[]) => void
  setCaseBundle: (bundle: CaseClueBundle) => void
  setPhase: (phase: CasePhase) => void
  lockSuspect: (suspectId: string) => void
  highlightClue: (clueId?: string) => void
  setError: (message?: string) => void
}

export const useGameStore = create<GameState>((set) => ({
  citizens: [],
  phase: 'idle',
  setCitizens: (citizens) => set({ citizens }),
  setCaseBundle: (bundle) => set({ caseBundle: bundle }),
  setPhase: (phase) => set({ phase }),
  lockSuspect: (suspectId) =>
    set((state) => {
      const solved = state.caseBundle?.killer.id === suspectId
      return {
        lockedSuspectId: suspectId,
        phase: solved ? 'solved' : 'accusing',
      }
    }),
  highlightClue: (clueId) =>
    set((state) => ({
      highlightedClueId: state.highlightedClueId === clueId ? undefined : clueId,
    })),
  setError: (message) => set({ error: message }),
}))
