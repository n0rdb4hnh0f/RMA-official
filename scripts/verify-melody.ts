/**
 * Data checks for the RMA platform sound library.
 *
 * `src/lib/melody.ts` is what the station page prints; `public/melody` is what a
 * browser actually downloads. This script reads the WAV headers instead of
 * trusting either side, so a melody can never advertise a length the recording
 * does not have, and a recording can never sit in the repository that no page
 * mentions — the same contract `verify-network.ts` keeps for the line colours.
 *
 * Run with `npm run verify`. Node 24 strips the TypeScript types itself, so the
 * script needs no build step and no test framework. It exits with code 1 as soon
 * as the library and the published files disagree, which makes it usable in CI.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { melodies } from '../src/lib/melody.ts'

const failures: string[] = []
const check = (condition: boolean, message: string): void => {
  if (!condition) failures.push(message)
}

/** The recordings are published from `public/` at the site root. */
const soundDirectory = new URL('../public/melody/', import.meta.url)

/* -------------------------------------------------------------- recordings --- */

type Wav = { seconds: number; sampleRate: number; channels: number; bitsPerSample: number; encoding: number; silent: boolean; bytes: number }

/** wFormatTag values that mean the audio is stored uncompressed. */
const ENCODINGS: Record<number, string | undefined> = { 1: 'PCM', 3: 'float', 0xfffe: 'extensible PCM' }

/**
 * A RIFF file is a sequence of chunks: four ASCII bytes, a little-endian size,
 * then the body. `fmt ` describes the sample format, `data` carries the audio,
 * and the duration is the size of `data` divided by the sample rate, so the
 * length is read from the recording rather than assumed.
 */
function readWav(file: URL): Wav {
  const buffer = readFileSync(file)
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not a RIFF/WAVE file')
  let format: { encoding: number; channels: number; sampleRate: number; bitsPerSample: number } | null = null
  let audio = buffer.subarray(0, 0)
  let offset = 12
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4)
    const size = buffer.readUInt32LE(offset + 4)
    const body = offset + 8
    if (id === 'fmt ' && size >= 16) {
      format = {
        encoding: buffer.readUInt16LE(body),
        channels: buffer.readUInt16LE(body + 2),
        sampleRate: buffer.readUInt32LE(body + 4),
        bitsPerSample: buffer.readUInt16LE(body + 14),
      }
    } else if (id === 'data') {
      audio = buffer.subarray(body, body + Math.min(size, buffer.length - body))
    }
    offset = body + size + (size % 2) // every chunk is padded to an even length
  }
  if (!format) throw new Error('no fmt chunk')
  const bytesPerSecond = format.sampleRate * format.channels * (format.bitsPerSample / 8)
  return { ...format, seconds: audio.length / bytesPerSecond, silent: !audio.some((byte) => byte !== 0), bytes: buffer.length }
}

/* ------------------------------------------------------------------ library --- */

const published = readdirSync(soundDirectory).filter((name) => name.toLowerCase().endsWith('.wav'))
const advertised = new Set(melodies.map((melody) => melody.file.replace('/melody/', '')))

check(melodies.length > 0, 'sound: no platform melodies are defined')
check(new Set(melodies.map((melody) => melody.id)).size === melodies.length, 'sound: every melody needs its own event id')
check(melodies.map((melody) => melody.id).join(',') === 'arrival,departure,passing', 'sound: a platform announces three events: arrival, departure and passing')

const rows: string[] = []
let bytes = 0
for (const melody of melodies) {
  const name = melody.file.replace('/melody/', '')
  check(melody.file === `/melody/${name}` && name.endsWith('.wav'), `sound: ${melody.label} must be published as a .wav under /melody/`)
  check(melody.label.trim().length > 0 && melody.description.trim().length > 0, `sound: ${melody.id} needs a label and a description`)
  check(melody.seconds > 0 && melody.seconds <= 15, `sound: ${melody.id} must be a short platform melody, not ${melody.seconds}s`)

  const file = new URL(name, soundDirectory)
  check(existsSync(file), `sound: ${melody.file} is advertised by src/lib/melody.ts but not published`)
  if (!existsSync(file)) continue

  let wav: Wav | null = null
  try {
    wav = readWav(file)
  } catch (error) {
    failures.push(`sound: ${name} could not be read (${error instanceof Error ? error.message : String(error)})`)
  }
  if (!wav) continue

  const encoding = ENCODINGS[wav.encoding] ?? `unknown (${wav.encoding})`
  bytes += wav.bytes
  check(Math.abs(wav.seconds - melody.seconds) <= 0.01, `sound: ${melody.label} declares ${melody.seconds}s but ${name} is ${wav.seconds.toFixed(3)}s long`)
  check(ENCODINGS[wav.encoding] !== undefined, `sound: ${name} must be stored uncompressed, found encoding ${wav.encoding}`)
  check(wav.channels > 0 && wav.sampleRate > 0 && wav.bitsPerSample > 0, `sound: ${name} has no usable sample format`)
  check(!wav.silent, `sound: ${name} contains no audio`)

  rows.push(
    `${melody.label.padEnd(11)}${melody.id.padEnd(11)}${melody.file.padEnd(24)}${`${melody.seconds.toFixed(2)} s`.padStart(9)}${`${wav.seconds.toFixed(3)} s`.padStart(12)}   ${wav.sampleRate} Hz · ${wav.channels} ch · ${wav.bitsPerSample} bit · ${encoding}`,
  )
}

for (const name of published) check(advertised.has(name), `sound: public/melody/${name} is not advertised by src/lib/melody.ts`)

/* ------------------------------------------------------------------ report --- */

if (failures.length > 0) {
  console.error(`\u2717 ${failures.length} platform sound problem(s):`)
  for (const failure of failures) console.error(`  - ${failure}`)
  console.error('\nKeep src/lib/melody.ts and public/melody in step: the file, the length it declares and the recording itself are one fact.')
  process.exit(1)
}

console.log('\u2713 the platform sound library matches the published recordings\n')
console.log('melody     event      file                    declared   recording   format')
for (const row of rows) console.log(row)
console.log(`\n${melodies.length} melodies · ${published.length} recordings · ${(bytes / 1048576).toFixed(1)} MB, downloaded only when a passenger asks for a melody`)
