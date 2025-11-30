import { useEffect, useMemo, useRef, useState } from 'react'
import type { SuspectDialogue, SuspectDialogueTopic, SuspectProfile } from '@/types/game'
import { motion } from 'framer-motion'

interface SuspectChatDialogProps {
  suspect: SuspectProfile
  onClose: () => void
  onAccuse: (suspectId: string) => void
  onIdentifyAccomplice: (suspectId: string) => void
  accompliceFeedback?: string
  accompliceFeedbackTargetId?: string
  accompliceFound: boolean
  identifiedAccompliceId?: string
}

interface TranscriptEntry {
  id: string
  speaker: 'detective' | 'suspect'
  text: string
  emphasis?: boolean
  topicId?: string
}

const buildFallbackDialogue = (suspect: SuspectProfile): SuspectDialogue => {
  const testimonyLine = suspect.testimony?.narrative ?? 'Tôi đã khai xong rồi.'
  return {
    intro: 'Cảnh sát à? Tôi đang bận. Nói nhanh đi.',
    topics: [
      {
        id: 'alibi',
        text: 'Hỏi về bằng chứng ngoại phạm',
        response: testimonyLine,
      },
      {
        id: 'victim_relation',
        text: 'Hỏi về mối quan hệ với nạn nhân',
        response: `Chúng tôi chỉ là ${suspect.testimony?.relationshipSummary ?? 'mối quan hệ xã giao'}`,
      },
      {
        id: 'pressure',
        text: 'Gây áp lực (Hỏi dồn)',
        response: 'Anh nghĩ tôi sẽ sợ à?',
        isTrap: true,
      },
    ],
    confessionHook: suspect.secondaryTestimony?.narrative,
    resetHint: 'Hãy đổi chủ đề để khai thác thêm.',
  }
}

const generateId = (suffix: string) => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${suffix}`

export const SuspectChatDialog = ({
  suspect,
  onClose,
  onAccuse,
  onIdentifyAccomplice,
  accompliceFeedback,
  accompliceFeedbackTargetId,
  accompliceFound,
  identifiedAccompliceId,
}: SuspectChatDialogProps) => {
  const dialogue = useMemo<SuspectDialogue>(() => suspect.dialogue ?? buildFallbackDialogue(suspect), [suspect])
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([
    { id: generateId('intro'), speaker: 'suspect', text: dialogue.intro || 'Có chuyện gì? Tôi đã khai rồi.' },
  ])
  const transcriptRef = useRef<HTMLDivElement | null>(null)
  const underPressure = useMemo(() => transcript[transcript.length - 1]?.topicId === 'pressure', [transcript])

  useEffect(() => {
    setTranscript([{ id: generateId('intro'), speaker: 'suspect', text: dialogue.intro || 'Có chuyện gì? Tôi đã khai rồi.' }])
  }, [dialogue, suspect.id])

  useEffect(() => {
    const node = transcriptRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [transcript])

  useEffect(() => {
    if (accompliceFound && suspect.id === identifiedAccompliceId && dialogue.confessionHook) {
      const confession = dialogue.confessionHook
      setTranscript((prev) => {
        const exists = prev.some((entry) => entry.topicId === 'confession')
        if (exists) return prev
        return [
          ...prev,
          {
            id: generateId('confession'),
            speaker: 'suspect',
            text: confession,
            emphasis: true,
            topicId: 'confession',
          },
        ]
      })
    }
  }, [accompliceFound, identifiedAccompliceId, dialogue.confessionHook, suspect.id])

  const handleTopicSelect = (topic: SuspectDialogueTopic) => {
    setTranscript((prev) => [
      ...prev,
      {
        id: generateId(`${topic.id}-prompt`),
        speaker: 'detective',
        text: topic.text,
        topicId: topic.id,
      },
      {
        id: generateId(`${topic.id}-reply`),
        speaker: 'suspect',
        text: topic.response,
        emphasis: topic.clueReveal,
        topicId: topic.id,
      },
    ])
  }

  const handleResetConversation = () => {
    setTranscript([{ id: generateId('intro'), speaker: 'suspect', text: dialogue.intro || 'Có chuyện gì? Tôi đã khai rồi.' }])
  }

  const disableAccompliceButton = accompliceFound

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.92)',
        zIndex: 1100,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'clamp(0.5rem, 2vw, 2rem)',
        overflow: 'auto',
      }}
    >
      <div
        style={{
          width: 'min(960px, calc(100vw - 1rem))',
          maxHeight: 'calc(100vh - 1rem)',
          background: '#0f172a',
          borderRadius: '12px',
          border: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 45px rgba(0,0,0,0.55)',
          overflow: 'hidden',
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #1e293b', color: '#f8fafc' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', letterSpacing: '0.12em', color: '#94a3b8' }}>PHÒNG HỎI CUNG</p>
            <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.5rem' }}>{suspect.fullName}</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>{suspect.occupation}</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: '1px solid rgba(148,163,184,0.3)', color: '#94a3b8', borderRadius: '999px', width: '36px', height: '36px', cursor: 'pointer' }}
          >
            ×
          </button>
        </header>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'minmax(200px, 260px) 1fr',
          flex: 1, 
          minHeight: 0,
          overflow: 'hidden',
        }}
        className="interrogation-grid"
        >
          <div style={{ 
            padding: 'clamp(0.75rem, 2vw, 1.5rem)', 
            borderRight: '1px solid #1e293b', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.75rem', 
            color: '#e2e8f0',
            overflowY: 'auto',
            minHeight: 0,
          }}>
            <motion.img
              key={suspect.id}
              src={suspect.portrait}
              alt={suspect.fullName}
              style={{ 
                width: '100%', 
                maxWidth: '220px',
                aspectRatio: '1',
                borderRadius: '10px', 
                objectFit: 'cover', 
                border: '1px solid rgba(148,163,184,0.25)',
                margin: '0 auto',
              }}
              animate={underPressure ? { x: [-2, 2, -2] } : { x: 0 }}
              transition={{ repeat: underPressure ? Infinity : 0, duration: 0.35 }}
            />
            <div style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              <p style={{ margin: 0 }}><strong>Quan hệ:</strong> {suspect.testimony?.relationshipSummary ?? 'Chưa rõ'}</p>
              <p style={{ margin: '0.2rem 0 0 0' }}><strong>Địa điểm:</strong> {suspect.testimony?.locationLabel ?? '---'}</p>
              <p style={{ margin: '0.2rem 0 0 0' }}><strong>Khung giờ:</strong> {suspect.testimony?.timeframe ?? '---'}</p>
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={() => onIdentifyAccomplice(suspect.id)}
                disabled={disableAccompliceButton}
                style={{
                  padding: '0.75rem 1rem',
                  border: 'none',
                  borderRadius: '6px',
                  background: disableAccompliceButton ? '#475569' : '#f97316',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: disableAccompliceButton ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.08em',
                }}
              >
                XÁC NHẬN ĐỒNG PHẠM
              </button>
              <button
                onClick={() => onAccuse(suspect.id)}
                style={{
                  padding: '0.65rem 1rem',
                  border: '1px solid rgba(239,68,68,0.6)',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: '#fca5a5',
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
              >
                BUỘC TỘI HUNG THỦ
              </button>
            </div>
          </div>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            padding: 'clamp(0.75rem, 2vw, 1.5rem)', 
            gap: '0.75rem',
            minHeight: 0,
            overflow: 'hidden',
          }}>
            <div ref={transcriptRef} style={{ 
              flex: 1, 
              overflowY: 'auto', 
              paddingRight: '0.5rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.6rem',
              minHeight: '150px',
            }}>
              {transcript.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    alignSelf: entry.speaker === 'detective' ? 'flex-end' : 'flex-start',
                    background: entry.speaker === 'detective' ? '#f97316' : '#1e293b',
                    color: entry.speaker === 'detective' ? '#0f172a' : '#e2e8f0',
                    padding: '0.5rem 0.75rem',
                    borderRadius: entry.speaker === 'detective' ? '16px 0 16px 16px' : '0 16px 16px 16px',
                    maxWidth: 'min(75%, 400px)',
                    border: entry.emphasis ? '1px solid #facc15' : '1px solid transparent',
                    boxShadow: entry.emphasis ? '0 0 12px rgba(250,204,21,0.35)' : 'none',
                    fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                  }}
                >
                  {entry.text}
                </div>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {dialogue.topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => handleTopicSelect(topic)}
                    style={{
                      border: '1px solid rgba(148,163,184,0.4)',
                      borderRadius: '999px',
                      padding: '0.45rem 0.9rem',
                      background: topic.id === 'pressure' ? 'rgba(248,113,113,0.1)' : 'transparent',
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    {topic.text}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                <span>{dialogue.resetHint ?? 'Đổi chủ đề nếu cuộc trò chuyện bế tắc.'}</span>
                <button
                  onClick={handleResetConversation}
                  style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontWeight: 700 }}
                >
                  Reset hội thoại
                </button>
              </div>
            </div>
            {accompliceFeedback && accompliceFeedbackTargetId === suspect.id ? (
              <div style={{ padding: '0.8rem 1rem', borderRadius: '6px', background: 'rgba(248,113,113,0.12)', color: '#fecaca', fontSize: '0.85rem' }}>
                {accompliceFeedback}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
