import type { CaseClueBundle, CaseSolution, Clue, GeminiCluePrompt } from '@/types/game'

const GEMINI_MODEL = 'gemini-2.0-flash'
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
  const header = `Bạn là một tiểu thuyết gia trinh thám bậc thầy, nổi tiếng với những cốt truyện phức tạp, đầy bất ngờ và logic chặt chẽ như Sherlock Holmes hay Conan Doyle. Nhiệm vụ của bạn là kiến tạo một vụ án mạng bí ẩn, hấp dẫn và đầy thử thách cho người chơi.`
  const victim = `NẠN NHÂN: ${prompt.victim.fullName}, ${prompt.victim.occupation}, cư trú tại ${prompt.victim.residence}.
  - Thời điểm tử vong: ${prompt.victim.timeOfIncident}.
  - Bối cảnh: Một vụ án gây chấn động dư luận tại thành phố ${prompt.locationName}.`

  const suspects = prompt.suspects
    .slice(0, 15)
    .map(
      (suspect) =>
        `- ${suspect.fullName} (${suspect.occupation}, ${suspect.age} tuổi) - ${suspect.residence}. Mức độ khả nghi: ${suspect.suspicionLevel}.`,
    )
    .join('\n')

  const relationships = prompt.relationships
    .slice(0, 20)
    .map((edge) => `- ${edge.sourceId} có mối quan hệ "${edge.relationship}" với ${edge.targetId}: ${edge.description}`)
    .join('\n')

  const testimonies = prompt.suspects
    .slice(0, 20)
    .map((suspect) => `- ${suspect.fullName}: ${suspect.testimony.narrative}`)
    .join('\n')

  const objectives = prompt.objectives.join('\n')
  const facts = prompt.seedFacts.map((fact) => `- ${fact.citizenId}: ${fact.fact}`).join('\n')
  const accompliceNotice = `Theo hồ sơ điều tra ban đầu có ${prompt.accompliceCount} đồng phạm cản trở việc bắt giữ. Sau khi mọi đồng phạm bị lộ mặt, họ sẽ tiết lộ tọa độ "${prompt.hideoutLabel}" nơi hung thủ lẩn trốn.`

  return `
${header}

${victim}

DANH SÁCH NGHI PHẠM TIỀM NĂNG (Top 15):
${suspects}

MẠNG LƯỚI QUAN HỆ:
${relationships}

TRÍCH LỤC LỜI KHAI ĐỊNH VỊ:
${testimonies}

DỮ LIỆU THỰC ĐỊA & MẬT BÁO:
${facts}

THÔNG TIN ĐỒNG PHẠM:
${accompliceNotice}

YÊU CẦU CỐT TRUYỆN:
${objectives}

HÃY SÁNG TẠO MỘT KỊCH BẢN HOÀN CHỈNH VỚI CẤU TRÚC JSON SAU:
{
  "case_title": "Tên vụ án thật ấn tượng, mang màu sắc trinh thám cổ điển hoặc hiện đại",
  "story": "Đoạn mở đầu lôi cuốn, mô tả hiện trường vụ án, không khí căng thẳng và những chi tiết ban đầu kích thích trí tò mò. Viết khoảng 150-200 từ.",
  "solution": {
    "victim_backstory": "Tiểu sử ẩn giấu của nạn nhân, những bí mật dẫn đến cái chết.",
    "killer_motive": "Động cơ gây án sâu sắc (tình, tiền, thù hận, hoặc bí mật đen tối).",
    "relationship": "Mối quan hệ thực sự giữa hung thủ và nạn nhân (có thể khác với vẻ bề ngoài).",
    "clue_phase_1": "Manh mối tinh tế giúp loại bỏ 50% nghi phạm (ví dụ: đặc điểm ngoại hình, thói quen, hoặc bằng chứng ngoại phạm).",
    "clue_phase_2": "Manh mối then chốt giúp khoanh vùng 10 nghi phạm cuối cùng (ví dụ: vật chứng tại hiện trường, dữ liệu định vị).",
    "final_clue": "Manh mối quyết định (smoking gun) để lật mặt hung thủ trong số các nghi phạm cuối cùng."
  },
  "clues": [
    {
      "id": "clue_1",
      "title": "Tiêu đề manh mối (ngắn gọn, bí ẩn)",
      "summary": "Nội dung chi tiết của manh mối. Phải logic và liên kết với vụ án.",
      "difficulty": "easy",
      "relatedCitizenIds": ["id_nghi_pham_lien_quan"],
      "mapHints": []
    },
    {
      "id": "clue_2",
      "title": "...",
      "summary": "...",
      "difficulty": "medium",
      "relatedCitizenIds": [],
      "mapHints": []
    },
    {
      "id": "clue_3",
      "title": "...",
      "summary": "...",
      "difficulty": "hard",
      "relatedCitizenIds": [],
      "mapHints": []
    }
  ]
}
Chỉ trả về JSON thuần túy, không kèm theo markdown hay giải thích thêm. Đảm bảo JSON hợp lệ.`
}

const parseResponse = (text: string, killerId: string): { clues: Clue[]; story: string; solution: CaseSolution } => {
  try {
    const parsed = JSON.parse(text)
    return {
      clues: parsed.clues ?? [],
      story: parsed.story ?? '',
      solution: {
        killerId,
        victimBackstory: parsed.solution?.victim_backstory ?? '',
        killerMotive: parsed.solution?.killer_motive ?? '',
        relationship: parsed.solution?.relationship ?? '',
        cluePhase1: parsed.solution?.clue_phase_1 ?? '',
        cluePhase2: parsed.solution?.clue_phase_2 ?? '',
        finalClue: parsed.solution?.final_clue ?? '',
      }
    }
  } catch (error) {
    console.warn('Unable to parse Gemini JSON payload', error)
    return {
      clues: [],
      story: '',
      solution: {
        killerId,
        victimBackstory: 'Không có dữ liệu',
        killerMotive: 'Không có dữ liệu',
        relationship: 'Không có dữ liệu',
        cluePhase1: 'Không có dữ liệu',
        cluePhase2: 'Không có dữ liệu',
        finalClue: 'Không có dữ liệu',
      }
    }
  }
}

export const requestGeminiClues = async (prompt: GeminiCluePrompt, killerId: string): Promise<{ clues: Clue[]; story: string; solution: CaseSolution }> => {
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

  // Clean up markdown code blocks if present
  const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim()

  const result = parseResponse(jsonText, killerId)

  if (!result.clues.length) {
    const fallback: Clue = {
      id: 'fallback-clue',
      title: 'Bản ghi từ nhân chứng',
      summary: 'Nhân chứng thấy nghi phạm hộ tống nạn nhân tới quán cà phê gần bến tàu trước án mạng.',
      difficulty: 'medium',
      relatedCitizenIds: [prompt.suspects[0]?.id ?? prompt.victim.id],
      mapHints: [],
    }
    return {
      clues: [fallback],
      story: 'Không thể tạo cốt truyện từ AI. Vụ án đang được điều tra theo quy trình chuẩn.',
      solution: {
        killerId,
        victimBackstory: 'N/A',
        killerMotive: 'N/A',
        relationship: 'N/A',
        cluePhase1: 'N/A',
        cluePhase2: 'N/A',
        finalClue: 'N/A',
      }
    }
  }

  return result
}

export const enrichBundleWithClues = async (
  bundle: CaseClueBundle,
): Promise<CaseClueBundle> => {
  const { clues, story, solution } = await requestGeminiClues({
    victim: bundle.victim,
    suspects: bundle.suspects,
    relationships: bundle.relationships,
    seedFacts: bundle.suspects.map((suspect) => ({
      citizenId: suspect.id,
      fact: `${suspect.fullName} khẳng định có mặt tại ${suspect.testimony.locationLabel} (${suspect.testimony.timeframe}).`,
    })),
    objectives: [
      'Mỗi manh mối phải nhắc đến ít nhất một nghi phạm hoặc nạn nhân.',
      'Luôn mô tả rõ tọa độ/địa danh để người chơi so đối chiếu với bản đồ.',
      `Sinh ra manh mối phụ trợ cho tuyến đồng phạm (có ${bundle.accompliceCount} người) để người chơi phát hiện sự mâu thuẫn.`,
      `Khi kết luận cuối cùng hãy nhắc tới mật danh khu ẩn náu "${bundle.hideoutHint.label}".`,
    ],
    locationName: bundle.locationName,
    accompliceCount: bundle.accompliceCount,
    hideoutLabel: bundle.hideoutHint.label,
  }, bundle.killer.id)

  return {
    ...bundle,
    clueDrafts: clues,
    story,
    solution,
  }
}
