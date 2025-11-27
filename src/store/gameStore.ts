import { create } from 'zustand'
import type { CaseClueBundle, CasePhase, CitizenProfile } from '@/types/game'

interface GameState {
  citizens: CitizenProfile[]
  caseBundle?: CaseClueBundle
  phase: CasePhase
  lockedSuspectId?: string
  shortlistedSuspectIds: string[]
  highlightedClueId?: string
  error?: string
  caseSeed: number
  focusedCitizenId?: string
  activeTab: 'map' | 'suspects'
  captureOutcome?: 'captured' | 'partial' | 'failed'
  hasActivatedCase: boolean
  setCitizens: (citizens: CitizenProfile[]) => void
  setCaseBundle: (bundle: CaseClueBundle) => void
  setPhase: (phase: CasePhase) => void
  setActiveTab: (tab: 'map' | 'suspects') => void
  toggleShortlist: (suspectId: string) => void
  confirmShortlist: () => void
  accuseSuspect: (suspectId: string) => void
  highlightClue: (clueId?: string) => void
  setError: (message?: string) => void
  setFocusedCitizenId: (id?: string) => void
  restartCurrentCase: () => void
  startNewCase: () => void
}

export const useGameStore = create<GameState>((set) => ({
  citizens: [],
  phase: 'idle',
  caseSeed: Date.now(),
  shortlistedSuspectIds: [],
  activeTab: 'map',
  captureOutcome: undefined,
  hasActivatedCase: false,
  setCitizens: (citizens) => set({ citizens }),
  setCaseBundle: (bundle) => set({ caseBundle: bundle }),
  setPhase: (phase) => set({ phase }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setFocusedCitizenId: (id) => set({ focusedCitizenId: id }),
  toggleShortlist: (suspectId) =>
    set((state) => {
      if (state.shortlistedSuspectIds.includes(suspectId)) {
        return { shortlistedSuspectIds: state.shortlistedSuspectIds.filter((id) => id !== suspectId) }
      }
      if (state.shortlistedSuspectIds.length >= 10) {
        return {} // Max 10
      }
      return { shortlistedSuspectIds: [...state.shortlistedSuspectIds, suspectId] }
    }),
  confirmShortlist: () => set({ phase: 'accusing' }),
  accuseSuspect: (suspectId) =>
    set((state) => {
      const solved = state.caseBundle?.killer.id === suspectId
      const allAccomplicesFound = state.caseBundle?.accompliceIds.every((id) =>
        state.shortlistedSuspectIds.includes(id),
      ) ?? false
      let captureOutcome: GameState['captureOutcome']
      if (solved) {
        captureOutcome = allAccomplicesFound ? 'captured' : 'partial'
      } else if (state.caseBundle) {
        captureOutcome = 'failed'
      }
      return {
        lockedSuspectId: suspectId,
        phase: solved ? 'solved' : 'accusing',
        captureOutcome,
      }
    }),
  highlightClue: (clueId) =>
    set((state) => ({
      highlightedClueId: state.highlightedClueId === clueId ? undefined : clueId,
    })),
  setError: (message) => set({ error: message }),
  restartCurrentCase: () =>
    set({
      phase: 'loading',
      // Keep caseBundle and caseSeed
      lockedSuspectId: undefined,
      shortlistedSuspectIds: [],
      highlightedClueId: undefined,
      focusedCitizenId: undefined,
      error: undefined,
      captureOutcome: undefined,
    }),
  startNewCase: () =>
    set({
      phase: 'loading',
      caseBundle: undefined,
      lockedSuspectId: undefined,
      shortlistedSuspectIds: [],
      highlightedClueId: undefined,
      focusedCitizenId: undefined,
      error: undefined,
      caseSeed: Date.now(),
      captureOutcome: undefined,
      hasActivatedCase: true,
    }),
}))
