/**
 * Contrast audit for the stylesheet.
 *
 * Run with `npm run audit`. The script resolves the `--rma-*` tokens, walks
 * `src/app.css` in source order so that the last declaration of a selector wins
 * (exactly like the cascade) and then checks every text colour against the
 * surface it is painted on: the background from the same rule, otherwise the
 * background of the nearest ancestor that paints one, otherwise the page
 * surface. Grid rules that gap their cards with the 1px hairline (`--rule-hair`
 * or a literal `1px`) paint that rule between the cards rather than the surface
 * behind their text, so they do not count. Pseudo-element bullets
 * and the watermark number are decoration and are skipped. It exits with code 1
 * as soon as one pair misses WCAG 2.2 AA (4.5:1).
 *
 * Colours that come from the data (line, fleet and mode colours) are set inline
 * by the views, so they are listed at the end instead of being guessed;
 * `pnpm verify` checks those against `readableTextColor()`.
 *
 * Pass a path as the first argument to audit a different stylesheet, which is
 * how the failure path of this script is tested by hand.
 */
import { readFileSync } from 'node:fs'
import { contrastRatio } from '../src/lib/network.ts'

const css = readFileSync(process.argv[2] ?? new URL('../src/app.css', import.meta.url), 'utf8')

/** Fallback surface: the page background painted by `:root`. */
const PAGE = '#f4f1eb'

/** Hairline rule between grid cards. The exception below only holds while the
    token really is one pixel, otherwise the band could show as a surface. */
const ruleHair = /\s*--rule-hair\s*:\s*([^;]+)/.exec(css)?.[1].trim()
if (ruleHair !== '1px') {
  throw new Error(`src/app.css sets --rule-hair to ${ruleHair ?? 'nothing'}; the grid hairline exception needs it to be 1px`)
}

/** A grid that separates its cards with that hairline. */
const hairlineGap = /gap\s*:\s*(?:1px|var\(\s*--rule-hair\s*\))/

const tokens = new Map<string, string>()
for (const [, name, value] of css.matchAll(/--([a-z-]+)\s*:\s*(#[0-9a-f]{6})/gi)) tokens.set(name, value.toLowerCase())

/** Reads a design token and fails loudly if it was renamed without updating this script. */
function token(name: string): string {
  const value = tokens.get(name)
  if (!value) throw new Error(`src/app.css no longer defines --${name}`)
  return value
}

/** Resolves `var(--rma-muted)` to the token value. Variables that a view sets
    inline (line, fleet and mode colours) depend on runtime data, so they are
    reported instead of guessed; an unknown name is a typo and stops the audit. */
const RUNTIME = new Set(['line', 'line-ink', 'vehicle', 'mode', 'mode-ink'])
const dynamic = new Set<string>()

function resolve(value: string): string | null {
  const variable = /var\(\s*--([a-z-]+)\s*(?:,[^)]*)?\)/i.exec(value)
  if (!variable) return value.toLowerCase()
  const name = variable[1]
  if (tokens.has(name)) return tokens.get(name) ?? null
  if (RUNTIME.has(name)) {
    dynamic.add(name)
    return null
  }
  throw new Error(`src/app.css uses var(--${name}), which is neither a token in :root nor a colour a view sets inline`)
}

type Colours = { color: string | null; background: string | null; hairline: boolean }

const declared = new Map<string, Colours>()
for (const rule of css.match(/[^{}]+\{[^{}]*\}/g) ?? []) {
  const open = rule.indexOf('{')
  const body = rule.slice(open + 1, -1)
  const selectors = rule.slice(0, open).split(',').map((part) => part.trim()).filter(Boolean)
  const own: Colours = { color: null, background: null, hairline: hairlineGap.test(body) }
  for (const declaration of body.split(';')) {
    const text = /^\s*color\s*:\s*(.+?)\s*$/.exec(declaration)
    if (text && /^(var\(|#)/.test(text[1])) own.color = resolve(text[1])
    const fill = /^\s*background(?:-color)?\s*:\s*(.+?)\s*$/.exec(declaration)
    if (fill && /^(var\(|#)/.test(fill[1])) own.background = resolve(fill[1])
  }
  // A selector list applies to every selector in it, so each one is recorded on
  // its own and later rules overwrite earlier ones.
  for (const selector of selectors) {
    const entry = declared.get(selector) ?? { color: null, background: null, hairline: false }
    if (own.color) entry.color = own.color
    if (own.background) entry.background = own.background
    if (own.hairline) entry.hairline = true
    declared.set(selector, entry)
  }
}

/** Decoration, not content: the watermark line number on a line page. */
const DECORATIVE = new Set(['.large-route'])

/** The surface a selector is painted on: its own background when the rule paints
    one, otherwise the background of its nearest ancestor that does. Anything
    left over falls back to the page surface, so light text without a dark
    ancestor is reported instead of guessed. */
function surfaceFor(selector: string, own: string | null): string | null {
  if (own) return own
  const parts = selector.split(/\s+|>/).filter((part) => part && !part.startsWith(':'))
  for (let index = parts.length - 1; index > 0; index--) {
    const ancestor = declared.get(parts.slice(0, index).join(' '))
    // `gap:1px` backgrounds draw the hairline between grid cards, not the
    // surface behind their text, so keep looking upwards.
    if (ancestor?.background && !ancestor.hairline) return ancestor.background
  }
  return PAGE
}

const failures: string[] = []
for (const [selector, entry] of declared) {
  if (!entry.color) continue
  // Generated bullets and watermarks are decoration, not text content.
  if (selector.includes('::') || DECORATIVE.has(selector)) continue
  const background = surfaceFor(selector, entry.background)
  if (!background || background === entry.color) continue
  const ratio = contrastRatio(entry.color, background)
  if (ratio < 4.5) failures.push(`${selector}: ${entry.color} on ${background} is only ${ratio.toFixed(2)}:1`)
}

if (failures.length > 0) {
  console.error(`\u2717 ${failures.length} text colour(s) below 4.5:1:`)
  for (const failure of failures) console.error(`  - ${failure}`)
  console.error('\nUse a token from :root (--rma-ink, --rma-muted, --rma-red-ink, --rma-green-ink) instead of a fixed hex value.')
  process.exit(1)
}

const pairs: Array<[string, string, string]> = [
  ['ink on the page surface', token('rma-ink'), PAGE],
  ['ink on Ruhrenberg Yellow', token('rma-ink'), token('rma-yellow')],
  ['secondary copy on the page', token('rma-muted'), PAGE],
  ['accent red on the page', token('rma-red-ink'), PAGE],
  ['status green on the page', token('rma-green-ink'), PAGE],
]

console.log('\u2713 every text colour in src/app.css reaches 4.5:1 on its surface\n')
console.log(`${declared.size} selectors · ${tokens.size} tokens resolved\n`)
for (const [label, foreground, background] of pairs) {
  console.log(`${label.padEnd(28)}${contrastRatio(foreground, background).toFixed(2)}:1`)
}
if (dynamic.size > 0) {
  console.log(`\nSet inline by the views, so checked by \`npm run verify\` instead: ${[...dynamic].map((name) => `--${name}`).join(', ')}`)
}
