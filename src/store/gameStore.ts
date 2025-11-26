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
      return {
        lockedSuspectId: suspectId,
        phase: solved ? 'solved' : 'accusing', // If wrong, stay in accusing or go to failed? Let's stay in accusing but show error?
        // Actually user asked for "reset if wrong", so maybe just show result
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
    }),
}))
