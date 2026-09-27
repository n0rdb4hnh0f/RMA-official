# RMA · Ruhrenberg Municipal Transport Authority

A single page application for the fictional RMA network: the line directory, the station
directory, the fleet records and the open timetable data, all rendered from one network
model.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | start the development server |
| `pnpm check` | svelte-check plus TypeScript for the app (`tsconfig.app.json`) and the scripts (`tsconfig.node.json`) |
| `pnpm verify` | validate the network model, the generated GTFS feed and the platform sound library (Node 24 strips the types, so no test framework is needed) |
| `pnpm audit` | check every text colour in `src/app.css` against the surface it is painted on |
| `pnpm build` | production build into `dist/` |
| `pnpm preview` | serve the production build |

## Data model

`src/lib/network.ts` is the single source of truth: 9 stations, 23 lines, their paths,
service windows and line colours. The user interface, the GTFS feed and the verification
script are derived from it, so a station can never advertise a line that does not call
there.

### Service-day times

Every time is stored as a service-day time, exactly as GTFS expects: `24:35` means 00:35
on the following calendar day. This keeps a service window such as `04:45 – 24:35`
positive, which is what the timetable generator iterates over. `serviceClock()` converts
service-day minutes into a wall clock time for display, and `runsIntoNextDay()` marks the
services that continue after midnight.

### Invariants

`networkIssues()` returns one message per inconsistency; `assertNetworkIntegrity()` throws
in development builds (`src/main.ts`) and `pnpm verify` fails the same way in CI. The
checks cover unknown or repeated stops, circular lines that do not close, service windows
that produce no trips, ferries calling at land stations, guideway services calling at
waterfront stops, lines that do not follow the corridor, stations without any service, and
line colours that fail WCAG 2.2 AA (4.5:1) against their own label text.

### Derived data

- `stationsWithLines` — each station plus the lines that actually call there
- `modeCards`, `modeFilters` — the mode tiles and the directory filters, with counts; each tile
  carries the colour of the mode it summarises
- `serviceWindow`, `dailyTrips`, `dailyTripTotal`, `dailyStationCalls` — timetable figures
- `stationDepartures`, `nextDepartures` — the sample departure boards, both directions
- `findDirectJourneys` — direct services between two stations (no interchanges yet)

## Platform sound

`src/lib/melody.ts` is the sound library: the three things that can happen at a platform — a
service arriving, a service departing and a service passing through — with the recording each
one plays, the length the station page prints and the line of copy that explains it. The
recordings live in `public/melody` and are published at `/melody/…`, so the same paths work in
development and in the build.

`pnpm verify` reads the WAV headers and fails when a declared length disagrees with the
recording, when a file carries no audio or no usable sample format, and when a recording sits
in `public/melody` that no page advertises. A melody therefore cannot advertise a length its
recording does not have, in the same way a line cannot advertise a colour that fails contrast.

## GTFS feed

`src/lib/gtfs.ts` builds the feed from the network model. `buildGtfsFiles()` returns
`agency.txt`, `stops.txt`, `routes.txt`, `calendar.txt`, `trips.txt`, `stop_times.txt`,
`frequencies.txt`, `shapes.txt` and `feed_info.txt` together with row counts, which the
network page lists. Both travel directions of every line are published, `direction_id`
follows the direction of travel, `route_color` and `route_text_color` come from the same
palette as the website, and `shapes.txt` connects the station coordinates in travel order.

### Schema used by the open-data page

```
CREATE TABLE stops (stop_id TEXT PRIMARY KEY, stop_name TEXT NOT NULL, stop_lat REAL, stop_lon REAL, platform_code TEXT);
CREATE TABLE routes (route_id TEXT PRIMARY KEY, agency_id TEXT, route_short_name TEXT NOT NULL, route_long_name TEXT, route_type INTEGER, route_color TEXT, route_text_color TEXT);
CREATE TABLE calendar (service_id TEXT PRIMARY KEY, monday INTEGER, tuesday INTEGER, wednesday INTEGER, thursday INTEGER, friday INTEGER, saturday INTEGER, sunday INTEGER, start_date TEXT, end_date TEXT);
CREATE TABLE trips (trip_id TEXT PRIMARY KEY, route_id TEXT REFERENCES routes, service_id TEXT, trip_headsign TEXT, direction_id INTEGER, shape_id TEXT);
CREATE TABLE stop_times (trip_id TEXT REFERENCES trips, arrival_time TEXT, departure_time TEXT, stop_id TEXT REFERENCES stops, stop_sequence INTEGER, PRIMARY KEY (trip_id, stop_sequence));
CREATE TABLE frequencies (trip_id TEXT REFERENCES trips, start_time TEXT, end_time TEXT, headway_secs INTEGER, exact_times INTEGER);
```

`route_type` follows the GTFS specification: 0 tram, 1 metro, 2 rail, 3 bus, 4 ferry,
12 monorail. Automated guideway transit has no dedicated type, so the airport people mover
is published as 1.

## Navigation

The address bar is the application state: `#/`, `#/network`, `#/lines`, `#/lines/S1`,
`#/stations`, `#/stations/HDC`, `#/fleet`, `#/brand`, `#/group` and `#/contact`. Unknown
paths render a 404 view, the back button works and deep links survive a reload.

## Accessibility

- Copy colour comes from four tokens in `:root`: `--rma-ink` (12.9:1 on the page),
  `--rma-muted` (5.6:1), `--rma-red-ink` (5.3:1) and `--rma-green-ink` (5.0:1). Ink on
  Ruhrenberg Yellow is 12.4:1, so the brand colour always carries ink text, never white.
- `pnpm audit` resolves those tokens, walks the stylesheet in source order the way the
  cascade does, and fails if a single text colour drops below 4.5:1 against the surface it
  is painted on: its own background, the background of the nearest ancestor that paints
  one, or the page. `pnpm verify` checks the line colours against their own label text.
- Line, fleet and mode colours are passed to the CSS as `--line`, `--vehicle` and `--mode`
  together with the text colour chosen by `readableTextColor()`, so no view can put label
  text on a colour that fails. `pnpm audit` lists those inline variables instead of
  guessing, because their values come from the data.
- Real links for every card and row, a skip link, visible focus outlines, an
  `aria-expanded` menu button, labelled form controls and decorative artwork marked
  `aria-hidden`.
- Sound is never automatic. The station melodies play only when a passenger chooses one, the
  rows are real buttons with a stable accessible name and `aria-pressed`, and the state is
  announced through a `role="status"` line, so no melody can surprise anyone.
- `prefers-reduced-motion` disables transitions and smooth scrolling.

## Known gaps (nothing is faked to hide them)

- **No live data yet.** `src/lib/realtime.ts` documents the browser-side contract for a
  future GTFS-Realtime feed; the departure boards state that they come from the timetable.
- **No interchanges in the planner.** `findDirectJourneys()` returns direct services only.
- **No imprint or privacy page.** Both need legal copy from the operator, so the footer
  links to the contact page instead of linking to an empty page.
- **Weekday and weekend timetables are identical** in the sample feed (one daily service
  calendar). Per-day headways are the next step.
- **Dead CSS.** About twenty selectors in `src/app.css` (`.vehicle-list`, `.vehicle-board`,
  `.realtime-state`, `.map-key`, `.quick-links`, `.update-list`, `.note-number`,
  `.note-mark`, `.search-icon`, `.filters`, `.journey-results`, `.line-badge`, `.mini-grid`,
  `.network-mini`, `.vehicle-dot`, `.button-link`, `.clickable`, `.download`, `.arrow`,
  `.chevron`) belong to markup that no page renders any more. They are left in place rather
  than deleted blind, because the stylesheet is intentionally dense; removing them is a
  self-contained follow-up once each one is checked in the browser.
- **Uncompressed audio.** The three platform melodies are 48 kHz 24-bit stereo WAV files,
  6.4 MB together, because that is how they were delivered. Nothing is downloaded until a
  listener asks for a melody (`preload="none"`), so the page weight is unchanged, and
  converting them to a compressed format is a self-contained follow-up.
- `src/assets/hero.png` is currently unused.
