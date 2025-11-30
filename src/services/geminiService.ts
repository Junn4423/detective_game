import type {
  CaseClueBundle,
  CaseSolution,
  Clue,
  GeminiCluePrompt,
  Landmark,
  MapHint,
  Phase2DialogueMap,
  Phase2DialogueRequest,
  SuspectDialogue,
} from '@/types/game'
import { ensureBundleCaseTitle } from '@/utils/caseTitle'

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

  const localeRule = `PHẠM VI ĐỊA LÝ HỢP LỆ: Vụ án chỉ có thể diễn ra tại Hà Nội (Việt Nam) hoặc New York (Hoa Kỳ). Hồ sơ hiện tại thuộc: ${prompt.locationName}. Tuyệt đối không giới thiệu quốc gia hay thành phố khác.`

  const landmarksList = prompt.landmarks.length
    ? prompt.landmarks
        .map(
          (landmark) =>
            `- ${landmark.label} (tọa độ chính xác: ${landmark.coordinates.lat.toFixed(5)}, ${landmark.coordinates.lng.toFixed(5)}), loại: ${landmark.category}, mô tả: ${landmark.description ?? 'không có'}`,
        )
        .join('\n')
    : '- Không có landmarks nào, không được phát sinh địa điểm mới.'

  const spatialRules = `LANDMARKS HỢP LỆ (QUAN TRỌNG - PHẢI SỬ DỤNG CHÍNH XÁC):\n${landmarksList}\n\nQUY TẮC BẮT BUỘC VỀ ĐỊA ĐIỂM:\n- CHỈ ĐƯỢC nhắc tới các địa điểm trong danh sách trên, TUYỆT ĐỐI KHÔNG sáng tạo tên mới.\n- Mọi manh mối PHẢI gắn với ít nhất 1 landmark cụ thể từ danh sách.\n- Khi mô tả hiện trường hoặc sự kiện, PHẢI dùng tên landmark chính xác.\n- Mô tả hướng đi và khoảng cách phải dựa trên tọa độ thực của các landmarks.\n- Ví dụ đúng: "Thi thể được tìm thấy cách ${prompt.landmarks[0]?.name ?? 'Bệnh viện Trung tâm'} khoảng 500m về phía Đông"\n- Ví dụ sai: "Thi thể được tìm thấy tại ngõ hẻm vắng" (không có trong danh sách landmarks)`

  const suspects = prompt.suspects
    .slice(0, 15)
    .map(
      (suspect) =>
        `- ${suspect.fullName} (${suspect.occupation}, ${suspect.age} tuổi) - Vị trí khai: ${suspect.testimony.locationLabel}. Tọa độ: (${suspect.coordinates.lat.toFixed(4)}, ${suspect.coordinates.lng.toFixed(4)}). Khả nghi: ${suspect.suspicionLevel.toFixed(2)}.`,
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

${localeRule}

${spatialRules}

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
`
}

const buildPhase2Prompt = (payload: Phase2DialogueRequest): string => {
  const suspectLines = payload.suspects
    .map((suspect) => {
      const roleHint = suspect.role === 'killer'
        ? 'Hung thủ'
        : payload.accompliceIds.includes(suspect.id)
          ? 'Đồng phạm'
          : 'Vô tội'
      return `- ${suspect.fullName} (${suspect.occupation}, ${suspect.age} tuổi) • Vai trò bí mật: ${roleHint}. Lời khai trước đó: ${suspect.testimony.narrative}. Địa điểm khai: ${suspect.testimony.locationLabel}.`
    })
    .join('\n')

  const psychologyRules = `QUY TẮC TÂM LÝ HỌC THẨM VẤN:

1. HUNG THỦ (killer):
   - KHÔNG ĐƯỢC từ chối trả lời hoặc tỏ ra né tránh quá rõ ràng
   - Phải có alibi chi tiết và tự tin, nhưng ẩn chứa MỘT mâu thuẫn nhỏ về thời gian hoặc địa điểm
   - Khi bị "pressure": tỏ ra bình tĩnh NHƯNG vô tình tiết lộ chi tiết mà chỉ người có mặt tại hiện trường mới biết
   - Response phải dài và chi tiết, thể hiện sự "quá chuẩn bị" đáng ngờ
   - Có thể đổ lỗi cho người khác một cách tinh vi

2. ĐỒNG PHẠM (accomplice):
   - Có alibi nhưng khi được hỏi chi tiết thì bắt đầu lưỡng lự, thay đổi câu trả lời
   - Khi bị "pressure": bộc lộ lo lắng rõ rệt, có thể vô tình nhắc đến địa điểm ẩn náu "${payload.hideoutLabel}"
   - Tỏ ra bảo vệ hung thủ một cách vô thức (nói tốt về họ quá mức)
   - confession_hook: PHẢI tiết lộ tọa độ ẩn náu và vai trò của họ trong vụ án

3. NGƯỜI VÔ TỘI:
   - Một số người sẽ hợp tác hoàn toàn với chi tiết rõ ràng
   - Một số người sẽ khó chịu, tức giận vì bị làm phiền (RED HERRING)
   - Một số người có thể có alibi yếu nhưng thực sự vô tội
   - Có thể có động cơ ghét nạn nhân nhưng không phải hung thủ
   - QUAN TRỌNG: Ít nhất 2-3 người vô tội phải có hành vi đáng ngờ để tạo red herring

4. ĐA DẠNG HÓA RESPONSE:
   - Mỗi nghi phạm phải có TÍNH CÁCH RIÊNG (nóng tính, trầm lặng, lo âu, kiêu ngạo, thân thiện giả tạo)
   - Response không được dùng cùng một mẫu câu
   - Chiều dài response phải khác nhau (ngắn gọn vs chi tiết)
   - Một số người nói nhiều hơn cần thiết, một số người trả lời cộc lốc`

  const topicBrief = `YÊU CẦU TOPICS:
- Mỗi nghi phạm PHẢI có đúng 3 topics với id: "alibi", "victim_relation", "pressure"
- Topic "alibi": Hỏi về bằng chứng ngoại phạm và lịch trình chi tiết
- Topic "victim_relation": Hỏi về mối quan hệ thực sự với nạn nhân, có thể khai thác bí mật
- Topic "pressure": Gây áp lực tâm lý, đặt câu hỏi mâu thuẫn, thách thức lời khai

QUAN TRỌNG VỀ LOGIC:
- Hung thủ KHÔNG ĐƯỢC dùng mẫu "từ chối cung cấp lịch trình" - quá dễ nhận ra
- Mọi nghi phạm đều PHẢI cung cấp alibi, nhưng độ chi tiết và độ tin cậy khác nhau
- Thứ tự hỏi PHẢI ảnh hưởng đến kết quả: nếu "pressure" trước sẽ khiến nghi phạm phòng thủ hơn`

  return `Bạn là nhà tâm lý học pháp y kiêm biên kịch game trinh thám. Hãy tạo hội thoại thẩm vấn sâu sắc, đa chiều cho vụ án tại ${payload.locationName}. 

NẠN NHÂN: ${payload.victim.fullName}
ĐỊA ĐIỂM ẨN NÁU HUNG THỦ: ${payload.hideoutLabel}

${psychologyRules}

${topicBrief}

FORMAT JSON BẮT BUỘC:
{
  "suspects": [
    {
      "id": "ID nghi phạm (copy chính xác)",
      "dialogue": {
        "intro": "Câu chào mở đầu phản ánh tính cách - không được giống nhau giữa các nghi phạm",
        "topics": [
          {
            "id": "alibi",
            "text": "Hỏi về bằng chứng ngoại phạm",
            "response": "Response chi tiết và có tính cách riêng. Hung thủ phải có alibi chi tiết nhưng có lỗ hổng tinh vi.",
            "clue_reveal": true/false
          },
          {
            "id": "victim_relation", 
            "text": "Hỏi về mối quan hệ với nạn nhân",
            "response": "Khai thác chiều sâu mối quan hệ, có thể tiết lộ bí mật hoặc động cơ",
            "clue_reveal": true/false
          },
          {
            "id": "pressure",
            "text": "Gây áp lực (Hỏi dồn)",
            "response": "Phản ứng dưới áp lực - hung thủ tiết lộ chi tiết hiện trường, đồng phạm hoảng loạn, vô tội tức giận hoặc khóc",
            "is_trap": true
          }
        ],
        "confession_hook": "CHỈ cho đồng phạm - lời thú nhận khi bị lật tẩy, PHẢI nhắc địa điểm ${payload.hideoutLabel}",
        "reset_hint": "Gợi ý chiến thuật mới cho người chơi"
      }
    }
  ]
}

LƯU Ý QUAN TRỌNG:
1. Chỉ trả về JSON hợp lệ, không giải thích
2. ID nghi phạm phải COPY CHÍNH XÁC từ danh sách
3. Mỗi response tối thiểu 50 từ, tối đa 150 từ
4. Tính cách phải nhất quán xuyên suốt 3 topics

DANH SÁCH NGHI PHẠM (10 người cuối cùng):
${suspectLines}`
}

const sanitizeText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const normalizeTopics = (rawTopics: unknown[]): SuspectDialogue['topics'] => {
  return rawTopics.reduce<SuspectDialogue['topics']>((acc, topic) => {
    if (!topic || typeof topic !== 'object') {
      return acc
    }
    const topicObj = topic as Record<string, unknown>
    const id = sanitizeText(topicObj.id)
    const text = sanitizeText(topicObj.text)
    const response = sanitizeText(topicObj.response)
    if (!id || !text || !response) {
      return acc
    }

    acc.push({
      id,
      text,
      response,
      clueReveal: topicObj.clue_reveal === true || topicObj.clueReveal === true,
      isTrap: topicObj.is_trap === true || topicObj.isTrap === true,
    })
    return acc
  }, [])
}

const parsePhase2Dialogues = (text: string): Phase2DialogueMap => {
  try {
    const parsed = JSON.parse(text)
    const entries = Array.isArray(parsed?.suspects)
      ? (parsed.suspects as Array<Record<string, unknown>>)
      : []
    return entries.reduce<Phase2DialogueMap>((acc, entry) => {
      if (!entry || typeof entry !== 'object') {
        return acc
      }
      const id = sanitizeText(entry.id)
      const dialogueRaw = entry.dialogue
      if (!id || !dialogueRaw || typeof dialogueRaw !== 'object') {
        return acc
      }

      const dialogueRecord = dialogueRaw as Record<string, unknown>
      const topicsRaw = Array.isArray(dialogueRecord.topics) ? dialogueRecord.topics : []
      const topics = normalizeTopics(topicsRaw)
      if (!topics.length) {
        return acc
      }

      acc[id] = {
        intro: sanitizeText(dialogueRecord.intro) || 'Cảnh sát à? Hỏi đi, nhưng nhanh lên.',
        topics,
        confessionHook: sanitizeText(dialogueRecord.confession_hook ?? dialogueRecord.confessionHook),
        resetHint: sanitizeText(dialogueRecord.reset_hint ?? dialogueRecord.resetHint),
      }
      return acc
    }, {} as Phase2DialogueMap)
  } catch (error) {
    console.warn('Unable to parse Phase 2 dialogue payload', error)
    return {}
  }
}

const parseResponse = (
  text: string,
  killerId: string,
): { clues: Clue[]; story: string; solution: CaseSolution; caseTitle?: string } => {
  try {
    const parsed = JSON.parse(text)
    return {
      clues: parsed.clues ?? [],
      story: parsed.story ?? '',
      caseTitle: parsed.case_title ?? parsed.caseTitle,
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
      caseTitle: undefined,
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

export const requestGeminiClues = async (
  prompt: GeminiCluePrompt,
  killerId: string,
): Promise<{ clues: Clue[]; story: string; solution: CaseSolution; caseTitle?: string }> => {
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
      caseTitle: 'Hồ sơ vô danh',
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

export const generatePhase2Data = async (
  request: Phase2DialogueRequest,
): Promise<Phase2DialogueMap> => {
  if (!request.suspects.length) {
    return {}
  }

  const key = ensureApiKey()
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildPhase2Prompt(request) }],
        },
      ],
    }),
  })

  if (!response.ok) {
    console.warn('Gemini dialogue generation failed with status', response.status)
    return {}
  }

  const data = (await response.json()) as GeminiContentResponse
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('\n') ?? ''
  const jsonText = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  return parsePhase2Dialogues(jsonText)
}

export const enrichBundleWithClues = async (
  bundle: CaseClueBundle,
): Promise<CaseClueBundle> => {
  const { clues, story, solution, caseTitle } = await requestGeminiClues({
    victim: bundle.victim,
    suspects: bundle.suspects,
    relationships: bundle.relationships,
    seedFacts: bundle.suspects.map((suspect) => ({
      citizenId: suspect.id,
      fact: `${suspect.fullName} khai ở ${suspect.testimony.locationLabel} (${suspect.testimony.timeframe}) và hướng di chuyển: ${suspect.testimony.directionHint ?? 'không rõ'}.`,
    })),
    objectives: [
      'Mỗi manh mối phải nhắc đến ít nhất một nghi phạm hoặc nạn nhân.',
      'Luôn mô tả rõ tọa độ/địa danh để người chơi so đối chiếu với bản đồ.',
      'Không được đề cập thành phố hoặc quốc gia ngoài Hà Nội (Việt Nam) và New York (Hoa Kỳ).',
      'Chỉ sử dụng các địa điểm có trong danh sách LANDMARKS được cung cấp, không tạo tên mới.',
      'Diễn đạt manh mối theo hướng định hướng hoặc khoảng cách (ví dụ: "đi về phía Đông Nam của Bệnh viện Trung tâm", "trong bán kính 2km từ Nhà thờ cổ", "nằm giữa Ga tàu điện ngầm và Quán Bar ven sông").',
      'Mọi lời khai của đồng phạm phải khớp với vị trí hoặc quãng đường của hung thủ, không được mâu thuẫn về địa điểm.',
      `Sinh ra manh mối phụ trợ cho tuyến đồng phạm (có ${bundle.accompliceCount} người) để người chơi phát hiện sự mâu thuẫn.`,
      `Khi kết luận cuối cùng hãy nhắc tới mật danh khu ẩn náu "${bundle.hideoutHint.label}".`,
    ],
    locationName: bundle.locationName,
    locale: bundle.locale,
    accompliceCount: bundle.accompliceCount,
    hideoutLabel: bundle.hideoutHint.label,
    landmarks: bundle.landmarks,
  }, bundle.killer.id)

  const normalized = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')

  const landmarkIndex = bundle.landmarks.reduce<Record<string, Landmark>>((acc, landmark) => {
    acc[normalized(landmark.label)] = landmark
    acc[normalized(landmark.name)] = landmark
    return acc
  }, {})

  const resolveLandmark = (label: string): Landmark | undefined => {
    const normalizedLabel = normalized(label)
    if (landmarkIndex[normalizedLabel]) {
      return landmarkIndex[normalizedLabel]
    }
    return bundle.landmarks.find((landmark) => normalizedLabel.includes(normalized(landmark.name)))
  }

  const attachLandmarkHint = (landmark: Landmark, hint?: MapHint): MapHint => ({
    id: hint?.id ?? `ai-hint-${landmark.id}`,
    label: landmark.label,
    point: { ...landmark.coordinates },
    radiusMeters: hint?.radiusMeters ?? 900,
  })

  const sanitisedClues = clues.map((clue, index) => {
    const availableHints = Array.isArray(clue.mapHints) ? clue.mapHints : []
    const remappedHints = availableHints
      .map((hint) => {
        const matched = hint?.label ? resolveLandmark(hint.label) : undefined
        return matched ? attachLandmarkHint(matched, hint) : undefined
      })
      .filter((hint): hint is MapHint => Boolean(hint))

    if (remappedHints.length > 0) {
      return {
        ...clue,
        mapHints: remappedHints,
      }
    }

    const fallbackLandmark = bundle.landmarks.length
      ? bundle.landmarks[index % bundle.landmarks.length]
      : undefined
    return {
      ...clue,
      mapHints: fallbackLandmark ? [attachLandmarkHint(fallbackLandmark)] : [],
    }
  })

  return ensureBundleCaseTitle({
    ...bundle,
    clueDrafts: sanitisedClues,
    story,
    solution,
    caseTitle: caseTitle ?? bundle.caseTitle,
  })
}
