import type { Line } from './network'
export type VehiclePosition = { vehicleId:string; tripId:string; routeId:string; color:string; from:string; to:string; progress:number; bearing:number; status:'IN_TRANSIT_TO'|'STOPPED_AT'; updatedAt:string }

// This is the browser-side contract for a future GTFS-Realtime VehiclePosition feed.
// Replace simulateVehiclePositions() with fetch('/vehicle-positions.pb') or a WebSocket
// adapter later; the UI consumes the same VehiclePosition[] either way.
export type RealtimeFeed = { header:{ gtfsRealtimeVersion:string; timestamp:number }; entity:Array<{id:string; vehicle:{trip:{tripId:string;routeId:string};position:{latitude:number;longitude:number};currentStatus:string;timestamp:number}}> }
export function simulateVehiclePositions(lines:Line[], now = Date.now()): VehiclePosition[] {
  // One simulated vehicle is created for every scheduled departure currently
  // active on every line, rather than one representative vehicle per line.
  const seconds = Math.floor(now / 1000)
  return lines.flatMap((line, lineIndex) => {
    const serviceMinutes = (24 * 60 + Number(line.last.slice(0, 2)) * 60 + Number(line.last.slice(3))) - (Number(line.first.slice(0, 2)) * 60 + Number(line.first.slice(3)))
    const fleetSize = Math.max(1, Math.ceil(serviceMinutes / line.frequency))
    return Array.from({ length: fleetSize }, (_, fleetIndex) => {
      const tick = Math.floor(seconds / 15) + lineIndex * 11 + fleetIndex * 5
      const stopIndex = Math.floor(tick / 4) % line.stops.length
      const progress = (tick % 4) / 4
      return { vehicleId:`${line.id}-V${String(fleetIndex + 1).padStart(2, '0')}`, tripId:`${line.id}-RT-${String(fleetIndex + 1).padStart(3, '0')}`, routeId:line.id, color:line.color, from:line.stops[stopIndex], to:line.stops[(stopIndex + 1) % line.stops.length], progress, bearing:(stopIndex * 58) % 360, status:progress === 0 ? 'STOPPED_AT' : 'IN_TRANSIT_TO', updatedAt:new Date(now).toISOString() as string }
    })
  })
}
