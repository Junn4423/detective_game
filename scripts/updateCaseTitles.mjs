import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const casesDir = path.resolve(process.cwd(), 'src', 'cases')

const prefixPool = ['Hồ sơ', 'Vụ án', 'Chiến dịch', 'Mật danh', 'Chuyên án']
const moodPool = ['Bóng Đêm', 'Sương Mù', 'Hoàng Hôn', 'Lửa Ngầm', 'Dạ Hành', 'Vệt Khói']

const mulberry32 = (seed) => {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let x = Math.imul(t ^ (t >>> 15), t | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

const toSeed = (value) => Array.from(value).reduce((sum, char, idx) => sum + char.charCodeAt(0) * (idx + 1), 0)

const createCaseTitle = (bundle) => {
  const victim = bundle?.victim
  if (!victim) return 'Hồ sơ vô danh'
  const seed = toSeed(victim.victimId ?? victim.id ?? victim.fullName ?? 'case')
  const rng = mulberry32(seed)
  const prefix = prefixPool[Math.floor(rng() * prefixPool.length)]
  const mood = moodPool[Math.floor(rng() * moodPool.length)]
  const location = bundle.locationName ?? victim.residence ?? 'Đô thị ẩn danh'
  const surname = victim.fullName?.trim()?.split(/\s+/)?.pop() ?? victim.fullName ?? 'Ẩn danh'
  return `${prefix} ${mood} ${location} - ${surname}`
}

const ensureTitle = (record) => {
  const bundle = record.bundle
  if (!bundle) return record
  const existing = (record.title || bundle.caseTitle || '').trim()
  const title = existing || createCaseTitle(bundle)
  record.title = title
  bundle.caseTitle = title
  return record
}

const main = async () => {
  await mkdir(casesDir, { recursive: true })
  const files = await readdir(casesDir)
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const filePath = path.join(casesDir, file)
    try {
      const content = await readFile(filePath, 'utf8')
      const record = JSON.parse(content)
      ensureTitle(record)
      await writeFile(filePath, JSON.stringify(record, null, 2), 'utf8')
      console.log('Updated case title:', record.caseCode ?? file)
    } catch (error) {
      console.error('Failed to update title for', file, error)
    }
  }
}

main()
