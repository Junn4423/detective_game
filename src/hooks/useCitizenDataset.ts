import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCitizenDataset } from '@/services/randomUserService'
import { useGameStore } from '@/store/gameStore'

export const useCitizenDataset = () => {
  const setCitizens = useGameStore((state) => state.setCitizens)
  const setPhase = useGameStore((state) => state.setPhase)
  const setError = useGameStore((state) => state.setError)
  const hasActivatedCase = useGameStore((state) => state.hasActivatedCase)

  const query = useQuery({
    queryKey: ['citizens'],
    queryFn: () => fetchCitizenDataset(100),
    enabled: hasActivatedCase,
  })

  useEffect(() => {
    if (!hasActivatedCase) return
    if (query.isPending) {
      setPhase('loading')
    }
  }, [hasActivatedCase, query.isPending, setPhase])

  useEffect(() => {
    if (!hasActivatedCase) return
    if (query.data) {
      setCitizens(query.data)
      setError(undefined)
    }
  }, [hasActivatedCase, query.data, setCitizens, setError])

  useEffect(() => {
    if (!hasActivatedCase) return
    if (query.error) {
      setError('Không thể tải dữ liệu RandomUser. Hãy thử lại.')
    }
  }, [hasActivatedCase, query.error, setError])

  return query
}
