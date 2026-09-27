/**
 * Network data for the Ruhrenberg Municipal Transport Authority (RMA).
 *
 * This module is the single source of truth for the network: stations, lines,
 * their paths and their service windows. The user interface, the GTFS feed and
 * the verification script are all derived from the data below, so a station can
 * never advertise a line that does not actually call there.
 *
 * Service windows follow the GTFS service-day convention: a departure at 24:35
 * is 00:35 on the following calendar day. Expressing the last departure this way
 * keeps every service window positive, which is what the timetable generator
 * relies on (a window such as "05:00 to 00:30" silently produced no trips).
 */

export type Mode = 'rail' | 'metro' | 'tram' | 'brt' | 'ferry' | 'agt' | 'mono'
export type Zone = 'land' | 'water'

export type Station = {
  /** GTFS stop_id, also used as the three-letter code on the network map. */
  id: string
  /** Full station name used in headings and timetables. */
  name: string
  /** Short name used on headsigns and platform signs. */
  short: string
  district: string
  lat: number
  lon: number
  platform: string
  zone: Zone
  /** Position on the north-west to south-east main axis; -1 for waterfront stops. */
  corridor: number
  description: string
  facilities: string[]
}

export type Line = {
  id: string
  mode: Mode
  /** Route long name, e.g. "Universität – Flughafen Ruhrenberg". */
  name: string
  /** Short label used in lists, e.g. "Metro line 7". */
  description: string
  color: string
  /** Typical daytime headway in minutes. */
  frequency: number
  /** First departure of the service day as a service-day time, e.g. "04:45". */
  first: string
  /** Last departure of the service day, e.g. "24:35" (= 00:35 the next day). */
  last: string
  /** Scheduled minutes per stop-to-stop hop, used for travel times and boards. */
  travelTime: number
  circular?: boolean
  /** Station ids in travel order. A circular line repeats its first stop at the end. */
  stops: string[]
}

export type StationWithLines = Station & { lines: string[] }

/** Display order: city centre first, then the corridor, then the waterfront. */
export const stations: Station[] = [
  { id:'HDC', name:'Hohenbrück Central', short:'Hohenbrück', district:'Hohenbrück', lat:51.243, lon:6.782, platform:'1–4', zone:'land', corridor:1, description:'Ruhrenberg’s principal interchange and the northern gateway to the city.', facilities:['Elevators','Bicycle parking','Customer centre','Accessible toilets','Step-free platform'] },
  { id:'RAT', name:'Rathaus', short:'Rathaus', district:'Altstadt', lat:51.229, lon:6.775, platform:'A–D', zone:'land', corridor:2, description:'The civic heart of Ruhrenberg, directly beneath the City Hall quarter.', facilities:['Elevators','Tourist information','Retail','Step-free platform'] },
  { id:'LIN', name:'Lindenplatz', short:'Lindenplatz', district:'Linden', lat:51.236, lon:6.800, platform:'A–B', zone:'land', corridor:3, description:'A lively neighbourhood square with direct tram and metro access.', facilities:['Elevators','Retail','Cycle hire','Step-free platform'] },
  { id:'OST', name:'Osttor', short:'Osttor', district:'Ostviertel', lat:51.231, lon:6.838, platform:'1–3', zone:'land', corridor:4, description:'The eastern interchange for the residential districts and the airport corridor.', facilities:['Elevators','Park & Ride','Accessible toilets','Step-free platform'] },
  { id:'UNI', name:'Universität', short:'Universität', district:'Campus', lat:51.252, lon:6.741, platform:'1–2', zone:'land', corridor:0, description:'The main campus station serving the university and research district.', facilities:['Elevators','Customer centre','Bicycle parking','Step-free platform'] },
  { id:'FLH', name:'Flughafen Ruhrenberg', short:'Flughafen', district:'Airport', lat:51.212, lon:6.862, platform:'1–2', zone:'land', corridor:5, description:'The airport station, four minutes from Osttor on the A34 people mover.', facilities:['Elevators','Step-free platform','Baggage trolleys','Customer centre'] },
  { id:'HAF', name:'Hafen / Waterfront', short:'Hafen', district:'Hafenviertel', lat:51.218, lon:6.800, platform:'1–2', zone:'water', corridor:-1, description:'The waterfront interchange, where trams and buses meet the river ferry piers.', facilities:['Ferry interchange','Bicycle parking','Park & Ride','Cafés','Step-free platform'] },
  { id:'WFI', name:'Werftinsel', short:'Werftinsel', district:'Hafenviertel', lat:51.216, lon:6.812, platform:'1', zone:'water', corridor:-1, description:'A river pier serving the shipyard island, the waterfront parks and the boatyard museum.', facilities:['Ferry interchange','Step-free pier access','Cycle parking'] },
  { id:'SPK', name:'Speicherkai', short:'Speicherkai', district:'Hafenviertel', lat:51.221, lon:6.790, platform:'2', zone:'water', corridor:-1, description:'A pier beside the converted warehouse district, two tram stops from Rathaus.', facilities:['Ferry interchange','Step-free pier access','Cafés'] },
]
// Line colours are shared with the GTFS feed, so they must stay readable as
// small text: assertNetworkIntegrity() verifies that every line colour reaches
// 4.5:1 against the text colour chosen by readableTextColor() (WCAG 2.2 AA).
export const modeInfo: Record<Mode, { label: string; color: string; routeType: number }> = {
  rail: { label: 'Rail', color: '#243d48', routeType: 2 },
  metro: { label: 'Metro', color: '#d2402f', routeType: 1 },
  tram: { label: 'Tram', color: '#e7a635', routeType: 0 },
  brt: { label: 'BRT', color: '#7352a2', routeType: 3 },
  ferry: { label: 'Ferry', color: '#177b98', routeType: 4 },
  // GTFS has no dedicated route_type for automated guideway transit, so RMA
  // publishes the airport people mover as 1 (Subway/Metro) – the closest
  // dedicated-guideway category. Monorail has its own type (12).
  agt: { label: 'AGT', color: '#2f8163', routeType: 1 },
  mono: { label: 'Monorail', color: '#bf4a77', routeType: 12 },
}

export const routeType: Record<Mode, number> = Object.fromEntries(
  (Object.keys(modeInfo) as Mode[]).map((mode) => [mode, modeInfo[mode].routeType]),
) as Record<Mode, number>

export const lines: Line[] = [
  // Ring line: a closed loop through the city centre, the campus and the airport.
  { id:'S1', mode:'rail', name:'Ring line – circular service', description:'Ring line via the city centre, campus and airport', color:modeInfo.rail.color, frequency:6, first:'04:45', last:'24:35', travelTime:3, circular:true, stops:['HDC','RAT','LIN','OST','FLH','UNI','HDC'] },
  // Metro: eight services over the main axis, ordered north-west to south-east.
  { id:'U2', mode:'metro', name:'Universität – Lindenplatz', description:'Metro line 2', color:modeInfo.metro.color, frequency:6, first:'05:00', last:'24:15', travelTime:2, stops:['UNI','HDC','RAT','LIN'] },
  { id:'U3', mode:'metro', name:'Hohenbrück Central – Osttor', description:'Metro line 3', color:modeInfo.metro.color, frequency:6, first:'05:00', last:'24:20', travelTime:2, stops:['HDC','RAT','LIN','OST'] },
  { id:'U4', mode:'metro', name:'Rathaus – Flughafen Ruhrenberg', description:'Metro line 4', color:modeInfo.metro.color, frequency:6, first:'05:00', last:'24:10', travelTime:2, stops:['RAT','LIN','OST','FLH'] },
  { id:'U5', mode:'metro', name:'Universität – Osttor', description:'Metro line 5', color:modeInfo.metro.color, frequency:5, first:'05:00', last:'24:25', travelTime:2, stops:['UNI','HDC','RAT','LIN','OST'] },
  { id:'U6', mode:'metro', name:'Hohenbrück Central – Flughafen Ruhrenberg', description:'Metro line 6', color:modeInfo.metro.color, frequency:5, first:'05:00', last:'24:30', travelTime:2, stops:['HDC','RAT','LIN','OST','FLH'] },
  { id:'U7', mode:'metro', name:'Universität – Flughafen Ruhrenberg', description:'Metro line 7 · main line', color:modeInfo.metro.color, frequency:4, first:'05:00', last:'24:20', travelTime:2, stops:['UNI','HDC','RAT','LIN','OST','FLH'] },
  { id:'U8', mode:'metro', name:'Lindenplatz – Universität', description:'Metro line 8', color:modeInfo.metro.color, frequency:6, first:'05:05', last:'24:05', travelTime:2, stops:['LIN','RAT','HDC','UNI'] },
  { id:'U9', mode:'metro', name:'Flughafen Ruhrenberg – Rathaus', description:'Metro line 9', color:modeInfo.metro.color, frequency:6, first:'05:10', last:'24:00', travelTime:2, stops:['FLH','OST','LIN','RAT'] },
  // Tram: surface routes in the centre, including the waterfront.
  { id:'T18', mode:'tram', name:'Hohenbrück Central – Hafen / Waterfront', description:'Tram line 18', color:modeInfo.tram.color, frequency:10, first:'05:15', last:'24:15', travelTime:4, stops:['HDC','RAT','HAF'] },
  { id:'T19', mode:'tram', name:'Hafen / Waterfront – Lindenplatz', description:'Tram line 19', color:modeInfo.tram.color, frequency:10, first:'05:00', last:'24:30', travelTime:4, stops:['HAF','RAT','LIN'] },
  { id:'T20', mode:'tram', name:'Lindenplatz – Speicherkai', description:'Tram line 20', color:modeInfo.tram.color, frequency:10, first:'05:30', last:'23:45', travelTime:4, stops:['LIN','RAT','HAF','SPK'] },
  { id:'T21', mode:'tram', name:'Universität – Osttor', description:'Tram line 21', color:modeInfo.tram.color, frequency:12, first:'05:30', last:'23:45', travelTime:4, stops:['UNI','HDC','LIN','OST'] },
  // BRT: limited-stop services on the corridor and to the waterfront.
  { id:'B22', mode:'brt', name:'Rathaus – Flughafen Ruhrenberg', description:'BRT line 22', color:modeInfo.brt.color, frequency:12, first:'05:30', last:'23:30', travelTime:5, stops:['RAT','LIN','OST','FLH'] },
  { id:'B23', mode:'brt', name:'Osttor – Flughafen Ruhrenberg', description:'Airport BRT line 23', color:modeInfo.brt.color, frequency:10, first:'04:50', last:'24:40', travelTime:5, stops:['OST','FLH'] },
  { id:'B24', mode:'brt', name:'Hohenbrück Central – Hafen / Waterfront', description:'BRT line 24', color:modeInfo.brt.color, frequency:12, first:'05:30', last:'23:30', travelTime:5, stops:['HDC','RAT','HAF'] },
  { id:'B25', mode:'brt', name:'Universität – Rathaus', description:'BRT line 25', color:modeInfo.brt.color, frequency:12, first:'05:30', last:'23:30', travelTime:5, stops:['UNI','HDC','RAT'] },
  { id:'B26', mode:'brt', name:'Lindenplatz – Flughafen Ruhrenberg', description:'BRT line 26', color:modeInfo.brt.color, frequency:12, first:'05:30', last:'23:30', travelTime:5, stops:['LIN','OST','FLH'] },
  // Ferries: river piers only.
  { id:'F31', mode:'ferry', name:'Speicherkai – Werftinsel', description:'River ferry 31', color:modeInfo.ferry.color, frequency:20, first:'06:00', last:'22:40', travelTime:8, stops:['SPK','HAF','WFI'] },
  { id:'F32', mode:'ferry', name:'Hafen / Waterfront – Werftinsel', description:'River ferry 32', color:modeInfo.ferry.color, frequency:30, first:'06:20', last:'22:20', travelTime:8, stops:['HAF','WFI'] },
  { id:'F33', mode:'ferry', name:'Speicherkai – Hafen / Waterfront', description:'River ferry 33', color:modeInfo.ferry.color, frequency:30, first:'06:40', last:'23:10', travelTime:8, stops:['SPK','HAF'] },
  // Dedicated guideways: the airport people mover and the monorail.
  { id:'A34', mode:'agt', name:'Flughafen Ruhrenberg – Osttor', description:'Airport people mover', color:modeInfo.agt.color, frequency:8, first:'04:30', last:'24:30', travelTime:4, stops:['FLH','OST'] },
  { id:'M35', mode:'mono', name:'Hohenbrück Central – Flughafen Ruhrenberg', description:'Ruhrenberg monorail', color:modeInfo.mono.color, frequency:10, first:'05:30', last:'23:30', travelTime:3, stops:['HDC','LIN','OST','FLH'] },
]

/** Stations paired with the lines that actually call there, derived from lines[].stops. */
export const stationsWithLines: StationWithLines[] = stations.map((station) => ({
  ...station,
  lines: lines.filter((line) => line.stops.includes(station.id)).map((line) => line.id),
}))

export const lineById = (id: string): Line | undefined => lines.find((line) => line.id === id)
export const stationById = (id: string): Station | undefined => stations.find((station) => station.id === id)
export const stationName = (id: string): string => stationById(id)?.name ?? id
export const stationShort = (id: string): string => stationById(id)?.short ?? id

export type Direction = { id: 0 | 1; stops: string[]; headsign: string }

function headsignFor(line: Line, stops: string[]): string {
  return line.circular ? `Circular via ${stationShort(stops[1] ?? stops[0])}` : stationShort(stops[stops.length - 1])
}

/** Both travel directions of a line; direction 0 follows the order stored in the data. */
export function lineDirections(line: Line): Direction[] {
  const reverse = [...line.stops].reverse()
  return [
    { id: 0, stops: line.stops, headsign: headsignFor(line, line.stops) },
    { id: 1, stops: reverse, headsign: headsignFor(line, reverse) },
  ]
}

/** "S1 · U2–U9" style summary of a set of line ids, used on the mode cards. */
function idSummary(ids: string[]): string {
  if (ids.length === 0) return '—'
  if (ids.length === 1) return ids[0]
  const numbers = ids.map((id) => Number(id.replace(/\D/g, '')))
  const consecutive = numbers.every((value, index) => index === 0 || value === numbers[index - 1] + 1)
  return consecutive ? `${ids[0]}–${ids[ids.length - 1]}` : ids.join(' · ')
}

const idsFor = (modes: Mode[]): string[] => lines.filter((line) => modes.includes(line.mode)).map((line) => line.id)

/** Mode cards shown on the home and network pages. Counts come from the data. */
export const modeCards: Array<{ id: string; icon: string; label: string; sub: string; color: string }> = [
  { id: 'rail', icon: 'M', label: 'Rail & Metro', sub: `${idSummary(idsFor(['rail']))} · ${idSummary(idsFor(['metro']))}`, color: modeInfo.rail.color },
  { id: 'tram', icon: 'T', label: 'Tram & Bus', sub: `${idSummary(idsFor(['tram']))} · ${idSummary(idsFor(['brt']))}`, color: modeInfo.tram.color },
  { id: 'water', icon: 'F', label: 'Ferries', sub: idSummary(idsFor(['ferry'])), color: modeInfo.ferry.color },
  { id: 'air', icon: 'A', label: 'Airport & Monorail', sub: `${idSummary(idsFor(['agt']))} · ${idSummary(idsFor(['mono']))}`, color: modeInfo.agt.color },
]

/** Filter row of the line directory. */
export const modeFilters: Array<{ mode: Mode | 'all'; label: string; count: number }> = [
  { mode: 'all', label: 'All', count: lines.length },
  ...(Object.keys(modeInfo) as Mode[]).map((mode) => ({ mode, label: modeInfo[mode].label, count: lines.filter((line) => line.mode === mode).length })),
]
export const serviceSettings = {
  authorityName: 'Ruhrenberg Municipal Transport Authority',
  authorityShortName: 'RMA',
  agencyId: 'RMA',
  feedPublisherName: 'Ruhrenberg Municipal Transport Authority (RMA)',
  // The .example domain is reserved for documentation, so the sample feed can
  // never point at somebody else's server.
  feedPublisherUrl: 'https://rma.example/open-data',
  feedLang: 'en',
  feedVersion: '2026.09.27',
  timezone: 'Europe/Berlin',
  serviceId: 'DAILY',
  calendarStart: '20260901',
  calendarEnd: '20261231',
  note: 'All times are local time (Europe/Berlin). Frequencies are typical daytime headways.',
}

/** Parses a service-day time ("04:45", "24:35") into minutes since the service day began. */
export function parseServiceTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

/** Formats service-day minutes as a wall clock time, wrapping at midnight ("24:35" → "00:35"). */
export function serviceClock(serviceMinutes: number): string {
  const minutes = ((serviceMinutes % 1440) + 1440) % 1440
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/** Formats service-day minutes the way GTFS expects it: hours may exceed 23 ("25:05:00"). */
export function gtfsTime(serviceMinutes: number): string {
  return `${String(Math.floor(serviceMinutes / 60)).padStart(2, '0')}:${String(serviceMinutes % 60).padStart(2, '0')}:00`
}

export const runsIntoNextDay = (serviceMinutes: number): boolean => serviceMinutes >= 1440

/** Service window as shown in the line directory, e.g. "04:45 – 00:35 (+1 day)". */
export function serviceWindow(line: Line): string {
  const last = parseServiceTime(line.last)
  return `${serviceClock(parseServiceTime(line.first))} – ${serviceClock(last)}${runsIntoNextDay(last) ? ' (+1 day)' : ''}`
}

/** Departure times from the origin of a line, one per scheduled trip of the day. */
export function tripTimes(line: Line): number[] {
  const start = parseServiceTime(line.first)
  const end = parseServiceTime(line.last)
  const times: number[] = []
  for (let time = start; time <= end; time += line.frequency) times.push(time)
  return times
}

export const dailyTrips = (line: Line): number => tripTimes(line).length
export const dailyTripTotal = (): number => lines.reduce((total, line) => total + dailyTrips(line), 0)
export const dailyStationCalls = (): number => lines.reduce((total, line) => total + dailyTrips(line) * line.stops.length, 0)

export type Departure = { line: Line; headsign: string; time: number; platform: string; nextServiceDay?: boolean }

/** Every departure from a station in one service day, both directions included. */
export function stationDepartures(stationId: string): Departure[] {
  const station = stationById(stationId)
  if (!station) return []
  return lines
    .filter((line) => line.stops.includes(stationId))
    .flatMap((line) =>
      lineDirections(line).flatMap((direction) => {
        // The last stop of a direction is an arrival, not a departure, and on a
        // circular line the repeated stop is the arrival of the same loop.
        const index = direction.stops.indexOf(stationId)
        if (index < 0 || index >= direction.stops.length - 1) return []
        const offset = index * line.travelTime
        return tripTimes(line).map((time) => ({ line, headsign: direction.headsign, time: time + offset, platform: station.platform }))
      }),
    )
    .sort((a, b) => a.time - b.time)
}

/** The next departures after a given time, wrapping into the next service day. */
export function nextDepartures(stationId: string, after: number, limit = 5): Departure[] {
  const departures = stationDepartures(stationId)
  const later = departures.filter((departure) => departure.time >= after)
  const earlier = departures.filter((departure) => departure.time < after).map((departure) => ({ ...departure, nextServiceDay: true }))
  return [...later, ...earlier].slice(0, limit)
}

export type Journey = { line: Line; from: Station; to: Station; departure: number; arrival: number; duration: number }

/** Direct services between two stations, earliest departure first (no interchanges). */
export function findDirectJourneys(fromId: string, toId: string, departAfter = 0, limit = 5): Journey[] {
  const from = stationById(fromId)
  const to = stationById(toId)
  if (!from || !to || from.id === to.id) return []
  return lines
    .flatMap((line) =>
      lineDirections(line).flatMap((direction) => {
        const fromIndex = direction.stops.indexOf(fromId)
        const toIndex = direction.stops.indexOf(toId)
        if (fromIndex < 0 || toIndex <= fromIndex) return []
        const offset = fromIndex * line.travelTime
        const duration = (toIndex - fromIndex) * line.travelTime
        return tripTimes(line)
          .map((time) => time + offset)
          .filter((time) => time >= departAfter)
          .map((departure) => ({ line, from, to, departure, arrival: departure + duration, duration }))
      }),
    )
    .sort((a, b) => a.departure - b.departure)
    .slice(0, limit)
}
export const INK = '#192b36'
export const PAPER = '#ffffff'

/** WCAG 2.2 relative luminance of a six-digit hex colour. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.2 contrast ratio between two six-digit hex colours. */
export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a)
  const second = relativeLuminance(b)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

/** Ink or paper, whichever is legible on a given background colour. */
export const readableTextColor = (background: string): string =>
  contrastRatio(background, INK) >= contrastRatio(background, PAPER) ? INK : PAPER

/**
 * Data rules that the site, the GTFS feed and the verification script rely on.
 * Returns one message per inconsistency; an empty array means the data is sound.
 */
export function networkIssues(): string[] {
  const issues: string[] = []
  const known = new Set(stations.map((station) => station.id))
  if (known.size !== stations.length) issues.push('Station ids must be unique.')

  for (const line of lines) {
    const stops = line.stops
    if (stops.length < 2) issues.push(`${line.id}: a line needs at least two stops.`)
    for (const id of stops) if (!known.has(id)) issues.push(`${line.id}: unknown stop ${id}.`)
    if (line.frequency <= 0) issues.push(`${line.id}: frequency must be a positive number of minutes.`)
    if (line.travelTime <= 0) issues.push(`${line.id}: travel time per hop must be positive.`)
    if (dailyTrips(line) === 0) issues.push(`${line.id}: the service window produces no trips.`)

    const first = parseServiceTime(line.first)
    const last = parseServiceTime(line.last)
    if (first >= 1440) issues.push(`${line.id}: the first departure ${line.first} must be before midnight.`)
    if (last <= first) issues.push(`${line.id}: the last departure ${line.last} is not after the first departure ${line.first}.`)

    if (!/^#[0-9a-f]{6}$/i.test(line.color)) issues.push(`${line.id}: colour ${line.color} must be a six-digit hex value.`)
    else if (contrastRatio(line.color, readableTextColor(line.color)) < 4.5) issues.push(`${line.id}: line colour ${line.color} does not reach 4.5:1 against its label text.`)

    const unique = new Set(stops)
    if (line.circular) {
      if (stops[0] !== stops[stops.length - 1]) issues.push(`${line.id}: a circular line must return to ${stops[0]}.`)
      if (unique.size !== stops.length - 1) issues.push(`${line.id}: a circular line must not repeat any other stop.`)
    } else if (unique.size !== stops.length) {
      issues.push(`${line.id}: a linear line must not repeat a stop.`)
    }

    const zones = stops.map((id) => stationById(id)?.zone)
    if (line.mode === 'ferry' && zones.some((zone) => zone !== 'water')) issues.push(`${line.id}: ferries call at waterfront stops only.`)
    if (['rail', 'metro', 'agt', 'mono'].includes(line.mode) && zones.some((zone) => zone !== 'land')) {
      issues.push(`${line.id}: ${line.mode} services cannot call at waterfront stops.`)
    }

    // Services that stay ashore must run along the corridor, not across it.
    const corridor = stops.map((id) => stationById(id)?.corridor ?? -1)
    if (!line.circular && corridor.every((value) => value >= 0)) {
      const ordered = corridor.every((value, index) => index === 0 || value > corridor[index - 1])
      const reversed = corridor.every((value, index) => index === 0 || value < corridor[index - 1])
      if (!ordered && !reversed) issues.push(`${line.id}: stops must be called in corridor order.`)
    }
  }

  for (const station of stations) {
    if (!lines.some((line) => line.stops.includes(station.id))) issues.push(`${station.id}: no line calls at this station.`)
    if (station.zone === 'water' && station.corridor >= 0) issues.push(`${station.id}: a waterfront stop must not sit on the corridor.`)
    if (station.zone === 'land' && station.corridor < 0) issues.push(`${station.id}: a corridor stop needs a corridor position.`)
  }

  return issues
}

/** Throws when the network data contradicts itself. Called in development builds. */
export function assertNetworkIntegrity(): void {
  const issues = networkIssues()
  if (issues.length > 0) throw new Error(`Network data is inconsistent:\n- ${issues.join('\n- ')}`)
}
