import { PropsWithChildren, useMemo } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60,
      },
    },
  })

export function AppProviders({ children }: PropsWithChildren) {
  const queryClient = useMemo(() => createQueryClient(), [])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
