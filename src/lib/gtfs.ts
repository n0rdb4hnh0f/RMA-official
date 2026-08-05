export type Stop = { id: string; name: string; lat: number; lon: number; platform?: string }
export type Trip = { id: string; route: string; headsign: string; color: string; stops: string[]; times: string[] }
export const gtfsSql = `CREATE TABLE stops (stop_id TEXT PRIMARY KEY, stop_name TEXT NOT NULL, stop_lat REAL, stop_lon REAL, platform_code TEXT);
CREATE TABLE routes (route_id TEXT PRIMARY KEY, route_short_name TEXT NOT NULL, route_long_name TEXT, route_type INTEGER, route_color TEXT);
CREATE TABLE trips (trip_id TEXT PRIMARY KEY, route_id TEXT REFERENCES routes, trip_headsign TEXT, service_id TEXT);
CREATE TABLE stop_times (trip_id TEXT REFERENCES trips, arrival_time TEXT, departure_time TEXT, stop_id TEXT REFERENCES stops, stop_sequence INTEGER, PRIMARY KEY(trip_id, stop_sequence));`
export const stops: Stop[] = [
  { id:'HDC', name:'Hohenbrück Central', lat:51.243, lon:6.782, platform:'1–4' }, { id:'RAT', name:'Rathaus', lat:51.229, lon:6.775, platform:'A–D' },
  { id:'HAF', name:'Hafen / Waterfront', lat:51.218, lon:6.765, platform:'1–2' }, { id:'LIN', name:'Lindenplatz', lat:51.235, lon:6.801, platform:'A–B' },
  { id:'UNI', name:'Universität', lat:51.246, lon:6.754, platform:'1–2' }, { id:'OST', name:'Osttor', lat:51.235, lon:6.832, platform:'1–3' },
]
export const trips: Trip[] = [
  { id:'S1-1201', route:'S1', headsign:'Hafen', color:'#243d48', stops:['HDC','LIN','RAT','HAF'], times:['12:01','12:06','12:12','12:19'] },
  { id:'U7-1204', route:'U7', headsign:'Osttor', color:'#df493d', stops:['UNI','HDC','RAT','OST'], times:['12:04','12:09','12:15','12:22'] },
  { id:'T19-1210', route:'T19', headsign:'Lindenplatz', color:'#e7a635', stops:['HAF','RAT','LIN'], times:['12:10','12:15','12:21'] },
  { id:'F32-1220', route:'F32', headsign:'Hafen', color:'#1984a3', stops:['HDC','HAF'], times:['12:20','12:31'] },
  { id:'U7-1234', route:'U7', headsign:'Osttor', color:'#df493d', stops:['UNI','HDC','RAT','OST'], times:['12:34','12:39','12:45','12:52'] },
]
export function findJourneys(from: string, to: string) { const a=stops.find(s=>s.id===from||s.name.toLowerCase().includes(from.toLowerCase())); const b=stops.find(s=>s.id===to||s.name.toLowerCase().includes(to.toLowerCase())); if(!a||!b)return []; return trips.filter(t=>t.stops.indexOf(a.id)>=0&&t.stops.indexOf(b.id)>t.stops.indexOf(a.id)).map(t=>{const i=t.stops.indexOf(a.id),j=t.stops.indexOf(b.id);return {...t,depart:t.times[i],arrive:t.times[j],duration:`${j-i} stop${j-i>1?'s':''}`}}) }
