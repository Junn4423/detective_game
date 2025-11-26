import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCitizenDataset } from '@/services/randomUserService'
import { useGameStore } from '@/store/gameStore'

export const useCitizenDataset = () => {
  const setCitizens = useGameStore((state) => state.setCitizens)
  const setPhase = useGameStore((state) => state.setPhase)
  const setError = useGameStore((state) => state.setError)

  const query = useQuery({
    queryKey: ['citizens'],
    queryFn: () => fetchCitizenDataset(100),
  })

  useEffect(() => {
    if (query.isPending) {
      setPhase('loading')
    }
  }, [query.isPending, setPhase])

  useEffect(() => {
    if (query.data) {
      setCitizens(query.data)
      setError(undefined)
    }
  }, [query.data, setCitizens, setError])

  useEffect(() => {
    if (query.error) {
      setError('Không thể tải dữ liệu RandomUser. Hãy thử lại.')
    }
  }, [query.error, setError])

  return query
}
