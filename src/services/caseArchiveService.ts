import type { CaseClueBundle } from '@/types/game'
import { ensureBundleCaseTitle } from '@/utils/caseTitle'

const ARCHIVE_ENDPOINT = '/__case-archive__'

const toCaseCode = (bundle: CaseClueBundle): string => {
  const raw = bundle.victim?.victimId ?? bundle.victim?.id ?? `case-${Date.now()}`
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || `case-${Date.now()}`
}

export const archiveCaseBundle = async (bundle: CaseClueBundle): Promise<string | undefined> => {
  if (!import.meta.env.DEV) {
    return undefined
  }

  if (!bundle?.victim) {
    return undefined
  }

  const titledBundle = ensureBundleCaseTitle(bundle)
  const caseCode = toCaseCode(bundle)
  try {
    await fetch(ARCHIVE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        caseCode,
        generatedAt: new Date().toISOString(),
        title: titledBundle.caseTitle,
        bundle: titledBundle,
      }),
    })
  } catch (error) {
    console.warn('Unable to archive case bundle', error)
    return undefined
  }
  return caseCode
}

export const fetchArchivedCaseBundle = async (caseCode: string): Promise<CaseClueBundle | undefined> => {
  if (!import.meta.env.DEV) {
    return undefined
  }

  if (!caseCode) {
    return undefined
  }

  try {
    const response = await fetch(`${ARCHIVE_ENDPOINT}?code=${encodeURIComponent(caseCode)}`)
    if (!response.ok) {
      return undefined
    }
    const payload = (await response.json()) as { bundle?: CaseClueBundle }
    return payload.bundle ? ensureBundleCaseTitle(payload.bundle) : undefined
  } catch (error) {
    console.warn('Unable to read archived case bundle', error)
    return undefined
  }
}

export interface ArchivedCaseSummary {
  caseCode: string
  title: string
  generatedAt?: string
}

export const listArchivedCases = async (): Promise<ArchivedCaseSummary[]> => {
  if (!import.meta.env.DEV) {
    return []
  }

  try {
    const response = await fetch(`${ARCHIVE_ENDPOINT}?list=1`)
    if (!response.ok) {
      return []
    }
    const payload = (await response.json()) as { cases: ArchivedCaseSummary[] }
    return payload.cases ?? []
  } catch (error) {
    console.warn('Unable to list archived case bundles', error)
    return []
  }
}
