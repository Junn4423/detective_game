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
  caseReplayVersion: number
  focusedCitizenId?: string
  activeTab: 'map' | 'suspects'
  captureOutcome?: 'captured' | 'partial' | 'failed'
  hasActivatedCase: boolean
  activeCaseCode?: string
  archivedCaseCode?: string
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
  setActiveCaseCode: (code?: string) => void
  setArchivedCaseCode: (code?: string) => void
  restartCurrentCase: () => void
  startNewCase: () => void
  loadArchivedCase: (code: string) => void
}

export const useGameStore = create<GameState>((set) => ({
  citizens: [],
  phase: 'idle',
  caseSeed: Date.now(),
  caseReplayVersion: 0,
  shortlistedSuspectIds: [],
  activeTab: 'map',
  captureOutcome: undefined,
  hasActivatedCase: false,
  activeCaseCode: undefined,
  archivedCaseCode: undefined,
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
  setActiveCaseCode: (code) => set({ activeCaseCode: code }),
  setArchivedCaseCode: (code) => set({ archivedCaseCode: code }),
  restartCurrentCase: () =>
    set((state) => {
      if (!state.archivedCaseCode) {
        return {}
      }
      return {
        phase: 'loading',
        lockedSuspectId: undefined,
        shortlistedSuspectIds: [],
        highlightedClueId: undefined,
        focusedCitizenId: undefined,
        error: undefined,
        captureOutcome: undefined,
        caseReplayVersion: state.caseReplayVersion + 1,
        // Preserve case codes for replay
      }
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
      caseReplayVersion: 0,
      captureOutcome: undefined,
      hasActivatedCase: true,
      activeCaseCode: undefined,
      archivedCaseCode: undefined,
    }),
  loadArchivedCase: (code) =>
    set((state) => ({
      phase: 'loading',
      caseBundle: undefined,
      lockedSuspectId: undefined,
      shortlistedSuspectIds: [],
      highlightedClueId: undefined,
      focusedCitizenId: undefined,
      error: undefined,
      captureOutcome: undefined,
      caseReplayVersion: Math.max(1, state.caseReplayVersion + 1),
      hasActivatedCase: true,
      archivedCaseCode: code,
      activeCaseCode: code,
    })),
}))
