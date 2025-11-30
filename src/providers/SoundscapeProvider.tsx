import { createContext, useCallback, useContext, useMemo, useRef, useState, type PropsWithChildren } from 'react'

type EffectType = 'ui-select' | 'ui-confirm' | 'ui-error'

type SoundscapeContextValue = {
  musicVolume: number
  effectsVolume: number
  setMusicVolume: (value: number) => void
  setEffectsVolume: (value: number) => void
  ensureSoundscape: () => Promise<void>
  triggerEffect: (type?: EffectType) => void
}

const SoundscapeContext = createContext<SoundscapeContextValue | undefined>(undefined)

const clampVolume = (value: number) => Math.min(1, Math.max(0, value))

export const SoundscapeProvider = ({ children }: PropsWithChildren) => {
  const [musicVolume, setMusicVolumeState] = useState(0.6)
  const [effectsVolume, setEffectsVolumeState] = useState(0.75)
  const audioContextRef = useRef<AudioContext | null>(null)
  const musicGainRef = useRef<GainNode | null>(null)
  const effectGainRef = useRef<GainNode | null>(null)
  const ambienceNodesRef = useRef<OscillatorNode[]>([])

  const hydrateGains = useCallback(() => {
    if (!audioContextRef.current) return
    if (musicGainRef.current) {
      musicGainRef.current.gain.linearRampToValueAtTime(clampVolume(musicVolume), audioContextRef.current.currentTime + 0.2)
    }
    if (effectGainRef.current) {
      effectGainRef.current.gain.linearRampToValueAtTime(clampVolume(effectsVolume), audioContextRef.current.currentTime + 0.05)
    }
  }, [effectsVolume, musicVolume])

  const ensureSoundscape = useCallback(async () => {
    if (!audioContextRef.current) {
      const ctx = new AudioContext()
      audioContextRef.current = ctx

      const musicGain = ctx.createGain()
      musicGain.gain.value = musicVolume
      musicGain.connect(ctx.destination)
      musicGainRef.current = musicGain

      const fxGain = ctx.createGain()
      fxGain.gain.value = effectsVolume
      fxGain.connect(ctx.destination)
      effectGainRef.current = fxGain

      const createDrone = (frequency: number, detune: number) => {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = frequency
        osc.detune.value = detune
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 800
        osc.connect(filter)
        filter.connect(musicGain)
        osc.start()
        return osc
      }

      const baseFrequency = ctx.sampleRate < 44100 ? 92 : 110
      ambienceNodesRef.current = [
        createDrone(baseFrequency, -15),
        createDrone(baseFrequency * 1.5, -30),
        createDrone(baseFrequency * 0.75, 12),
      ]
    }

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume()
    }

    hydrateGains()
  }, [effectsVolume, hydrateGains, musicVolume])

  const triggerEffect = useCallback(
    (type: EffectType = 'ui-select') => {
      const ctx = audioContextRef.current
      const fxGain = effectGainRef.current
      if (!ctx || !fxGain) return

      const now = ctx.currentTime
      const burst = ctx.createOscillator()
      const gain = ctx.createGain()

      burst.type = type === 'ui-confirm' ? 'triangle' : type === 'ui-error' ? 'sawtooth' : 'sine'
      burst.frequency.setValueAtTime(type === 'ui-error' ? 220 : 440, now)
      burst.frequency.exponentialRampToValueAtTime(type === 'ui-error' ? 160 : 880, now + 0.15)

      gain.gain.value = 0.0001
      gain.gain.exponentialRampToValueAtTime(0.4, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3)

      burst.connect(gain)
      gain.connect(fxGain)
      burst.start(now)
      burst.stop(now + 0.35)
    },
    [],
  )

  const setMusicVolume = useCallback(
    (value: number) => {
      setMusicVolumeState(clampVolume(value))
      if (audioContextRef.current && musicGainRef.current) {
        musicGainRef.current.gain.linearRampToValueAtTime(clampVolume(value), audioContextRef.current.currentTime + 0.2)
      }
    },
    [],
  )

  const setEffectsVolume = useCallback(
    (value: number) => {
      setEffectsVolumeState(clampVolume(value))
      if (audioContextRef.current && effectGainRef.current) {
        effectGainRef.current.gain.linearRampToValueAtTime(clampVolume(value), audioContextRef.current.currentTime + 0.1)
      }
    },
    [],
  )

  const value = useMemo(
    () => ({ musicVolume, effectsVolume, ensureSoundscape, triggerEffect, setMusicVolume, setEffectsVolume }),
    [effectsVolume, ensureSoundscape, musicVolume, setEffectsVolume, setMusicVolume, triggerEffect],
  )

  return <SoundscapeContext.Provider value={value}>{children}</SoundscapeContext.Provider>
}

export const useSoundscape = () => {
  const context = useContext(SoundscapeContext)
  if (!context) {
    throw new Error('useSoundscape must be used within a SoundscapeProvider')
  }
  return context
}
