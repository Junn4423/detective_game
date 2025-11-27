import type {
  CaseClueBundle,
  CitizenProfile,
  CitizenRole,
  RelationshipEdge,
  RelationshipType,
  SuspectProfile,
  Testimony,
  VictimProfile,
} from '@/types/game'
import { createMapHint, getLastKnownLocation } from '@/services/mapService'
import { mulberry32, pickRandomItems, randomInt } from '@/utils/random'
import { createCaseTitle } from '@/utils/caseTitle'

const promoteVictim = (profile: CitizenProfile, timestamp: Date): VictimProfile => ({
  ...profile,
  victimId: `victim-${profile.id}`,
  timeOfIncident: timestamp.toISOString(),
  lastKnownLocation: getLastKnownLocation(profile.coordinates, mulberry32(timestamp.getTime() % 10_000)),
})

const promoteSuspect = (
  profile: CitizenProfile,
  params: {
    suspicionLevel: number
    alibi: string
    role: CitizenRole
    relationshipTag: RelationshipType
    testimony: Testimony
    secondaryTestimony?: Testimony
  },
): SuspectProfile => ({
  ...profile,
  suspicionLevel: params.suspicionLevel,
  alibi: params.alibi,
  role: params.role,
  relationshipTag: params.relationshipTag,
  testimony: params.testimony,
  secondaryTestimony: params.secondaryTestimony,
})

const relationshipLabels: Record<RelationshipType, string> = {
  family: 'người thân',
  colleague: 'đồng nghiệp',
  acquaintance: 'mối quen biết',
  business: 'đối tác làm ăn',
  unknown: 'người quen xã giao',
}

const actionTemplates = [
  'chuẩn bị các thùng hàng ở kho sau bến tàu',
  'đi giao tài liệu tại trụ sở cảnh sát khu vực',
  'trông chừng con nhỏ ở căn hộ nhìn ra quảng trường',
  'kiểm tra hệ thống camera của nhà thờ cổ',
  'thảo luận hợp đồng với một khách hàng tại quán cà phê bến sông',
  'lái xe vòng quanh khu phố để thu thập hóa đơn giao hàng',
  'dự một buổi cầu nguyện ngắn gần khu chợ trời',
  'bám theo dấu vết chiếc xe tải bị nghi ngờ rời khỏi hiện trường',
  'đi khảo sát công trường dang dở ở ngoại ô',
  'truy cập máy chủ tại phòng lab cũ',
]

const locationDescriptors = [
  'kho hàng Riverside',
  'nhà thờ Saint-Marie',
  'quảng trường Đồng Tế',
  'khu cảng bỏ hoang phía tây',
  'ga tàu điện ngầm số 7',
  'cầu sắt Old Bridge',
  'nhà kho số 12',
  'khu dân cư tọa độ G-17',
  'chợ đêm trung tâm',
  'xưởng sửa tàu hỏa',
]

const formatTime = (date: Date) =>
  date
    .toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

const buildTimeframe = (anchor: Date) => {
  const start = new Date(anchor.getTime() - 10 * 60 * 1000)
  const end = new Date(anchor.getTime() + 20 * 60 * 1000)
  return `${formatTime(start)} - ${formatTime(end)}`
}

const buildTestimony = (
  citizen: CitizenProfile,
  victim: VictimProfile,
  relationshipTag: RelationshipType,
  rng: ReturnType<typeof mulberry32>,
  crimeTime: Date,
  idx: number,
  role: CitizenRole,
  mapLabelPrefix: string,
): Testimony => {
  const action = actionTemplates[randomInt(actionTemplates.length, rng)]
  const locationLabel = `${mapLabelPrefix} ${locationDescriptors[randomInt(locationDescriptors.length, rng)]}`
  const offsetMinutes = (idx - 25) * 7 + Math.round(rng() * 12)
  const anchorTime = new Date(crimeTime.getTime() + offsetMinutes * 60 * 1000)
  const mapHint = createMapHint(locationLabel, citizen.coordinates, rng, role === 'killer' ? 900 : 600)
  return {
    id: `testimony-${citizen.id}`,
    relationshipSummary: relationshipLabels[relationshipTag],
    narrative: `Tôi là ${relationshipLabels[relationshipTag]} của ${victim.fullName}. Ngày hôm đó, vào khoảng ${buildTimeframe(anchorTime)}, tôi đã ${action} tại ${locationLabel}.`,
    timeframe: buildTimeframe(anchorTime),
    action,
    locationLabel,
    mapHint,
    reliability: role === 'killer' ? 'shaky' : 'solid',
  }
}

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

  const relationshipOptions: RelationshipType[] = ['family', 'colleague', 'business', 'acquaintance', 'unknown']

  const accomplicePool = primeSuspectsCitizens.slice(1)
  const maxAccomplices = Math.max(1, Math.min(4, accomplicePool.length))
  const accompliceCitizens = pickRandomItems(accomplicePool, Math.max(1, randomInt(maxAccomplices, rng) + 1), rng)
  const accompliceIds = accompliceCitizens.map((citizen) => citizen.id)

  const hideoutHint = createMapHint('Ổ ẩn náu', killerCitizen.coordinates, rng, 350)
  const crimeTime = new Date(victim.timeOfIncident)
  const castCitizens = [killerCitizen, ...primeSuspectsCitizens.slice(1), ...witnessesCitizens]

  const suspectProfiles: SuspectProfile[] = castCitizens.map((citizen, idx) => {
    const role: CitizenRole = citizen.id === killerCitizen.id
      ? 'killer'
      : accompliceIds.includes(citizen.id)
        ? 'accomplice'
        : 'associate'
    const suspicionLevel = role === 'killer'
      ? 0.98
      : role === 'accomplice'
        ? Number((0.75 + rng() * 0.15).toFixed(2))
        : Number((0.3 + rng() * 0.4).toFixed(2))
    const alibi = role === 'killer' ? 'Từ chối khai báo lịch trình' : alibiTemplates[randomInt(alibiTemplates.length, rng)]
    const relationshipTag = relationshipOptions[idx % relationshipOptions.length]
    const testimony = buildTestimony(citizen, victim, relationshipTag, rng, crimeTime, idx, role, caseLoc.name)
    const secondaryTestimony = role === 'accomplice'
      ? {
          id: `secondary-${citizen.id}`,
          relationshipSummary: relationshipLabels[relationshipTag],
          narrative: `Được rồi, tôi sẽ hợp tác. ${killerCitizen.fullName} bảo tôi canh gác tại ${hideoutHint.label} và hắn vẫn còn ở đó lúc ${formatTime(new Date(crimeTime.getTime() + 90 * 60 * 1000))}.`,
          timeframe: buildTimeframe(new Date(crimeTime.getTime() + 90 * 60 * 1000)),
          action: 'chỉ điểm tọa độ ẩn náu',
          locationLabel: hideoutHint.label,
          mapHint: hideoutHint,
          reliability: 'solid' as const,
        }
      : undefined

    return promoteSuspect(citizen, {
      suspicionLevel,
      alibi,
      role,
      relationshipTag,
      testimony,
      secondaryTestimony,
    })
  })

  const killer = suspectProfiles.find((profile) => profile.role === 'killer')!
  const allSuspects = pickRandomItems(suspectProfiles, suspectProfiles.length, rng)
  const primeSuspects = primeSuspectsCitizens
    .filter((citizen) => citizen.id !== killerCitizen.id)
    .map((citizen) => suspectProfiles.find((profile) => profile.id === citizen.id)!)

  const relationships = allSuspects.map((suspect) => ({
    sourceId: victim.id,
    targetId: suspect.id,
    relationship: suspect.relationshipTag,
    description: `${suspect.fullName} khai mình là ${suspect.testimony.relationshipSummary} và có mặt tại ${suspect.testimony.locationLabel} (${suspect.testimony.timeframe}).`,
  })) as RelationshipEdge[]

  const clueDrafts = [killer, ...primeSuspects].map((suspect, index) => {
    const difficulty: 'easy' | 'medium' | 'hard' = index < 3 ? 'easy' : 'medium'
    return {
      id: `draft-${suspect.id}`,
      title: `Manh mối ${index + 1}`,
      summary: suspect.testimony.narrative,
      difficulty,
      relatedCitizenIds: [suspect.id, victim.id],
      mapHints: [suspect.testimony.mapHint],
    }
  })

  return {
    victim,
    killer,
    suspects: allSuspects,
    primeSuspectIds: primeSuspectsCitizens.map(c => c.id),
    accompliceIds,
    accompliceCount: accompliceIds.length,
    relationships,
    clueDrafts,
    caseTitle: createCaseTitle(victim, caseLoc.name),
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
    hideoutHint,
  }
}
