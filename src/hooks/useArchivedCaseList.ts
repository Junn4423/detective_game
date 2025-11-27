import { useQuery } from '@tanstack/react-query'
import { listArchivedCases } from '@/services/caseArchiveService'

export const useArchivedCaseList = (enabled: boolean) =>
  useQuery({
    queryKey: ['archived-case-list'],
    queryFn: listArchivedCases,
    enabled,
    staleTime: 60 * 1000,
  })
