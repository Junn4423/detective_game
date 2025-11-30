import type {
  CaseClueBundle,
  CaseLocale,
  CaseLocaleId,
  CitizenProfile,
  CitizenRole,
  GeoPoint,
  Landmark,
  MapHint,
  RelationshipEdge,
  RelationshipType,
  SuspectDialogue,
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
    dialogue: SuspectDialogue
  },
): SuspectProfile => ({
  ...profile,
  suspicionLevel: params.suspicionLevel,
  alibi: params.alibi,
  role: params.role,
  relationshipTag: params.relationshipTag,
  testimony: params.testimony,
  secondaryTestimony: params.secondaryTestimony,
  dialogue: params.dialogue,
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

interface LandmarkSeed {
  name: string
  category: Landmark['category']
  coordinates: GeoPoint
  description?: string
}

interface LocaleNamePool {
  familyNames: string[]
  middleNames?: string[]
  givenNamesMale: string[]
  givenNamesFemale: string[]
}

const localeNamePools: Record<CaseLocaleId, LocaleNamePool> = {
  vn: {
    familyNames: ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Phan', 'Huỳnh', 'Đỗ', 'Bùi'],
    middleNames: ['Thị', 'Văn', 'Hữu', 'Gia', 'Ngọc', 'Thuỳ', 'Minh', 'Quốc'],
    givenNamesMale: ['Anh', 'Bảo', 'Dũng', 'Hải', 'Hưng', 'Khánh', 'Long', 'Nam', 'Phong', 'Quân', 'Sơn', 'Tùng', 'Việt', 'Phúc', 'Kiên'],
    givenNamesFemale: ['An', 'Chi', 'Dung', 'Hà', 'Hoa', 'Lan', 'Linh', 'Mai', 'Ngân', 'Ngọc', 'Phương', 'Thu', 'Trang', 'Yến', 'Hạnh'],
  },
  us: {
    familyNames: ['Anderson', 'Bennett', 'Carter', 'Diaz', 'Edwards', 'Foster', 'Garcia', 'Hughes', 'Johnson', 'Mitchell', 'Parker', 'Smith', 'Turner', 'Williams'],
    middleNames: ['James', 'Marie', 'Lee', 'Grace', 'Lynn', 'Rose', 'Alexander', 'Mae'],
    givenNamesMale: ['Aaron', 'Brandon', 'Caleb', 'Daniel', 'Ethan', 'Gabriel', 'Hunter', 'Jacob', 'Liam', 'Mason', 'Noah', 'Owen', 'Ryan', 'Wyatt'],
    givenNamesFemale: ['Abigail', 'Brooklyn', 'Charlotte', 'Ella', 'Grace', 'Harper', 'Isabella', 'Lily', 'Madison', 'Natalie', 'Olivia', 'Sophia', 'Victoria', 'Zoey'],
  },
}

const pickFrom = (list: string[], rng: ReturnType<typeof mulberry32>): string => {
  if (!list.length) {
    return ''
  }
  return list[randomInt(list.length, rng)] ?? list[0]
}

const buildLocalizedFullName = (localeId: CaseLocaleId, gender: string, rng: ReturnType<typeof mulberry32>): string => {
  const pool = localeNamePools[localeId]
  const genderLower = gender?.toLowerCase() ?? ''
  const isFemale = genderLower.includes('female') || genderLower.includes('f') || genderLower.includes('nu') || genderLower.includes('nữ')
  const given = pickFrom(isFemale ? pool.givenNamesFemale : pool.givenNamesMale, rng) || pickFrom(pool.givenNamesMale, rng)
  const secondary = pool.middleNames?.length ? pickFrom(pool.middleNames, rng) : ''
  const family = pickFrom(pool.familyNames, rng)

  if (localeId === 'vn') {
    return [family, secondary, given].filter(Boolean).join(' ')
  }

  return [given, secondary, family].filter(Boolean).join(' ')
}

const toRadians = (value: number) => (value * Math.PI) / 180

const distanceKm = (a: GeoPoint, b: GeoPoint) => {
  const R = 6371
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const hav = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav))
  return Number((R * c).toFixed(3))
}

const bearingBetweenPoints = (from: GeoPoint, to: GeoPoint) => {
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)
  const dLng = toRadians(to.lng - from.lng)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  const theta = Math.atan2(y, x)
  return (theta * (180 / Math.PI) + 360) % 360
}

const cardinalDirections = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'] as const

const formatDirection = (bearing: number) => {
  if (Number.isNaN(bearing)) return 'không xác định'
  const index = Math.round(bearing / 45) % cardinalDirections.length
  return cardinalDirections[index]
}

const buildSpatialDirectionHint = (
  citizenName: string,
  landmark: Landmark,
  referencePoint: GeoPoint,
  allLandmarks: Landmark[],
  rng: ReturnType<typeof mulberry32>,
): string => {
  const otherLandmarks = allLandmarks.filter((candidate) => candidate.id !== landmark.id)
  if (otherLandmarks.length && rng() > 0.35) {
    const ref = otherLandmarks[randomInt(otherLandmarks.length, rng)]
    const bearing = bearingBetweenPoints(ref.coordinates, landmark.coordinates)
    const direction = formatDirection(bearing)
    const dist = Math.max(0.35, distanceKm(ref.coordinates, landmark.coordinates)).toFixed(1)
    return `${citizenName} bị camera của ${ref.name} ghi lại khi di chuyển về phía ${direction} khoảng ${dist}km hướng tới ${landmark.name}.`
  }

  const bearing = bearingBetweenPoints(referencePoint, landmark.coordinates)
  const direction = formatDirection(bearing)
  const radius = Number((0.8 + rng() * 1.8).toFixed(1))
  return `${citizenName} được báo cáo đi về phía ${direction} của ${landmark.name}, luôn ở trong bán kính ${radius}km quanh địa điểm này.`
}

interface CaseLocation extends CaseLocale {
  lat: number
  lng: number
  landmarks: LandmarkSeed[]
}

const caseLocations: CaseLocation[] = [
  {
    id: 'vn',
    city: 'Hà Nội',
    country: 'Việt Nam',
    lat: 21.0278,
    lng: 105.8342,
    landmarks: [
      {
        name: 'Bệnh viện Trung tâm',
        category: 'medical',
        coordinates: { lat: 21.0039, lng: 105.846 },
        description: 'Tổ hợp phẫu thuật và cấp cứu lớn nhất khu vực phía Nam thành phố.',
      },
      {
        name: 'Công viên phía Bắc',
        category: 'park',
        coordinates: { lat: 21.0458, lng: 105.8349 },
        description: 'Khoảng xanh sát khu ngoại giao đoàn với nhiều camera an ninh.',
      },
      {
        name: 'Ga tàu điện ngầm',
        category: 'transit',
        coordinates: { lat: 21.0287, lng: 105.8415 },
        description: 'Nút giao thông ngầm nối thẳng quận Hoàn Kiếm với Long Biên.',
      },
      {
        name: 'Quán Bar ven sông',
        category: 'commercial',
        coordinates: { lat: 21.0408, lng: 105.8571 },
        description: 'Điểm hẹn đêm của giới buôn ngầm sát bờ sông Hồng.',
      },
      {
        name: 'Nhà thờ cổ',
        category: 'religious',
        coordinates: { lat: 21.028, lng: 105.8494 },
        description: 'Thánh đường Gothic nằm trong khu phố cổ.',
      },
      {
        name: 'Kho hàng Long Biên',
        category: 'infrastructure',
        coordinates: { lat: 21.0445, lng: 105.8723 },
        description: 'Kho ngoại quan bị nghi dùng để cất giấu tang vật.',
      },
      {
        name: 'Tháp quan sát Hồ Tây',
        category: 'cultural',
        coordinates: { lat: 21.0698, lng: 105.8162 },
        description: 'Điểm kiểm soát tín hiệu vô tuyến quanh hồ.',
      },
    ],
  },
  {
    id: 'us',
    city: 'New York',
    country: 'Hoa Kỳ',
    lat: 40.7128,
    lng: -74.0060,
    landmarks: [
      {
        name: 'Midtown Medical Center',
        category: 'medical',
        coordinates: { lat: 40.7588, lng: -73.975 },
        description: 'Bệnh viện chuyên khoa được trang bị trực thăng cứu hộ.',
      },
      {
        name: 'North River Park',
        category: 'park',
        coordinates: { lat: 40.8041, lng: -73.9683 },
        description: 'Công viên ven sông, nơi đặt nhiều cảm biến môi trường.',
      },
      {
        name: 'Fulton Subway Hub',
        category: 'transit',
        coordinates: { lat: 40.7094, lng: -74.0094 },
        description: 'Nút giao tàu điện ngầm phức tạp giữa khu tài chính.',
      },
      {
        name: 'Riverside Jazz Bar',
        category: 'commercial',
        coordinates: { lat: 40.7276, lng: -74.0115 },
        description: 'Quán bar khuya nhìn thẳng ra sông Hudson.',
      },
      {
        name: 'Cathedral Watchtower',
        category: 'religious',
        coordinates: { lat: 40.758, lng: -73.9765 },
        description: 'Tháp chuông nhà thờ cổ được cải tạo thành chòi quan sát.',
      },
      {
        name: 'Harbor Warehouse 12',
        category: 'infrastructure',
        coordinates: { lat: 40.7059, lng: -74.0172 },
        description: 'Kho hàng sát bờ cảng, thường xuyên bốc dỡ container đặc vụ theo dõi.',
      },
      {
        name: 'Liberty Observation Deck',
        category: 'cultural',
        coordinates: { lat: 40.6893, lng: -74.0445 },
        description: 'Sảnh quan sát nhìn ra vịnh, phục vụ các nhiệm vụ vệ tinh giả lập.',
      },
    ],
  },
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
  landmark: Landmark,
  allLandmarks: Landmark[],
  killerName: string,
  killerLandmark: Landmark,
): Testimony => {
  const action = actionTemplates[randomInt(actionTemplates.length, rng)]
  const offsetMinutes = (idx - 25) * 7 + Math.round(rng() * 12)
  const anchorTime = new Date(crimeTime.getTime() + offsetMinutes * 60 * 1000)
  const timeframe = buildTimeframe(anchorTime)
  const locationLabel = landmark.label
  const mapHint = createMapHint(locationLabel, landmark.coordinates, rng, role === 'killer' ? 900 : 600)

  const directionHint = buildSpatialDirectionHint(citizen.fullName, landmark, victim.lastKnownLocation, allLandmarks, rng)
  let narrative = `Tôi là ${relationshipLabels[relationshipTag]} của ${victim.fullName}. Ngày hôm đó, khoảng ${timeframe}, tôi đã ${action} tại ${locationLabel}. ${directionHint}`
  if (role === 'accomplice') {
    const alignment = landmark.id === killerLandmark.id
    narrative = `Tôi là ${relationshipLabels[relationshipTag]} của ${victim.fullName}. Khoảng ${timeframe}, tôi có mặt ngay tại ${locationLabel}, và tôi thấy ${killerName} ${alignment ? 'đứng lỳ tại đó' : `di chuyển từ ${killerLandmark.name} sang`} trước khi mọi chuyện xảy ra. ${directionHint}`
  }

  return {
    id: `testimony-${citizen.id}`,
    relationshipSummary: relationshipLabels[relationshipTag],
    narrative,
    timeframe,
    action,
    locationLabel,
    mapHint,
    reliability: role === 'killer' ? 'shaky' : 'solid',
    landmarkId: landmark.id,
    directionHint,
  }
}

const buildFallbackDialogue = (
  testimony: Testimony,
  victim: VictimProfile,
  role: CitizenRole,
  alibi: string,
  hideoutHint: MapHint,
  rng: ReturnType<typeof mulberry32>,
): SuspectDialogue => {
  // Personality types for variety
  const personalities = ['cooperative', 'nervous', 'hostile', 'arrogant', 'calm'] as const
  const personality = personalities[randomInt(personalities.length, rng)]
  
  // Intros based on personality
  const intros: Record<typeof personality, string[]> = {
    cooperative: [
      'Chào anh, tôi sẵn sàng hợp tác. Hỏi gì cứ hỏi.',
      'Cảnh sát à? Tốt, tôi muốn giúp tìm ra thủ phạm.',
      'Tôi đã chờ các anh đến. Có gì cần biết không?',
    ],
    nervous: [
      'Ơ... à... cảnh sát hả? Tôi... tôi có làm gì sai không?',
      'Xin lỗi, tôi hơi lo lắng. Chuyện này nghiêm trọng quá.',
      'Tôi không biết tôi có thể giúp được gì... nhưng cứ hỏi đi.',
    ],
    hostile: [
      'Lại cảnh sát à? Các anh định quấy rầy tôi đến bao giờ?',
      'Tôi đã khai rồi. Còn gì nữa?',
      'Nhanh lên, tôi không có cả ngày đâu.',
    ],
    arrogant: [
      'Anh có biết tôi là ai không? Thôi được, hỏi đi.',
      'Tôi hy vọng các anh có lý do chính đáng để làm phiền tôi.',
      'Hm, lại thẩm vấn? Tôi tưởng các anh đã có nghi phạm rồi chứ.',
    ],
    calm: [
      'Chào anh. Tôi hiểu đây là quy trình cần thiết.',
      'Cứ thoải mái hỏi. Tôi không có gì phải giấu.',
      'Tôi sẽ trả lời mọi câu hỏi một cách trung thực.',
    ],
  }
  
  const intro = role === 'killer'
    ? intros.calm[randomInt(intros.calm.length, rng)] // Killer luôn bình tĩnh giả tạo
    : role === 'accomplice'
      ? intros.nervous[randomInt(intros.nervous.length, rng)] // Đồng phạm lo lắng
      : intros[personality][randomInt(intros[personality].length, rng)]

  // Build alibi response with variation
  const alibiResponses = {
    killer: [
      `Tôi đang ${alibi.toLowerCase()}. Không có ai ở bên để xác nhận, nhưng tôi chắc chắn về điều đó. ${testimony.narrative}`,
      `Thời điểm đó à? ${alibi}. Tôi nhớ rất rõ vì đó là một buổi tối bình thường với tôi. ${testimony.narrative}`,
      `${alibi}. Tôi có thể mô tả chi tiết từng phút nếu cần. ${testimony.narrative}`,
    ],
    accomplice: [
      `${alibi}... à không, đợi chút... có lẽ tôi nhớ nhầm giờ. ${testimony.narrative}`,
      `Tôi nghĩ là ${alibi.toLowerCase()}, nhưng thật ra tối đó mọi thứ hơi mờ mịt. ${testimony.narrative}`,
      `${alibi}. Nhưng... tôi có gặp một người quen trước đó. ${testimony.narrative}`,
    ],
    associate: [
      `${alibi}. ${testimony.narrative}`,
      `Tôi đã ${alibi.toLowerCase()}. Có người có thể xác nhận cho tôi. ${testimony.narrative}`,
      `Đơn giản thôi, ${alibi.toLowerCase()}. Anh có thể kiểm tra camera nếu muốn.`,
    ],
  }
  
  const alibiResponse = alibiResponses[role][randomInt(alibiResponses[role].length, rng)]

  // Victim relation responses
  const relationResponses = {
    killer: [
      `${victim.fullName} à? Chúng tôi là ${testimony.relationshipSummary}. Mối quan hệ bình thường, không có gì đặc biệt. Tôi thực sự rất tiếc về những gì đã xảy ra.`,
      `Tôi quen ${victim.fullName} một thời gian. ${testimony.relationshipSummary}, như tôi đã nói. Không có xích mích gì cả.`,
    ],
    accomplice: [
      `${victim.fullName}? Tôi... tôi chỉ là ${testimony.relationshipSummary}. Tôi không biết nhiều về... về chuyện đó.`,
      `Chúng tôi là ${testimony.relationshipSummary}. Tôi không có lý do gì để... ý tôi là, tôi không liên quan.`,
    ],
    associate: [
      `${victim.fullName} và tôi là ${testimony.relationshipSummary}. Chúng tôi không thân thiết lắm.`,
      `Tôi là ${testimony.relationshipSummary} của ${victim.fullName}. Buồn thật, nhưng tôi không biết gì hơn.`,
    ],
  }

  // Pressure responses
  const pressureResponses = {
    killer: [
      `Anh đang cố gài tôi à? Tôi đã nói sự thật. Nhưng nếu anh muốn biết... tôi có đi ngang qua ${testimony.locationLabel} tối đó, chỉ là tình cờ thôi.`,
      `Tôi không thích giọng điệu này. Nhưng được thôi, tôi sẽ nói thêm - tôi có nghe tiếng động lạ từ hướng ${testimony.locationLabel}, nhưng không để ý.`,
    ],
    accomplice: [
      `Tôi... tôi không biết anh đang nói gì! Tại sao anh cứ hỏi dồn như vậy? ${hideoutHint.label}... không, tôi không biết chỗ đó!`,
      `Xin anh... tôi sợ. Có người bảo tôi phải im lặng. Họ ở gần ${hideoutHint.label}... không, tôi không nói gì nữa!`,
    ],
    associate: [
      `Anh nghĩ tôi là hung thủ à? Thật vô lý! Tôi có hàng tá người có thể xác nhận cho tôi!`,
      `Tôi đã nói hết những gì tôi biết. Nếu anh không tin, đó là vấn đề của anh.`,
      `Anh đang lãng phí thời gian. Hung thủ đang chạy trốn trong khi anh ngồi đây tra hỏi người vô tội.`,
    ],
  }

  const topics = [
    {
      id: 'alibi',
      text: 'Hỏi về bằng chứng ngoại phạm',
      response: alibiResponse,
      clueReveal: role === 'killer',
    },
    {
      id: 'victim_relation',
      text: 'Hỏi về mối quan hệ với nạn nhân',
      response: relationResponses[role][randomInt(relationResponses[role].length, rng)],
      clueReveal: false,
    },
    {
      id: 'pressure',
      text: 'Gây áp lực (Hỏi dồn)',
      response: pressureResponses[role][randomInt(pressureResponses[role].length, rng)],
      isTrap: role === 'killer',
      clueReveal: role === 'accomplice',
    },
  ]

  return {
    intro,
    topics,
    confessionHook: role === 'accomplice'
      ? `Được rồi, tôi nói... ${victim.fullName} không phải ngẫu nhiên. Có người đã lên kế hoạch từ trước. Họ bắt tôi canh gác ở ${hideoutHint.label}. Tôi sợ, nhưng tôi không thể im lặng mãi được.`
      : undefined,
    resetHint: role === 'killer' 
      ? 'Người này có vẻ quá bình tĩnh. Thử hỏi về chi tiết cụ thể.'
      : role === 'accomplice'
        ? 'Có vẻ đang giấu điều gì đó. Gây áp lực có thể có kết quả.'
        : 'Thay đổi chiến thuật hỏi để khai thác góc nhìn khác.',
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
  const caseLoc = caseLocations[randomInt(caseLocations.length, rng)]
  const caseDisplayName = `${caseLoc.city}, ${caseLoc.country}`

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

  const landmarkCount = Math.min(caseLoc.landmarks.length, 5 + randomInt(3, rng))
  const landmarkSeeds = pickRandomItems(caseLoc.landmarks, landmarkCount, rng)
  const landmarks: Landmark[] = landmarkSeeds.map((seed, index) => {
    const slug = `${caseLoc.city}-${seed.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    return {
      id: `landmark-${slug}-${index}`,
      name: seed.name,
      label: `${caseLoc.city} - ${seed.name}`,
      coordinates: seed.coordinates,
      category: seed.category,
      description: seed.description,
      localeId: caseLoc.id,
    }
  })

  // Override coordinates for ALL citizens to remain within the active city
  citizens.forEach((c) => {
    const point = generateRandomPoint(caseLoc.lat, caseLoc.lng, 15)
    c.coordinates = { ...point }
    c.residence = caseDisplayName
    c.nationality = caseLoc.country
    c.fullName = buildLocalizedFullName(caseLoc.id, c.gender, rng)
  })

  // Re-update victim location after override
  const victimCitizen = citizens.find((c) => c.id === victim.id)
  if (victimCitizen) {
    victim.fullName = victimCitizen.fullName
    victim.lastKnownLocation = { ...victimCitizen.coordinates }
    victim.residence = caseDisplayName
    victim.coordinates = { ...victimCitizen.coordinates }
    victim.nationality = caseLoc.country
  }

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

  // Alibi dành riêng cho hung thủ - có vẻ hợp lệ nhưng khó xác minh
  const killerAlibiTemplates = [
    'Đang ở nhà một mình xem TV',
    'Đang đi bộ dọc bờ sông để thư giãn',
    'Đang ngồi thiền tại một góc vắng trong công viên',
    'Đang lái xe vòng quanh thành phố để suy nghĩ',
    'Đang làm việc muộn tại văn phòng, một mình',
    'Đang ngủ sớm vì bị đau đầu',
    'Đang đọc sách tại quán cà phê vắng khách',
    'Đang tập chạy bộ quanh khu dân cư',
  ]

  const relationshipOptions: RelationshipType[] = ['family', 'colleague', 'business', 'acquaintance', 'unknown']

  const accomplicePool = primeSuspectsCitizens.slice(1)
  const maxAccomplices = Math.max(1, Math.min(4, accomplicePool.length))
  const accompliceCitizens = pickRandomItems(accomplicePool, Math.max(1, randomInt(maxAccomplices, rng) + 1), rng)
  const accompliceIds = accompliceCitizens.map((citizen) => citizen.id)

  const killerLandmark = landmarks[randomInt(landmarks.length, rng)]
  killerCitizen.coordinates = { ...killerLandmark.coordinates }

  const hideoutHint = createMapHint(`Ổ ẩn náu ${caseLoc.city}`, killerCitizen.coordinates, rng, 350)
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
    // Hung thủ có alibi khó xác minh nhưng không từ chối trả lời
    const alibi = role === 'killer' 
      ? killerAlibiTemplates[randomInt(killerAlibiTemplates.length, rng)] 
      : alibiTemplates[randomInt(alibiTemplates.length, rng)]
    const relationshipTag = relationshipOptions[idx % relationshipOptions.length]
    const assignedLandmark = (role === 'killer' || role === 'accomplice')
      ? killerLandmark
      : landmarks[randomInt(landmarks.length, rng)]

    // Sync citizen coordinates with their assigned landmark for map accuracy
    // Add small jitter to avoid exact overlap but keep them visually connected
    const jitterLat = (rng() - 0.5) * 0.008 // ~400m jitter
    const jitterLng = (rng() - 0.5) * 0.008
    citizen.coordinates = { 
      lat: assignedLandmark.coordinates.lat + jitterLat, 
      lng: assignedLandmark.coordinates.lng + jitterLng 
    }

    const testimony = buildTestimony(
      citizen,
      victim,
      relationshipTag,
      rng,
      crimeTime,
      idx,
      role,
      assignedLandmark,
      landmarks,
      killerCitizen.fullName,
      killerLandmark,
    )
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

    const dialogue = buildFallbackDialogue(testimony, victim, role, alibi, hideoutHint, rng)

    return promoteSuspect(citizen, {
      suspicionLevel,
      alibi,
      role,
      relationshipTag,
      testimony,
      secondaryTestimony,
      dialogue,
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
    caseTitle: createCaseTitle(victim, caseDisplayName),
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
    locationName: caseDisplayName,
    locale: {
      id: caseLoc.id,
      city: caseLoc.city,
      country: caseLoc.country,
    },
    hideoutHint,
    landmarks,
  }
}
