import type { CaseClueBundle, Clue, GeminiCluePrompt } from '@/types/game'

const GEMINI_MODEL = 'gemini-1.5-flash'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

interface GeminiContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

const apiKey = import.meta.env.VITE_GEMINI_API_KEY

const ensureApiKey = () => {
  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY. Please create a .env file.')
  }

  return apiKey
}

const buildPrompt = (prompt: GeminiCluePrompt): string => {
  const header = `Bạn là nhà biên kịch game trinh thám. Tạo các manh mối súc tích (tối đa 120 ký tự mô tả, 1-2 map hints) để người chơi lần ra hung thủ.`
  const victim = `Nạn nhân: ${prompt.victim.fullName}, ${prompt.victim.occupation}, quê ${prompt.victim.residence}. Thời điểm bị hại: ${prompt.victim.timeOfIncident}.`
  const suspects = prompt.suspects
    .map(
      (suspect) =>
        `Nghi phạm ${suspect.fullName} (${suspect.occupation}) hiện diện ở ${suspect.residence} - độ nghi ngờ ${suspect.suspicionLevel}.`,
    )
    .join('\n')
  const relationships = prompt.relationships
    .map((edge) => `${edge.sourceId} -${edge.relationship}-> ${edge.targetId}: ${edge.description}`)
    .join('\n')
  const objectives = prompt.objectives.join('\n')
  const facts = prompt.seedFacts.map((fact) => `${fact.citizenId}: ${fact.fact}`).join('\n')

  return `\n${header}\n${victim}\n${suspects}\nQuan hệ:\n${relationships}\nThông tin thêm:\n${facts}\nYêu cầu:\n${objectives}\nHãy trả về JSON hợp lệ dạng {"clues":[{"id":"string","title":"string","summary":"string","difficulty":"easy|medium|hard","relatedCitizenIds":["id"],"mapHints":[{"label":"string","point":{"lat":number,"lng":number},"radiusMeters":number}]}]}.`}

const parseClues = (text: string): Clue[] => {
  try {
    const parsed = JSON.parse(text) as { clues?: Clue[] }
    return parsed.clues ?? []
  } catch (error) {
    console.warn('Unable to parse Gemini JSON payload', error)
    return []
  }
}

export const requestGeminiClues = async (prompt: GeminiCluePrompt): Promise<Clue[]> => {
  const key = ensureApiKey()
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildPrompt(prompt) }],
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error('Gemini API request failed')
  }

  const data = (await response.json()) as GeminiContentResponse
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('\n') ?? ''
  const clues = parseClues(text)

  if (!clues.length) {
    const fallback: Clue = {
      id: 'fallback-clue',
      title: 'Bản ghi từ nhân chứng',
      summary: 'Nhân chứng thấy nghi phạm hộ tống nạn nhân tới quán cà phê gần bến tàu trước án mạng.',
      difficulty: 'medium',
      relatedCitizenIds: [prompt.suspects[0]?.id ?? prompt.victim.id],
      mapHints: [],
    }
    return [fallback]
  }

  return clues
}

export const enrichBundleWithClues = async (
  bundle: CaseClueBundle,
): Promise<CaseClueBundle> => ({
  ...bundle,
  clueDrafts: await requestGeminiClues({
    victim: bundle.victim,
    suspects: bundle.suspects,
    relationships: bundle.relationships,
    seedFacts: bundle.suspects.map((suspect) => ({
      citizenId: suspect.id,
      fact: `${suspect.fullName} xuất hiện gần ${bundle.victim.lastKnownLocation.lat.toFixed(2)},${bundle.victim.lastKnownLocation.lng.toFixed(2)}`,
    })),
    objectives: [
      'Mỗi manh mối phải nhắc đến ít nhất một nghi phạm hoặc nạn nhân.',
      'Ưu tiên thông tin giúp khoanh vùng vị trí cuối cùng.',
    ],
  }),
})
