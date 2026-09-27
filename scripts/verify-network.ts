/**
 * Data checks for the RMA network and the generated GTFS feed.
 *
 * Run with `npm run verify`. Node 24 strips the TypeScript types itself, so the
 * script needs no build step and no test framework. It exits with code 1 as soon
 * as the data contradicts itself, which makes it usable in CI.
 */
import {
  contrastRatio,
  dailyStationCalls,
  dailyTripTotal,
  dailyTrips,
  findDirectJourneys,
  gtfsTime,
  INK,
  lineDirections,
  lines,
  networkIssues,
  nextDepartures,
  PAPER,
  parseServiceTime,
  readableTextColor,
  runsIntoNextDay,
  serviceClock,
  serviceWindow,
  stationById,
  stationDepartures,
  stations,
  stationsWithLines,
  tripTimes,
} from '../src/lib/network.ts'
import { buildGtfsFiles } from '../src/lib/gtfs.ts'

const failures: string[] = []
const check = (condition: boolean, message: string): void => {
  if (!condition) failures.push(message)
}

/* ---------------------------------------------------------------- network --- */

for (const issue of networkIssues()) failures.push(`network: ${issue}`)

const totalTrips = dailyTripTotal()
check(lines.length > 0, 'network: no lines defined')
check(stations.length > 0, 'network: no stations defined')

for (const line of lines) {
  const trips = dailyTrips(line)
  check(trips > 0, `network: ${line.id} has no trips in its service window (${line.first}–${line.last})`)
  check(contrastRatio(line.color, readableTextColor(line.color)) >= 4.5, `network: ${line.id} label contrast is below 4.5:1`)
  check(tripTimes(line)[0] === Number(line.first.slice(0, 2)) * 60 + Number(line.first.slice(3)), `network: ${line.id} first trip does not match ${line.first}`)
  for (const direction of lineDirections(line)) {
    check(direction.headsign.length > 0, `network: ${line.id} direction ${direction.id} has no headsign`)
    check(direction.stops.length === line.stops.length, `network: ${line.id} direction ${direction.id} has a different number of stops`)
  }
}

for (const station of stationsWithLines) {
  check(station.lines.length > 0, `network: ${station.id} is served by no line`)
  for (const lineId of station.lines) {
    const line = lines.find((entry) => entry.id === lineId)
    check(Boolean(line?.stops.includes(station.id)), `network: ${station.id} lists ${lineId}, which does not call there`)
  }
}
/* ------------------------------------------------------------------ feed --- */

const files = buildGtfsFiles()
const feed = new Map(files.map((entry) => [entry.name, entry]))
const required = ['agency.txt', 'stops.txt', 'routes.txt', 'calendar.txt', 'trips.txt', 'stop_times.txt', 'frequencies.txt', 'shapes.txt', 'feed_info.txt']
for (const name of required) check(feed.has(name), `feed: ${name} is missing`)

/** Splits one CSV row, honouring quoted values such as "Ring line via the city centre, campus and airport". */
function parseCsvRow(row: string): string[] {
  const values: string[] = []
  let current = ''
  let quoted = false
  for (let index = 0; index < row.length; index++) {
    const character = row[index]
    if (quoted) {
      if (character !== '"') current += character
      else if (row[index + 1] === '"') {
        current += '"'
        index++
      } else quoted = false
    } else if (character === '"') quoted = true
    else if (character === ',') {
      values.push(current)
      current = ''
    } else current += character
  }
  values.push(current)
  return values
}

const body = (name: string): string[][] => (feed.get(name)?.content ?? '').split('\n').slice(1).map(parseCsvRow)
const stopIds = new Set(body('stops.txt').map((row) => row[0]))
check(body('stops.txt').length === stations.length, 'feed: stops.txt does not list every station')

const routeTypes = new Set([0, 1, 2, 3, 4, 12])
for (const row of body('routes.txt')) {
  check(routeTypes.has(Number(row[4])), `feed: route ${row[0]} has an invalid route_type ${row[4]}`)
  check(/^[0-9A-F]{6}$/.test(row[5]) && /^[0-9A-F]{6}$/.test(row[6]), `feed: route ${row[0]} needs route_color and route_text_color`)
}

const tripRows = body('trips.txt')
check(tripRows.length === totalTrips * 2, `feed: expected ${totalTrips * 2} trips (both directions), found ${tripRows.length}`)

const tripsByRoute = new Map<string, number>()
for (const row of tripRows) tripsByRoute.set(row[0], (tripsByRoute.get(row[0]) ?? 0) + 1)
for (const line of lines) {
  check(tripsByRoute.get(line.id) === dailyTrips(line) * 2, `feed: ${line.id} should have ${dailyTrips(line) * 2} trips in both directions, found ${tripsByRoute.get(line.id) ?? 0}`)
}

const stopTimes = body('stop_times.txt')
const expectedStopTimes = lines.reduce((total, line) => total + dailyTrips(line) * 2 * line.stops.length, 0)
check(stopTimes.length === expectedStopTimes, `feed: stop_times.txt has ${stopTimes.length} rows, expected ${expectedStopTimes}`)

const timesByTrip = new Map<string, string[]>()
for (const row of stopTimes) {
  const [tripId, arrival, , stopId] = row
  check(stopIds.has(stopId), `feed: stop_times references unknown stop ${stopId}`)
  check(/^\d{2}:\d{2}:00$/.test(arrival), `feed: ${tripId} has a malformed time ${arrival}`)
  timesByTrip.set(tripId, [...(timesByTrip.get(tripId) ?? []), arrival])
}
for (const [tripId, times] of timesByTrip) {
  check(times.length >= 2, `feed: ${tripId} has fewer than two stop times`)
  const minutes = times.map((time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)))
  check(minutes.every((value, index) => index === 0 || value > minutes[index - 1]), `feed: ${tripId} times are not increasing (${times.join(' ')})`)
}

const shapeIds = new Set(body('shapes.txt').map((row) => row[0]))
for (const row of tripRows) check(shapeIds.has(row[6]), `feed: trip ${row[2]} references unknown shape ${row[6]}`)
for (const row of body('frequencies.txt')) {
  const start = Number(row[1].slice(0, 2)) * 60 + Number(row[1].slice(3, 5))
  const end = Number(row[2].slice(0, 2)) * 60 + Number(row[2].slice(3, 5))
  check(end > start, `feed: frequency window ${row[1]}–${row[2]} for ${row[0]} is empty`)
  check(Number(row[3]) > 0, `feed: ${row[0]} headway must be positive`)
}
check(body('feed_info.txt')[0]?.includes('DAILY') === false, 'feed: feed_info.txt should not contain the service id')
check(body('calendar.txt')[0]?.[0] === 'DAILY', 'feed: calendar.txt should publish the DAILY service')

/* ------------------------------------------------------------ edge cases --- */

const unknown = 'NOPE'
check(stationById(unknown) === undefined, `edge: ${unknown} must not resolve to a station`)
check(stationDepartures(unknown).length === 0, 'edge: stationDepartures must ignore an unknown station instead of throwing')
check(nextDepartures(unknown, 8 * 60, 5).length === 0, 'edge: nextDepartures must ignore an unknown station instead of throwing')
check(findDirectJourneys(unknown, 'HDC', 0, 5).length === 0, 'edge: a journey from an unknown station must be empty')
check(findDirectJourneys('HDC', unknown, 0, 5).length === 0, 'edge: a journey to an unknown station must be empty')
check(findDirectJourneys('HDC', 'HDC', 0, 5).length === 0, 'edge: a journey from a station to itself must be empty')

check(parseServiceTime('24:35') === 1475, 'edge: parseServiceTime must accept hours past midnight')
check(serviceClock(1475) === '00:35', 'edge: serviceClock must wrap 24:35 to 00:35 for display')
check(serviceClock(4 * 60 + 45) === '04:45', 'edge: serviceClock must keep morning times unchanged')
check(gtfsTime(1475) === '24:35:00', 'edge: gtfsTime must keep hours past midnight')
check(runsIntoNextDay(1440) && !runsIntoNextDay(1439), 'edge: runsIntoNextDay must switch at midnight')
check(tripTimes({ ...lines[0], first: '10:00', last: '10:05', frequency: 5 }).length === 2, 'edge: tripTimes must include both ends of the window')

check(Math.abs(contrastRatio('#000000', PAPER) - 21) < 0.0001, 'edge: pure black on white must be 21:1')
check(contrastRatio(INK, PAPER) >= 12, 'edge: ink on paper must reach at least 12:1')
check(contrastRatio('#fff12b', INK) >= 12, 'edge: Ruhrenberg Yellow must carry ink at 12:1 or better')
check(readableTextColor('#fff12b') === INK, 'edge: readableTextColor must pick ink for yellow')
check(readableTextColor(INK) === PAPER, 'edge: readableTextColor must pick paper for ink')

for (const station of stationsWithLines) {
  const departures = stationDepartures(station.id)
  check(departures.length > 0, `edge: ${station.id} has no departures in a whole service day`)
  for (const departure of departures) {
    check(Number.isFinite(departure.time) && departure.time >= parseServiceTime(departure.line.first), `edge: ${station.id} has a departure outside ${departure.line.id}'s window`)
    check(departure.platform === station.platform, `edge: ${station.id} departure quotes the wrong platform`)
    check(departure.headsign.length > 0, `edge: ${station.id} departure ${departure.line.id} has no headsign`)
  }
  const board = nextDepartures(station.id, 8 * 60, 4)
  check(board.length === Math.min(4, departures.length), `edge: ${station.id} board returned ${board.length} entries instead of ${Math.min(4, departures.length)}`)
}

const overnightLines = lines.filter((line) => runsIntoNextDay(parseServiceTime(line.last)))
check(overnightLines.length > 0, 'edge: expected at least one line to run past midnight')
const afterMidnight = body('stop_times.txt').filter((row) => Number(row[1].slice(0, 2)) >= 24)
check(afterMidnight.length > 0, 'edge: trips after midnight must be published as 24:xx:00 in the feed')

for (const journey of findDirectJourneys('UNI', 'FLH', 0, 5)) {
  check(journey.arrival > journey.departure, `edge: ${journey.line.id} journey arrives before it departs`)
  check(journey.duration === (journey.arrival - journey.departure), `edge: ${journey.line.id} duration does not match its times`)
  check(journey.from.id === 'UNI' && journey.to.id === 'FLH', `edge: ${journey.line.id} journey has the wrong endpoints`)
}

/* ---------------------------------------------------------------- report --- */

if (failures.length > 0) {
  console.error(`\u2717 ${failures.length} data problem(s):`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}

console.log('\u2713 network and feed data are consistent\n')
console.log(`${stations.length} stations · ${lines.length} lines · ${totalTrips} trips per day · ${dailyStationCalls()} station calls per day\n`)
console.log('line    mode     window                 trips  stops  label contrast')
for (const line of lines) {
  const label = `${line.id}${line.circular ? '*' : ''}`
  console.log(
    `${label.padEnd(8)}${line.mode.padEnd(9)}${serviceWindow(line).padEnd(23)}${String(dailyTrips(line)).padStart(4)}  ${String(line.stops.length).padStart(5)}  ${contrastRatio(line.color, readableTextColor(line.color)).toFixed(2)}:1`,
  )
}
console.log('\nstation   lines')
for (const station of stationsWithLines) console.log(`${station.id.padEnd(10)}${station.lines.length}  (${station.lines.join(' ')})`)

console.log('\nfeed files')
for (const entry of files) console.log(`${entry.name.padEnd(17)}${String(entry.rows).padStart(7)} rows`)

console.log('\nnext departures from Hohenbrück Central after 08:00')
for (const departure of nextDepartures('HDC', 8 * 60, 4)) {
  console.log(`${serviceClock(departure.time)}  ${departure.line.id.padEnd(4)} ${departure.headsign}`)
}

console.log('\ndirect services Universität → Flughafen Ruhrenberg after 08:00')
for (const journey of findDirectJourneys('UNI', 'FLH', 8 * 60, 3)) {
  console.log(`${serviceClock(journey.departure)} → ${serviceClock(journey.arrival)}  ${journey.line.id.padEnd(4)} ${journey.duration} min`)
}
