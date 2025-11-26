import type {
  CaseClueBundle,
  CitizenProfile,
  RelationshipEdge,
  SuspectProfile,
  VictimProfile,
} from '@/types/game'
import { createMapHint, getLastKnownLocation } from '@/services/mapService'
import { mulberry32, pickRandomItems } from '@/utils/random'

const RELATIONSHIP_COUNT = 50
const SUSPECT_COUNT = 10

const promoteVictim = (profile: CitizenProfile, timestamp: Date): VictimProfile => ({
  ...profile,
  victimId: `victim-${profile.id}`,
  timeOfIncident: timestamp.toISOString(),
  lastKnownLocation: getLastKnownLocation(profile.coordinates, mulberry32(timestamp.getTime() % 10_000)),
})

const promoteSuspect = (
  profile: CitizenProfile,
  suspicionLevel: number,
  alibi: string,
): SuspectProfile => ({
  ...profile,
  suspicionLevel,
  alibi,
})

const buildRelationships = (
  victim: VictimProfile,
  pool: CitizenProfile[],
  rngSeed: number,
): RelationshipEdge[] => {
  const rng = mulberry32(rngSeed)
  const related = pickRandomItems(pool, RELATIONSHIP_COUNT, rng)

  return related.map((citizen, index) => ({
    sourceId: victim.id,
    targetId: citizen.id,
    relationship: index % 3 === 0 ? 'colleague' : 'acquaintance',
    description: `Gặp nhau tại ${citizen.residence} theo lời khai ${index + 1}.`,
  }))
}

export const assembleCaseBundle = (
  citizens: CitizenProfile[],
  seed = Date.now(),
): CaseClueBundle => {
  if (citizens.length < SUSPECT_COUNT + 2) {
    throw new Error('Need more citizens to build case bundle')
  }

  const rng = mulberry32(seed)
  const shuffled = pickRandomItems(citizens, citizens.length, rng)
  const victim = promoteVictim(shuffled[0], new Date())
  const killer = promoteSuspect(shuffled[1], 0.95, 'Từ chối khai báo')
  const suspectsPool = [killer, ...pickRandomItems(shuffled.slice(2), SUSPECT_COUNT - 1, rng)].map(
    (suspect, index) =>
      promoteSuspect(
        suspect,
        Number((0.45 + rng() * 0.5).toFixed(2)),
        index % 2 === 0 ? 'Khai đang ở nhà hàng' : 'Không nhớ thời gian',
      ),
  )

  const relationships = buildRelationships(victim, shuffled.slice(2), seed)
  const clueDrafts = suspectsPool.map((suspect, index) => {
    const difficulty: 'easy' | 'medium' | 'hard' = index < 3 ? 'easy' : 'medium'
    return {
      id: `draft-${suspect.id}`,
      title: `Dấu vết ${index + 1}`,
      summary: `${suspect.fullName} từng làm việc với nạn nhân tại ${suspect.residence}.`,
      difficulty,
      relatedCitizenIds: [suspect.id, victim.id],
      mapHints: [createMapHint('Điểm gặp', suspect.coordinates, rng, 250)],
    }
  })

  return {
    victim,
    killer,
    suspects: suspectsPool,
    relationships,
    clueDrafts,
  }
}
