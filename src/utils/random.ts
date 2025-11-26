export type RNG = () => number

export const mulberry32 = (seed: number): RNG => {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let x = Math.imul(t ^ (t >>> 15), t | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

export const randomInt = (max: number, rng: RNG) => Math.floor(rng() * max)

export const pickRandomItems = <T>(items: T[], count: number, rng: RNG): T[] => {
  const source = [...items]
  const picked: T[] = []

  while (source.length && picked.length < count) {
    const idx = randomInt(source.length, rng)
    picked.push(source.splice(idx, 1)[0])
  }

  return picked
}
