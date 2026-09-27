# design.md — RMA site design system

The single declaration of the system the stylesheet implements. `src/app.css` is
the source of truth for every value below; this file says *why* those values are
the ones in the file. If the two ever disagree, the stylesheet is wrong.

## Genre and macrostructure

| | |
| --- | --- |
| Genre | Editorial civic. A public transport authority reads as a broadsheet: facts, schedules, codes, tables. |
| Macrostructure | **N6 · newspaper masthead**, then **stacked section heads** (rule, heading, optional link, content). |
| Nav | One wordmark, one link row, one double rule. The link row is the only nav; there is no second menu system. |
| Accent budget | Ruhrenberg Yellow appears three times per view: the masthead wordmark, the primary CTA fill, the 2px rule under the hero headline. Everything else that carries colour is data. |
| Colour ownership | Line, mode and vehicle colours are set inline by the views (`--line`, `--line-ink`, `--mode`, `--mode-ink`, `--vehicle`) and never written as literals in CSS. |

## Theme

| Token | Value | Use |
| --- | --- | --- |
| `--rma-paper` | `#f4f1eb` | page surface (warm) |
| `--rma-field` | `#faf9f5` | input and select fill |
| `--rma-surface` | `#e6ebe8` | cards, planner, hero diagram (cool) |
| `--rma-surface-2` | `#dfe6e5` | illustration shading |
| `--rma-ink` | `#192b36` | text and dark surfaces |
| `--rma-ink-2` | `#263f49` | station codes, footer |
| `--rma-muted` | `#556269` | secondary copy, 5.58:1 on paper |
| `--rma-rule` / `--rma-rule-2` | `#d9d9d2` / `#c2cdc9` | hairlines / field borders |
| `--rma-yellow` / `--rma-yellow-deep` | `#fff12b` / `#e6d915` | accent and its pressed tone |
| `--rma-red` / `--rma-red-ink` / `--rma-red-hover` | `#df493d` / `#b3372b` / `#8f2b23` | Service Red: brand specimen / small text and small fills (5.33:1 on paper) / hover |
| `--rma-green-ink` | `#2f7355` | status |

Exactly one Service Red family and one ink family. The values printed on the
brand page are the values in this table — the page and the stylesheet cannot
drift apart.

## Type

| Role | Family | Notes |
| --- | --- | --- |
| Functional | DM Sans | headings, body, buttons, nav |
| Codes, times, labels | DM Mono | line ids, clocks, platform codes, small labels |
| Masthead wordmark | Playfair Display | the `RMA` wordmark in the header only, roman 600 |

- Headings are roman. No `<em>`/`<i>` anywhere in a heading: emphasis is
  weight, colour, or the single 2px yellow rule under the hero headline
  (`text-decoration-thickness`/`border-bottom` at 2px — never 5px or 8px).
- Scale: 11 / 12 / 13 / 15 / 17 / 20 / 26 / 34 / `clamp(30,3.4vw,44)` /
  `clamp(38,5.4vw,68)` px. **11px is the floor**; information density is bought
  with letter-spacing, not with size.

## Layout and space

- One spacing scale, multiples of 4: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 88.
- One inline gutter, `--gutter-inline: 6.8%`, applied to `main` only. Sections
  never add a second inline padding, so every page shares one left edge.
- Grids are asymmetric on purpose: the station directory is a bento (Hohenbrück
  Central is a 2×2 tile), the vehicle spec sheet is one main figure plus three
  supporting cells, the group grid leads with one full-width unit.
- Breakpoints: `1040px` the link row becomes a sheet, `760px` single column,
  `560px` compact type. Media queries change geometry only, never colour.

## States

Every interactive element has default, hover, focus-visible, active and
disabled. Hover is one signal (background or rule), wrapped in
`@media (hover: hover)`; active is `translateY(1px)`; disabled is
`opacity: .55; cursor: not-allowed`. Motion uses `--dur-short`/`--dur-mid` with
`--ease-out`, and collapses to zero through `--motion` under
`prefers-reduced-motion`.

## Diagrams

The hero diagram is generated from `stations` and `lines` in
`src/lib/network.ts` — the same coordinates the journey planner uses. There are
no decorative arcs, no invented station dots, and the caption is not needed
because the picture cannot disagree with the data.

## Sound

The platform melodies are the network's audible layer, so they follow the same
rules as the visual one: they are data, they are never a surprise, and they are
only ever user-initiated.

- `src/lib/melody.ts` holds the three platform events — arrival, departure,
  passing — with the file, the explanation and the length the station page
  prints. `pnpm verify` reads the WAV headers and fails when a declared length
  disagrees with the recording, exactly as it fails on a line colour that misses
  4.5:1.
- The board on a station page is a hairline table, not three cards: one `paper`
  row per melody, mono figures for the length, and a single chip that reads
  `Play` or `Stop`.
- A row keeps a stable accessible name (`aria-label`) and carries its state in
  `aria-pressed`; the sounding row is the only row whose chip is inked `ink`, and
  a `role="status"` line says in words what is playing. State never rests on
  colour alone.
- **Nothing autoplays.** No melody starts on page load, on hover or on
  navigation, playback stops when the view changes, and `preload="none"` keeps
  the recordings out of the page weight until a passenger asks for one.

## Change log against `docs/hallmark-audit-2026-09-27.md`

- **C1** header overflow: `overflow-x: clip` on `html`, `body` and the shell;
  the link row collapses at `1040px`, not `760px`.
- **C2** eyebrow beside the heading: `.network-principles` and `.fleet-note` are
  single-column; eyebrow and heading stack in one column everywhere.
- **C3** phantom `'Inter'`: replaced by `--font-body`; the brand page's giant
  logo is DM Sans.
- **C4** `<em>` in headings: removed on all nine views; the hero keeps one 2px
  yellow rule instead of an 8px offset underline.
- **M3/M4/M5** one token layer, three reds declared, yellow limited to three
  uses, no `!important`, `.detail-hero--line` instead of `[style*="--line"]`.
- **M6/M7** bento station grid, asymmetric spec sheet, one gutter, one 4px scale.
- **M8/M9** `:active`/`:disabled` states; card rows, stop lists, connection
  lists and departure boards are real links again; `go()` is deleted.
- **M10/M11/M12** hero pads 48/64 (bottom ≥ 1.3× top) so the CTA stays in the
  first screen, 11px minimum type, hero diagram drawn from the network model.
- **minor** no eyebrow glyph, one hover language, motion tokens, `→` and `↗`
  only, fewer `·` runs, `.nojs` in the stylesheet, dead CSS removed.
