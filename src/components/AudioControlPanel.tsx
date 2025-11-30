import { memo, useCallback, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { useSoundscape } from '@/providers/SoundscapeProvider'

interface AudioControlPanelProps {
  onInteract?: () => void
}

export const AudioControlPanel = memo(({ onInteract }: AudioControlPanelProps) => {
  const { musicVolume, effectsVolume, setMusicVolume, setEffectsVolume } = useSoundscape()

  const handleMusicChange = useCallback(
    (value: number) => {
      setMusicVolume(value)
      onInteract?.()
    },
    [onInteract, setMusicVolume],
  )

  const handleEffectsChange = useCallback(
    (value: number) => {
      setEffectsVolume(value)
      onInteract?.()
    },
    [onInteract, setEffectsVolume],
  )

  const stepAdjust = (current: number, delta: number) => Math.min(1, Math.max(0, Number((current + delta).toFixed(2))))

  return (
    <motion.section
      className="audio-control-panel"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        marginTop: '1.25rem',
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(148, 163, 184, 0.3)',
        borderRadius: '6px',
        padding: '0.9rem',
        color: '#e2e8f0',
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.3)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '0.85rem', letterSpacing: '0.08em', color: '#94a3b8' }}>ĐIỀU KHIỂN ÂM LƯỢNG</span>
      </header>

      <div style={{ display: 'grid', gap: '0.9rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#fbbf24' }}>Nhạc nền</span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={() => handleMusicChange(stepAdjust(musicVolume, -0.1))}
                style={buttonStyle}
                aria-label="Giảm âm lượng nhạc nền"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => handleMusicChange(stepAdjust(musicVolume, 0.1))}
                style={buttonStyle}
                aria-label="Tăng âm lượng nhạc nền"
              >
                +
              </button>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={musicVolume}
            onChange={(event) => handleMusicChange(Number(event.currentTarget.value))}
            style={sliderStyle}
          />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#38bdf8' }}>Hiệu ứng</span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={() => handleEffectsChange(stepAdjust(effectsVolume, -0.1))}
                style={buttonStyle}
                aria-label="Giảm âm lượng hiệu ứng"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => handleEffectsChange(stepAdjust(effectsVolume, 0.1))}
                style={buttonStyle}
                aria-label="Tăng âm lượng hiệu ứng"
              >
                +
              </button>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={effectsVolume}
            onChange={(event) => handleEffectsChange(Number(event.currentTarget.value))}
            style={sliderStyle}
          />
        </div>
      </div>
    </motion.section>
  )
})

AudioControlPanel.displayName = 'AudioControlPanel'

const buttonStyle: CSSProperties = {
  width: '1.8rem',
  height: '1.8rem',
  borderRadius: '999px',
  border: '1px solid rgba(148, 163, 184, 0.4)',
  background: 'rgba(15, 23, 42, 0.6)',
  color: '#e2e8f0',
  cursor: 'pointer',
  fontSize: '1.1rem',
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'transform 0.2s ease, background 0.2s ease',
}

const sliderStyle: CSSProperties = {
  width: '100%',
  cursor: 'pointer',
  accentColor: '#f97316',
}
