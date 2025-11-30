import { create } from 'zustand'
import type { CaseClueBundle, CasePhase, CitizenProfile, SuspectDialogue, SuspectProfile } from '@/types/game'
import { generatePhase2Data } from '@/services/geminiService'

const MAX_ACCOMPLICE_GUESSES = 3

import type { GeoPoint } from '@/types/game'

const CAPTURE_RADIUS_METERS = 2000

const metersBetween = (a: GeoPoint, b: GeoPoint) => {
  const R = 6371e3
  const phi1 = (a.lat * Math.PI) / 180
  const phi2 = (b.lat * Math.PI) / 180
  const deltaPhi = ((b.lat - a.lat) * Math.PI) / 180
  const deltaLambda = ((b.lng - a.lng) * Math.PI) / 180

  const sinDeltaPhi = Math.sin(deltaPhi / 2)
  const sinDeltaLambda = Math.sin(deltaLambda / 2)
  const aVal = sinDeltaPhi * sinDeltaPhi + Math.cos(phi1) * Math.cos(phi2) * sinDeltaLambda * sinDeltaLambda
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal))
  return R * c
}

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
  failFastMessage?: string
  phaseTwoLoading: boolean
  dialogueBySuspectId: Record<string, SuspectDialogue>
  accompliceFound: boolean
  identifiedAccompliceId?: string
  accompliceAttempts: number
  accompliceFeedback?: string
  accompliceFeedbackTargetId?: string
  // Capturing phase state
  captureAttemptPoint?: GeoPoint
  captureDistance?: number
  captureSuccess?: boolean
  setCitizens: (citizens: CitizenProfile[]) => void
  setCaseBundle: (bundle: CaseClueBundle) => void
  setPhase: (phase: CasePhase) => void
  setActiveTab: (tab: 'map' | 'suspects') => void
  toggleShortlist: (suspectId: string) => void
  confirmShortlist: () => Promise<void>
  accuseSuspect: (suspectId: string) => void
  highlightClue: (clueId?: string) => void
  setError: (message?: string) => void
  setFocusedCitizenId: (id?: string) => void
  setActiveCaseCode: (code?: string) => void
  setArchivedCaseCode: (code?: string) => void
  restartCurrentCase: () => void
  startNewCase: () => void
  loadArchivedCase: (code: string) => void
  returnToMenu: () => void
  identifyAccomplice: (suspectId: string) => void
  // Capturing phase actions
  startCapturing: () => void
  attemptCapture: (point: GeoPoint) => void
  confirmCapture: () => void
}

const patchDialoguesIntoBundle = (
  bundle: CaseClueBundle,
  dialogues: Record<string, SuspectDialogue>,
): CaseClueBundle => {
  const patchProfile = (profile: SuspectProfile): SuspectProfile =>
    dialogues[profile.id]
      ? {
          ...profile,
          dialogue: dialogues[profile.id],
        }
      : profile

  return {
    ...bundle,
    suspects: bundle.suspects.map(patchProfile),
    killer: patchProfile(bundle.killer),
  }
}

export const useGameStore = create<GameState>((set, get) => ({
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
  failFastMessage: undefined,
  phaseTwoLoading: false,
  // Capturing state
  captureAttemptPoint: undefined,
  captureDistance: undefined,
  captureSuccess: undefined,
  dialogueBySuspectId: {},
  accompliceFound: false,
  identifiedAccompliceId: undefined,
  accompliceAttempts: 0,
  accompliceFeedback: undefined,
  accompliceFeedbackTargetId: undefined,
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
  confirmShortlist: async () => {
    const state = get()
    if (!state.caseBundle || state.shortlistedSuspectIds.length < 10) {
      return
    }

    const killerId = state.caseBundle.killer.id
    const killerContained = state.shortlistedSuspectIds.includes(killerId)

    if (!killerContained) {
      set({
        phase: 'GAME_OVER_MISSING_KILLER',
        failFastMessage: 'Bạn đã để sổng hung thủ ngay từ vòng sơ loại. Vụ án đi vào ngõ cụt.',
        captureOutcome: 'failed',
      })
      return
    }

    set({
      phase: 'accusing',
      phaseTwoLoading: true,
      failFastMessage: undefined,
      accompliceFeedback: undefined,
      accompliceAttempts: 0,
      accompliceFeedbackTargetId: undefined,
    })

    try {
      const shortlist = state.caseBundle.suspects.filter((suspect) => state.shortlistedSuspectIds.includes(suspect.id))
      const dialogues = await generatePhase2Data({
        suspects: shortlist,
        killerId,
        accompliceIds: state.caseBundle.accompliceIds,
        locationName: state.caseBundle.locationName,
        hideoutLabel: state.caseBundle.hideoutHint.label,
        victim: state.caseBundle.victim,
      })

      set((current) => {
        if (!current.caseBundle) {
          return {
            phaseTwoLoading: false,
            dialogueBySuspectId: { ...current.dialogueBySuspectId },
          }
        }
        const mergedDialogues = { ...current.dialogueBySuspectId, ...dialogues }
        return {
          caseBundle: patchDialoguesIntoBundle(current.caseBundle, mergedDialogues),
          dialogueBySuspectId: mergedDialogues,
          phaseTwoLoading: false,
        }
      })
    } catch (error) {
      console.error('Failed to generate Phase 2 dialogue', error)
      set({
        phaseTwoLoading: false,
        error: 'Không dựng được hội thoại nghi phạm. Kiểm tra khóa Gemini và thử lại.',
      })
    }
  },
  accuseSuspect: (suspectId) =>
    set((state) => {
      const solved = state.caseBundle?.killer.id === suspectId
      if (solved) {
        // Chuyển sang phase capturing để chọn vị trí vây bắt
        return {
          lockedSuspectId: suspectId,
          phase: 'capturing',
          activeTab: 'map', // Chuyển sang tab bản đồ
          captureAttemptPoint: undefined,
          captureDistance: undefined,
          captureSuccess: undefined,
        }
      } else {
        // Bắt nhầm người
        return {
          lockedSuspectId: suspectId,
          phase: 'accusing',
          captureOutcome: 'failed',
        }
      }
    }),
  startCapturing: () =>
    set({
      phase: 'capturing',
      activeTab: 'map',
      captureAttemptPoint: undefined,
      captureDistance: undefined,
      captureSuccess: undefined,
    }),
  attemptCapture: (point) =>
    set((state) => {
      if (!state.caseBundle?.hideoutHint) return {}
      const hideout = state.caseBundle.hideoutHint.point
      const distance = metersBetween(point, hideout)
      const success = distance <= CAPTURE_RADIUS_METERS
      return {
        captureAttemptPoint: point,
        captureDistance: distance,
        captureSuccess: success,
      }
    }),
  confirmCapture: () =>
    set((state) => {
      if (state.captureSuccess === undefined) return {}
      const accompliceSecured = state.accompliceFound && state.identifiedAccompliceId
      if (state.captureSuccess) {
        return {
          phase: 'solved',
          captureOutcome: accompliceSecured ? 'captured' : 'partial',
        }
      } else {
        return {
          phase: 'solved',
          captureOutcome: 'partial', // Xác định đúng hung thủ nhưng không bắt được
        }
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
        failFastMessage: undefined,
        phaseTwoLoading: false,
        dialogueBySuspectId: {},
        accompliceFound: false,
        identifiedAccompliceId: undefined,
        accompliceAttempts: 0,
        accompliceFeedback: undefined,
        accompliceFeedbackTargetId: undefined,
        captureAttemptPoint: undefined,
        captureDistance: undefined,
        captureSuccess: undefined,
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
      failFastMessage: undefined,
      phaseTwoLoading: false,
      dialogueBySuspectId: {},
      accompliceFound: false,
      identifiedAccompliceId: undefined,
      accompliceAttempts: 0,
      accompliceFeedback: undefined,
      accompliceFeedbackTargetId: undefined,
      captureAttemptPoint: undefined,
      captureDistance: undefined,
      captureSuccess: undefined,
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
      failFastMessage: undefined,
      phaseTwoLoading: false,
      dialogueBySuspectId: {},
      accompliceFound: false,
      identifiedAccompliceId: undefined,
      accompliceAttempts: 0,
      accompliceFeedback: undefined,
      accompliceFeedbackTargetId: undefined,
      captureAttemptPoint: undefined,
      captureDistance: undefined,
      captureSuccess: undefined,
    })),
  returnToMenu: () =>
    set({
      citizens: [],
      caseBundle: undefined,
      phase: 'idle',
      lockedSuspectId: undefined,
      shortlistedSuspectIds: [],
      highlightedClueId: undefined,
      error: undefined,
      caseSeed: Date.now(),
      caseReplayVersion: 0,
      focusedCitizenId: undefined,
      activeTab: 'map',
      captureOutcome: undefined,
      hasActivatedCase: false,
      activeCaseCode: undefined,
      archivedCaseCode: undefined,
      failFastMessage: undefined,
      phaseTwoLoading: false,
      dialogueBySuspectId: {},
      accompliceFound: false,
      identifiedAccompliceId: undefined,
      accompliceAttempts: 0,
      accompliceFeedback: undefined,
      accompliceFeedbackTargetId: undefined,
      captureAttemptPoint: undefined,
      captureDistance: undefined,
      captureSuccess: undefined,
    }),
  identifyAccomplice: (suspectId) =>
    set((state) => {
      if (!state.caseBundle || state.phase !== 'accusing' || state.accompliceFound) {
        return {}
      }

      const nextAttempts = state.accompliceAttempts + 1
      const isAccomplice = state.caseBundle.accompliceIds.includes(suspectId)
      if (isAccomplice) {
        return {
          accompliceFound: true,
          identifiedAccompliceId: suspectId,
          accompliceFeedback: 'Đồng phạm suy sụp và buộc phải khai vị trí ẩn náu của hung thủ.',
          accompliceAttempts: nextAttempts,
          accompliceFeedbackTargetId: suspectId,
        }
      }

      const lockout = nextAttempts >= MAX_ACCOMPLICE_GUESSES
      return {
        accompliceAttempts: nextAttempts,
        accompliceFeedback: lockout
          ? 'Anh vu khống tôi à? Tôi sẽ không nói thêm bất kỳ điều gì nữa.'
          : 'Anh vu khống tôi à? Tôi đã nói hết những gì mình biết.',
          accompliceFeedbackTargetId: suspectId,
      }
    }),
}))
