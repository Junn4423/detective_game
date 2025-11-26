import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { assembleCaseBundle } from '@/services/caseEngine'
import { enrichBundleWithClues } from '@/services/geminiService'
import { useGameStore } from '@/store/gameStore'

export const useDetectiveCase = () => {
  const citizens = useGameStore((state) => state.citizens)
  const caseSeed = useGameStore((state) => state.caseSeed)
  const setCaseBundle = useGameStore((state) => state.setCaseBundle)
  const setPhase = useGameStore((state) => state.setPhase)
  const setError = useGameStore((state) => state.setError)

  const assemblyQuery = useQuery({
    queryKey: ['case-bundle', citizens.map((citizen) => citizen.id), caseSeed],
    queryFn: () => assembleCaseBundle(citizens, caseSeed),
    enabled: citizens.length >= 12,
    staleTime: Infinity,
  })

  const clueQuery = useQuery({
    queryKey: ['clues', assemblyQuery.data?.victim.id],
    queryFn: () => enrichBundleWithClues(assemblyQuery.data!),
    enabled: Boolean(assemblyQuery.data),
  })

  useEffect(() => {
    if (assemblyQuery.isPending || clueQuery.isPending) {
      setPhase('loading')
    }
  }, [assemblyQuery.isPending, clueQuery.isPending, setPhase])

  useEffect(() => {
    if (clueQuery.data) {
      setCaseBundle(clueQuery.data)
      setPhase('investigating')
      setError(undefined)
    } else if (assemblyQuery.data) {
      setCaseBundle(assemblyQuery.data)
    }
  }, [assemblyQuery.data, clueQuery.data, setCaseBundle, setError, setPhase])

  useEffect(() => {
    if (assemblyQuery.error || clueQuery.error) {
      setError('Không thể tạo hồ sơ vụ án. Kiểm tra khóa Gemini hoặc thử lại.')
    }
  }, [assemblyQuery.error, clueQuery.error, setError])

  return { assemblyQuery, clueQuery }
}
