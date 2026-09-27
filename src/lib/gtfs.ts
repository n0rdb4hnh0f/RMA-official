/**
 * GTFS feed generator for the RMA network.
 *
 * Everything is derived from src/lib/network.ts, so the published feed and the
 * website can never disagree. Times are written in the service-day format GTFS
 * expects, where hours may exceed 23: a departure at 24:35 is written as
 * "24:35:00" rather than wrapping to "00:35:00".
 */
import {
  gtfsTime,
  lineDirections,
  lines,
  readableTextColor,
  routeType,
  serviceSettings,
  stationById,
  stations,
  tripTimes,
} from './network.ts'

export type GtfsFile = { name: string; rows: number; content: string }

/** Builds a CSV document, quoting values that contain commas, quotes or newlines. */
function csv(rows: Array<Array<string | number>>): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value)
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
        })
        .join(','),
    )
    .join('\n')
}

function file(name: string, rows: Array<Array<string | number>>): GtfsFile {
  return { name, rows: rows.length - 1, content: csv(rows) }
}

const pad = (value: number, length = 3): string => String(value).padStart(length, '0')
const hex = (color: string): string => color.replace('#', '').toUpperCase()

/** Builds every file of the RMA GTFS feed, including row counts for the open-data page. */
export function buildGtfsFiles(): GtfsFile[] {
  const tripRows: Array<Array<string | number>> = [['route_id', 'service_id', 'trip_id', 'trip_headsign', 'trip_short_name', 'direction_id', 'shape_id', 'wheelchair_accessible', 'bikes_allowed']]
  const stopTimeRows: Array<Array<string | number>> = [['trip_id', 'arrival_time', 'departure_time', 'stop_id', 'stop_sequence', 'stop_headsign', 'timepoint']]
  const shapeRows: Array<Array<string | number>> = [['shape_id', 'shape_pt_lat', 'shape_pt_lon', 'shape_pt_sequence']]
  const frequencyRows: Array<Array<string | number>> = [['trip_id', 'start_time', 'end_time', 'headway_secs', 'exact_times']]

  for (const line of lines) {
    const departures = tripTimes(line)
    for (const direction of lineDirections(line)) {
      const suffix = direction.id === 0 ? 'A' : 'B'
      const shapeId = `${line.id}-${suffix}`
      const tripId = (index: number): string => `${line.id}-${suffix}-${pad(index + 1)}`

      // One shape point per station in travel order. Surveyed alignments replace
      // these station-to-station segments in the production feed.
      direction.stops.forEach((stationId, index) => {
        const station = stationById(stationId)
        if (station) shapeRows.push([shapeId, station.lat, station.lon, index + 1])
      })

      departures.forEach((departure, index) => {
        tripRows.push([line.id, serviceSettings.serviceId, tripId(index), direction.headsign, line.description, direction.id, shapeId, 1, 1])
        direction.stops.forEach((stationId, stopIndex) => {
          const time = gtfsTime(departure + stopIndex * line.travelTime)
          stopTimeRows.push([tripId(index), time, time, stationId, stopIndex + 1, direction.headsign, 1])
        })
      })

      const last = departures[departures.length - 1]
      if (departures.length > 1 && last !== undefined) frequencyRows.push([tripId(0), gtfsTime(departures[0]), gtfsTime(last), line.frequency * 60, 1])
    }
  }

  return [
    file('agency.txt', [
      ['agency_id', 'agency_name', 'agency_url', 'agency_timezone', 'agency_lang'],
      [serviceSettings.agencyId, serviceSettings.authorityName, serviceSettings.feedPublisherUrl, serviceSettings.timezone, serviceSettings.feedLang],
    ]),
    file('stops.txt', [
      ['stop_id', 'stop_name', 'stop_lat', 'stop_lon', 'platform_code'],
      ...stations.map((station) => [station.id, station.name, station.lat, station.lon, station.platform]),
    ]),
    file('routes.txt', [
      ['route_id', 'agency_id', 'route_short_name', 'route_long_name', 'route_type', 'route_color', 'route_text_color'],
      ...lines.map((line) => [line.id, serviceSettings.agencyId, line.id, line.name, routeType[line.mode], hex(line.color), hex(readableTextColor(line.color))]),
    ]),
    file('calendar.txt', [
      ['service_id', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'start_date', 'end_date'],
      [serviceSettings.serviceId, 1, 1, 1, 1, 1, 1, 1, serviceSettings.calendarStart, serviceSettings.calendarEnd],
    ]),
    file('trips.txt', tripRows),
    file('stop_times.txt', stopTimeRows),
    file('frequencies.txt', frequencyRows),
    file('shapes.txt', shapeRows),
    file('feed_info.txt', [
      ['feed_publisher_name', 'feed_publisher_url', 'feed_lang', 'default_lang', 'feed_start_date', 'feed_end_date', 'feed_version'],
      [serviceSettings.feedPublisherName, serviceSettings.feedPublisherUrl, serviceSettings.feedLang, serviceSettings.feedLang, serviceSettings.calendarStart, serviceSettings.calendarEnd, serviceSettings.feedVersion],
    ]),
  ]
}

/** File names and row counts, for the open-data list on the network page. */
export const gtfsSummary = (): Array<{ name: string; rows: number }> =>
  buildGtfsFiles().map(({ name, rows }) => ({ name, rows }))
