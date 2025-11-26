export type CasePhase = 'idle' | 'loading' | 'investigating' | 'accusing' | 'solved'

export interface GeoPoint {
  lat: number
  lng: number
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

export interface SuspectProfile extends CitizenProfile {
  suspicionLevel: number
  alibi: string
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

export interface Clue {
  id: string
  title: string
  summary: string
  difficulty: 'easy' | 'medium' | 'hard'
  relatedCitizenIds: string[]
  mapHints: MapHint[]
}

export interface CaseClueBundle {
  victim: VictimProfile
  killer: SuspectProfile
  suspects: SuspectProfile[]
  relationships: RelationshipEdge[]
  clueDrafts: Clue[]
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
}
