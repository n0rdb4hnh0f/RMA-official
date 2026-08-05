export type Mode = 'rail' | 'metro' | 'tram' | 'brt' | 'ferry' | 'agt' | 'mono'
export type Line = { id:string; name:string; mode:Mode; color:string; description:string; frequency:number; first:string; last:string; circular?:boolean; stops:string[] }
export type Station = { name:string; code:string; district:string; description:string; facilities:string[]; lines:string[] }

export const serviceSettings = {
  feedPublisherName: 'Ruhrenberg Municipal Transport Authority', feedPublisherUrl: 'https://rma.ruhrenberg.local', feedLang: 'de', feedVersion: '2026.08.01', timezone: 'Europe/Berlin',
  serviceId: 'WEEKDAY', weekendServiceId: 'WEEKEND', calendar: { weekday: ['06:00','01:00'], weekend: ['07:00','02:00'] },
  note: 'Times are local time. Frequencies are typical daytime headways in minutes.'
}

const core = ['Hohenbrück Central','Rathaus','Hafen / Waterfront','Lindenplatz','Universität','Osttor']
export const stations: Station[] = [
 {name:'Hohenbrück Central',code:'HDC',district:'Hohenbrück',description:'Ruhrenberg’s principal interchange and the northern gateway to the city.',facilities:['Elevators','Bicycle parking','Customer centre','Accessible toilets'],lines:['S1','U2','U7','T18','A34']},
 {name:'Rathaus',code:'RAT',district:'Altstadt',description:'The civic heart of Ruhrenberg, directly beneath the City Hall quarter.',facilities:['Elevators','Tourist information','Retail','Step-free platform'],lines:['S1','U3','U7','T19','B22']},
 {name:'Hafen / Waterfront',code:'HAF',district:'Hafenviertel',description:'A cross-city interchange beside the river promenade and ferry piers.',facilities:['Ferry interchange','Bicycle parking','Park & Ride','Cafés'],lines:['S1','U5','T19','F31','F32','F33']},
 {name:'Lindenplatz',code:'LIN',district:'Linden',description:'A lively neighborhood square with direct tram and ring-line access.',facilities:['Elevators','Retail','Cycle hire'],lines:['S1','U9','T18','T20']},
 {name:'Universität',code:'UNI',district:'Campus',description:'The main campus station serving the university and research district.',facilities:['Elevators','Customer centre','Bicycle parking'],lines:['U2','U7','T21','M35']},
 {name:'Osttor',code:'OST',district:'Ostviertel',description:'The eastern interchange for residential districts and the airport corridor.',facilities:['Elevators','Park & Ride','Accessible toilets'],lines:['S1','U7','U14','B23','A34','M35']},
]
const colors = { rail:'#243d48', metro:'#df493d', tram:'#e7a635', brt:'#7352a2', ferry:'#1984a3', agt:'#3b9b78', mono:'#d46791' }
const defs: Array<[string,Mode,string,number,string,string]> = [
 ['S1','rail','Ring line',6,'04:45','00:35'], ...Array.from({length:16},(_,i)=>[`U${i+2}`,'metro',`Metro line ${i+2}`,4,'05:00','00:30'] as [string,Mode,string,number,string,string]),
 ['T18','tram','Tram line 18',10,'05:15','00:15'],['T19','tram','Tram line 19',10,'05:00','00:30'],['T20','tram','Tram line 20',10,'05:30','23:45'],['T21','tram','Tram line 21',12,'05:30','23:45'],
 ...Array.from({length:9},(_,i)=>[`B${i+22}`,'brt',`Bus rapid transit ${i+22}`,12,'05:30','23:30'] as [string,Mode,string,number,string,string]),
 ['F31','ferry','Hafen ferry 31',20,'06:00','22:40'],['F32','ferry','Hafen ferry 32',20,'06:20','23:00'],['F33','ferry','Hafen ferry 33',30,'06:40','22:40'],['A34','agt','Airport automated guideway',8,'04:30','00:30'],['M35','mono','Ruhrenberg monorail',10,'05:30','23:30']
]
export const lines: Line[] = defs.map(([id,mode,description,frequency,first,last],i)=>({ id, name:id, mode, color:colors[mode], description, frequency, first, last, circular:id==='S1', stops: id==='S1' ? core : [core[i%core.length],core[(i+1)%core.length],core[(i+3)%core.length],core[(i+4)%core.length]] }))

export const routeType: Record<Mode,number> = { rail:2, metro:1, tram:0, brt:3, ferry:4, agt:5, mono:6 }
const minutes = (value:string) => { const [h,m]=value.split(':').map(Number); return h*60+m }
const clock = (n:number) => `${String(Math.floor(n/60)%24).padStart(2,'0')}:${String(n%60).padStart(2,'0')}:00`
export function createGtfsFiles() {
  const stops = [...new Set(lines.flatMap(l=>l.stops))].map((name,i)=>`${`ST${String(i+1).padStart(2,'0')}`},${name},51.${240+i},6.${750+i},${(i%3)+1}`).join('\n')
  const stopId = (name:string) => `ST${String([...new Set(lines.flatMap(l=>l.stops))].indexOf(name)+1).padStart(2,'0')}`
  const routes = lines.map(l=>`${l.id},${l.name},${l.description},${routeType[l.mode]},${l.color.slice(1)}`).join('\n')
  const trips:string[]=[]; const stopTimes:string[]=[]
  lines.forEach(line=>{ const start=minutes(line.first), end=minutes(line.last); let n=0; for(let t=start;t<=end;t+=line.frequency,n++){ const trip=`${line.id}-${n+1}`; trips.push(`${trip},${line.id},${line.stops.at(-1)},${serviceSettings.serviceId}`); line.stops.forEach((s,i)=>{ const time=t+i*3; stopTimes.push(`${trip},${clock(time)},${clock(time)},${stopId(s)},${i+1}`) }) } })
  return { 'agency.txt':`agency_name,agency_url,agency_timezone,agency_lang\n${serviceSettings.feedPublisherName},${serviceSettings.feedPublisherUrl},${serviceSettings.timezone},${serviceSettings.feedLang}`, 'calendar.txt':'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nWEEKDAY,1,1,1,1,1,0,0,20260101,20261231\nWEEKEND,0,0,0,0,0,1,1,20260101,20261231', 'stops.txt':'stop_id,stop_name,stop_lat,stop_lon,platform_code\n'+stops, 'routes.txt':'route_id,route_short_name,route_long_name,route_type,route_color\n'+routes, 'trips.txt':'trip_id,route_id,trip_headsign,service_id\n'+trips.join('\n'), 'stop_times.txt':'trip_id,arrival_time,departure_time,stop_id,stop_sequence\n'+stopTimes.join('\n') }
}
