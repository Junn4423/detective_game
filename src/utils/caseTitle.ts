import type { CaseClueBundle, VictimProfile } from '@/types/game'
import { mulberry32, randomInt } from '@/utils/random'

const prefixPool = ['Hồ sơ', 'Vụ án', 'Chuyên án', 'Chiến dịch', 'Mật danh']
const moodPool = ['Bóng Đêm', 'Sương Mù', 'Hoàng Hôn', 'Lửa Ngầm', 'Bến Cảng', 'Dạ Hành', 'Mật Lệnh', 'Vệt Khói']

const toSeed = (value: string): number => {
  return Array.from(value).reduce((sum, char, idx) => sum + char.charCodeAt(0) * (idx + 1), 0)
}

const pickLocationLabel = (victim: VictimProfile, locationName?: string) => {
  if (locationName) return locationName
  if (victim.residence) return victim.residence
  return 'Đô thị ẩn danh'
}

const pickSurname = (victim: VictimProfile) => {
  const parts = victim.fullName.trim().split(/\s+/)
  return parts.length ? parts[parts.length - 1] : victim.fullName
}

export const createCaseTitle = (victim: VictimProfile, locationName?: string): string => {
  const seed = toSeed(victim.victimId ?? victim.id ?? victim.fullName)
  const rng = mulberry32(seed)
  const prefix = prefixPool[randomInt(prefixPool.length, rng)]
  const mood = moodPool[randomInt(moodPool.length, rng)]
  const locationLabel = pickLocationLabel(victim, locationName)
  const surname = pickSurname(victim)
  return `${prefix} ${mood} ${locationLabel} - ${surname}`
}

export const ensureCaseTitle = <T extends { victim: VictimProfile; locationName?: string; caseTitle?: string }>(
  bundle: T,
): T & { caseTitle: string } => {
  if (bundle.caseTitle && bundle.caseTitle.trim().length > 0) {
    return bundle as T & { caseTitle: string }
  }
  return {
    ...bundle,
    caseTitle: createCaseTitle(bundle.victim, bundle.locationName),
  }
}

export const ensureBundleCaseTitle = (bundle: CaseClueBundle): CaseClueBundle => ensureCaseTitle(bundle)
