export type CasePhase = 'idle' | 'loading' | 'investigating' | 'accusing' | 'capturing' | 'solved' | 'GAME_OVER_MISSING_KILLER'

export interface GeoPoint {
  lat: number
  lng: number
}

export type CaseLocaleId = 'vn' | 'us'

export interface CaseLocale {
  id: CaseLocaleId
  city: string
  country: string
}

export interface CitizenProfile {
  id: string
  fullName: string
  gender: string
  age: number
  nationality: string
  occupation: string
  email: string
  phone: string
  cell: string
  dob: string
  registered: string
  idNumber: string // SSN or similar
  residence: string
  coordinates: GeoPoint
  portrait: string
  timezone: string
  seed: string
}

export interface VictimProfile extends CitizenProfile {
  victimId: string
  timeOfIncident: string
  lastKnownLocation: GeoPoint
}

export type CitizenRole = 'killer' | 'accomplice' | 'associate'

export interface SuspectDialogueTopic {
  id: string
  text: string
  response: string
  clueReveal?: boolean
  isTrap?: boolean
}

export interface SuspectDialogue {
  intro: string
  topics: SuspectDialogueTopic[]
  confessionHook?: string
  resetHint?: string
}

export interface Testimony {
  id: string
  relationshipSummary: string
  narrative: string
  timeframe: string
  action: string
  locationLabel: string
  mapHint: MapHint
  reliability: 'solid' | 'shaky'
  landmarkId?: string
  directionHint?: string
}

export interface SuspectProfile extends CitizenProfile {
  suspicionLevel: number
  alibi: string
  role: CitizenRole
  relationshipTag: RelationshipType
  testimony: Testimony
  secondaryTestimony?: Testimony
  dialogue?: SuspectDialogue
}

export type RelationshipType =
  | 'family'
  | 'colleague'
  | 'acquaintance'
  | 'business'
  | 'unknown'

export interface RelationshipEdge {
  sourceId: string
  targetId: string
  relationship: RelationshipType
  description: string
}

export interface MapHint {
  id: string
  label: string
  point: GeoPoint
  radiusMeters: number
}

export interface Landmark {
  id: string
  name: string
  label: string
  coordinates: GeoPoint
  category: 'medical' | 'transit' | 'religious' | 'park' | 'commercial' | 'residential' | 'infrastructure' | 'government' | 'cultural' | 'other'
  description?: string
  localeId?: CaseLocaleId
}

export interface Clue {
  id: string
  title: string
  summary: string
  difficulty: 'easy' | 'medium' | 'hard'
  relatedCitizenIds: string[]
  mapHints: MapHint[]
}

export interface CaseSolution {
  killerId: string
  victimBackstory: string
  killerMotive: string
  relationship: string
  cluePhase1: string
  cluePhase2: string
  finalClue: string
}

export interface CaseClueBundle {
  victim: VictimProfile
  killer: SuspectProfile
  suspects: SuspectProfile[]
  primeSuspectIds: string[]
  accompliceIds: string[]
  accompliceCount: number
  relationships: RelationshipEdge[]
  clueDrafts: Clue[]
  caseTitle?: string
  story: string
  solution: CaseSolution
  locationName: string
  locale: CaseLocale
  hideoutHint: MapHint
  landmarks: Landmark[]
}

export interface GeminiCluePrompt {
  victim: VictimProfile
  suspects: SuspectProfile[]
  relationships: RelationshipEdge[]
  seedFacts: Array<{
    citizenId: string
    fact: string
  }>
  objectives: string[]
  locationName: string
  locale: CaseLocale
  accompliceCount: number
  hideoutLabel: string
  landmarks: Landmark[]
}

export interface Phase2DialogueRequest {
  suspects: SuspectProfile[]
  killerId: string
  accompliceIds: string[]
  locationName: string
  hideoutLabel: string
  victim: VictimProfile
}

export type Phase2DialogueMap = Record<string, SuspectDialogue>
