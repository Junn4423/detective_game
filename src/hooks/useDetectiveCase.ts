import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { assembleCaseBundle } from '@/services/caseEngine'
import { enrichBundleWithClues } from '@/services/geminiService'
import { useGameStore } from '@/store/gameStore'
import { archiveCaseBundle, fetchArchivedCaseBundle } from '@/services/caseArchiveService'
import { ensureBundleCaseTitle } from '@/utils/caseTitle'

export const useDetectiveCase = () => {
  const citizens = useGameStore((state) => state.citizens)
  const caseSeed = useGameStore((state) => state.caseSeed)
  const caseReplayVersion = useGameStore((state) => state.caseReplayVersion)
  const setCaseBundle = useGameStore((state) => state.setCaseBundle)
  const setPhase = useGameStore((state) => state.setPhase)
  const setError = useGameStore((state) => state.setError)
  const archivedCaseCode = useGameStore((state) => state.archivedCaseCode)
  const setActiveCaseCode = useGameStore((state) => state.setActiveCaseCode)
  const setArchivedCaseCode = useGameStore((state) => state.setArchivedCaseCode)
  const archivedCaseIdRef = useRef<string | undefined>(undefined)
  const isReplaying = caseReplayVersion > 0 && Boolean(archivedCaseCode)

  const archivedCaseQuery = useQuery({
    queryKey: ['archived-case', archivedCaseCode, caseReplayVersion],
    queryFn: () => fetchArchivedCaseBundle(archivedCaseCode!),
    enabled: Boolean(isReplaying && archivedCaseCode),
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const allowGeneration = !isReplaying || (archivedCaseQuery.isFetched && !archivedCaseQuery.data)
  const archiveFetching = archivedCaseQuery.isFetching

  const assemblyQuery = useQuery({
    queryKey: ['case-bundle', citizens.map((citizen) => citizen.id), caseSeed, caseReplayVersion],
    queryFn: () => assembleCaseBundle(citizens, caseSeed),
    enabled: citizens.length >= 12 && allowGeneration,
    staleTime: Infinity,
  })

  const clueQuery = useQuery({
    queryKey: ['clues', assemblyQuery.data?.victim.id, caseReplayVersion],
    queryFn: () => enrichBundleWithClues(assemblyQuery.data!),
    enabled: Boolean(assemblyQuery.data) && allowGeneration,
  })

  useEffect(() => {
    if (assemblyQuery.isPending || clueQuery.isPending || archiveFetching) {
      setPhase('loading')
    }
  }, [archiveFetching, assemblyQuery.isPending, clueQuery.isPending, setPhase])

  useEffect(() => {
    if (archivedCaseQuery.data && archivedCaseCode) {
      setCaseBundle(ensureBundleCaseTitle(archivedCaseQuery.data))
      setActiveCaseCode(archivedCaseCode)
      setPhase('investigating')
      setError(undefined)
    }
  }, [archivedCaseCode, archivedCaseQuery.data, setActiveCaseCode, setCaseBundle, setError, setPhase])

  useEffect(() => {
    if (clueQuery.data) {
      setCaseBundle(ensureBundleCaseTitle(clueQuery.data))
      setPhase('investigating')
      setError(undefined)
    } else if (assemblyQuery.data) {
      setCaseBundle(ensureBundleCaseTitle(assemblyQuery.data))
    }
  }, [assemblyQuery.data, clueQuery.data, setCaseBundle, setError, setPhase])

  useEffect(() => {
    if (!clueQuery.data) return
    const caseId = clueQuery.data.victim?.victimId ?? clueQuery.data.victim?.id
    if (!caseId || archivedCaseIdRef.current === caseId) return
    archivedCaseIdRef.current = caseId

    const persistCase = async () => {
      const caseCode = await archiveCaseBundle(clueQuery.data)
      if (caseCode) {
        setArchivedCaseCode(caseCode)
        setActiveCaseCode(caseCode)
      }
    }

    void persistCase()
  }, [clueQuery.data, setActiveCaseCode, setArchivedCaseCode])

  useEffect(() => {
    if (assemblyQuery.error || clueQuery.error || archivedCaseQuery.error) {
      setError('Không thể tạo hồ sơ vụ án. Kiểm tra khóa Gemini hoặc thử lại.')
    }
  }, [archivedCaseQuery.error, assemblyQuery.error, clueQuery.error, setError])

  return { assemblyQuery, clueQuery, archivedCaseQuery }
}
