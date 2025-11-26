import type {
  CaseClueBundle,
  CitizenProfile,
  RelationshipEdge,
  SuspectProfile,
  VictimProfile,
} from '@/types/game'
import { createMapHint, getLastKnownLocation } from '@/services/mapService'
import { mulberry32, pickRandomItems } from '@/utils/random'

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

export const assembleCaseBundle = (
  citizens: CitizenProfile[],
  seed = Date.now(),
): CaseClueBundle => {
  if (citizens.length < 60) {
    throw new Error('Need more citizens to build case bundle')
  }

  const rng = mulberry32(seed)
  // Shuffle all citizens
  const shuffled = pickRandomItems(citizens, citizens.length, rng)

  // 1. Select Victim
  const victim = promoteVictim(shuffled[0], new Date())

  // --- GEOGRAPHIC CLUSTERING ---
  // Pick a random "Case Location" (e.g., London, Paris, New York, Hanoi)
  // We will override the coordinates of the 100 people to be around this location.
  const caseLocations = [
    { name: 'London', lat: 51.5074, lng: -0.1278 },
    { name: 'Paris', lat: 48.8566, lng: 2.3522 },
    { name: 'New York', lat: 40.7128, lng: -74.0060 },
    { name: 'Hanoi', lat: 21.0285, lng: 105.8542 },
    { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  ]
  const caseLoc = caseLocations[Math.floor(rng() * caseLocations.length)]

  // Helper to generate random point in radius (km)
  const generateRandomPoint = (centerLat: number, centerLng: number, radiusKm: number) => {
    const r = radiusKm / 111.3
    const u = rng()
    const v = rng()
    const w = r * Math.sqrt(u)
    const t = 2 * Math.PI * v
    const x = w * Math.cos(t)
    const y = w * Math.sin(t)
    return { lat: centerLat + x, lng: centerLng + y }
  }

  // Override coordinates for ALL citizens
  citizens.forEach((c) => {
    // 80% in the city (15km radius), 20% international/far (5000km)
    const isLocal = rng() > 0.2
    const radius = isLocal ? 15 : 5000
    const point = generateRandomPoint(caseLoc.lat, caseLoc.lng, radius)
    c.coordinates = point
    // Update residence text if local
    if (isLocal) {
      c.residence = `${caseLoc.name} Area`
    }
  })

  // Re-update victim location after override
  victim.lastKnownLocation = citizens.find(c => c.id === victim.id)!.coordinates
  victim.residence = caseLoc.name

  // 2. Select Population B (50 people) who are related to the victim
  const populationB = shuffled.slice(1, 51)

  // 3. Select Killer from Population B
  const shuffledB = pickRandomItems(populationB, populationB.length, rng)
  const killerCitizen = shuffledB[0]

  // 4. Select Top 10 "Prime Suspects" (including Killer)
  const primeSuspectsCitizens = shuffledB.slice(0, 10)
  const witnessesCitizens = shuffledB.slice(10)

  // Promote to SuspectProfiles
  const killer = promoteSuspect(killerCitizen, 0.95, 'Từ chối khai báo lịch trình')

  const alibiTemplates = [
    'Đang làm việc tại văn phòng',
    'Đang ăn tối cùng gia đình',
    'Đang xem phim tại rạp chiếu phim trung tâm',
    'Đang tập gym tại phòng tập thể hình',
    'Đang ngủ tại nhà riêng',
    'Đang đi công tác ở thành phố khác',
    'Đang tham gia một buổi tiệc sinh nhật',
    'Đang đi dạo trong công viên',
    'Đang mua sắm tại siêu thị',
    'Đang đọc sách tại thư viện',
    'Đang sửa xe tại gara',
    'Đang khám bệnh tại bệnh viện',
    'Đang tham gia lớp học nấu ăn',
    'Đang câu cá ở hồ ngoại ô',
    'Đang chơi bowling cùng bạn bè',
    'Đang tham dự đám cưới người thân',
    'Đang trực ca đêm tại nơi làm việc',
    'Đang đi du lịch nước ngoài',
    'Đang bị kẹt xe trên đường cao tốc',
    'Đang tham gia hoạt động tình nguyện',
  ]

  const primeSuspects = primeSuspectsCitizens.slice(1).map((c) => {
    const randomAlibi = alibiTemplates[Math.floor(rng() * alibiTemplates.length)]
    return promoteSuspect(c, Number((0.6 + rng() * 0.3).toFixed(2)), randomAlibi)
  })

  const witnesses = witnessesCitizens.map((c) =>
    promoteSuspect(c, Number((0.1 + rng() * 0.2).toFixed(2)), 'Đang làm việc tại văn phòng')
  )

  const allSuspects = pickRandomItems([killer, ...primeSuspects, ...witnesses], 50, rng)

  const relationships = allSuspects.map((citizen, index) => ({
    sourceId: victim.id,
    targetId: citizen.id,
    relationship: index % 3 === 0 ? 'colleague' : index % 3 === 1 ? 'acquaintance' : 'unknown',
    description: `Gặp nhau tại ${citizen.residence} theo lời khai ${index + 1}.`,
  })) as RelationshipEdge[]

  const clueDrafts = [killer, ...primeSuspects].map((suspect, index) => {
    const difficulty: 'easy' | 'medium' | 'hard' = index < 3 ? 'easy' : 'medium'
    return {
      id: `draft-${suspect.id}`,
      title: `Manh mối ${index + 1}`,
      summary: `${suspect.fullName} có mặt tại ${suspect.residence} vào thời điểm án mạng.`,
      difficulty,
      relatedCitizenIds: [suspect.id, victim.id],
      mapHints: [createMapHint('Điểm khả nghi', suspect.coordinates, rng, 250)],
    }
  })

  return {
    victim,
    killer,
    suspects: allSuspects,
    primeSuspectIds: primeSuspectsCitizens.map(c => c.id),
    relationships,
    clueDrafts,
    story: '',
    solution: {
      killerId: killer.id,
      victimBackstory: '',
      killerMotive: '',
      relationship: '',
      cluePhase1: '',
      cluePhase2: '',
      finalClue: '',
    },
    locationName: caseLoc.name,
  }
}
