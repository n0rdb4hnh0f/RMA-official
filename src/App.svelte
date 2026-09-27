<script lang="ts">
  import { onMount } from 'svelte'
  import {
    dailyTripTotal,
    dailyTrips,
    findDirectJourneys,
    lineById,
    lineDirections,
    lines,
    modeCards,
    modeFilters,
    nextDepartures,
    parseServiceTime,
    readableTextColor,
    serviceClock,
    serviceSettings,
    serviceWindow,
    stationById,
    stations,
    stationsWithLines,
    type Mode,
    type Station,
  } from './lib/network'
  import { gtfsSummary } from './lib/gtfs'
  import { melodies, melodyById, type Melody } from './lib/melody'
  import { vehicles } from './lib/vehicles'

  /* The address bar is the application state. Every view has a shareable URL,
     the back button works, and deep links such as #/stations/HDC survive a
     reload, which is what a single page application needs to be usable. */
  const staticPages = ['network', 'fleet', 'brand', 'group', 'contact']
  let page = 'home'
  let routeId = ''
  let menuOpen = false
  let selectedMode: Mode | 'all' = 'all'

  function applyHash(): void {
    const hash = window.location.hash
    // In-page anchors such as the skip link must not change the view.
    if (hash !== '' && !hash.startsWith('#/')) return
    const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
    const segment = parts[0] ?? ''
    const id = parts[1] ?? ''
    if (segment === '') { page = 'home'; routeId = ''; return }
    if (segment === 'lines') { page = id === '' ? 'lines' : lineById(id) ? 'line' : 'notfound'; routeId = id; return }
    if (segment === 'stations') { page = id === '' ? 'stations' : stationById(id) ? 'station' : 'notfound'; routeId = id; return }
    page = staticPages.includes(segment) ? segment : 'notfound'
    routeId = ''
  }

  const clockMinutes = (): number => {
    const value = new Date()
    return value.getHours() * 60 + value.getMinutes()
  }

  /* Departure boards and journey results are calculated from the published
     timetable and refreshed on request, so the page never claims to be live. */
  let now = clockMinutes()
  let plannerFrom = 'HDC'
  let plannerTo = 'FLH'
  const updateTimes = (): void => { now = clockMinutes() }

  /* Platform sound. The melodies come from src/lib/melody.ts and play through
     one shared audio element, so two of them can never overlap. Nothing is
     downloaded or played until a passenger asks for a melody, and playback stops
     as soon as the view changes. */
  let melodyId = ''
  let melodyStatus = 'Nothing is playing yet.'
  let melodyAudio: HTMLAudioElement | null = null

  /** The player is created on the first request, never on page load. */
  function melodyPlayer(): HTMLAudioElement {
    if (melodyAudio !== null) return melodyAudio
    const audio = new Audio()
    audio.preload = 'none'
    audio.addEventListener('ended', () => {
      const played = melodyById(melodyId)
      melodyId = ''
      melodyStatus = played ? `${played.label} melody finished.` : 'Nothing is playing.'
    })
    audio.addEventListener('error', () => {
      melodyId = ''
      melodyStatus = 'The recording could not be loaded. Platform staff can play it through the station announcement system.'
    })
    melodyAudio = audio
    return audio
  }

  function stopMelody(status: string): void {
    melodyAudio?.pause()
    melodyId = ''
    melodyStatus = status
  }

  function toggleMelody(melody: Melody): void {
    if (melodyId === melody.id) {
      stopMelody(`${melody.label} melody stopped.`)
      return
    }
    const audio = melodyPlayer()
    audio.src = melody.file
    melodyId = melody.id
    melodyStatus = `${melody.label} melody playing.`
    // Every melody is one gesture away, so a rejected play() means the browser
    // has nowhere to send the sound rather than an autoplay policy.
    void audio.play().catch(() => stopMelody('This browser could not play the melody.'))
  }

  if (typeof window !== 'undefined') applyHash()

  onMount(() => {
    applyHash()
    const onHashChange = (): void => {
      /* A melody belongs to the view that was asked for, so it goes with it. */
      stopMelody('Nothing is playing yet.')
      applyHash()
      menuOpen = false
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      melodyAudio?.pause()
    }
  })

  $: selectedLine = lineById(routeId) ?? lines[0]
  $: selectedStation = stationsWithLines.find((station) => station.id === routeId) ?? stationsWithLines[0]
  $: visibleLines = selectedMode === 'all' ? lines : lines.filter((line) => line.mode === selectedMode)
  $: stationBoard = nextDepartures(selectedStation.id, now, 6)
  $: plannerJourneys = findDirectJourneys(plannerFrom, plannerTo, now, 4)
  $: plannerTarget = stationById(plannerTo)

  /* The busiest interchange takes the large tile in the station directory. */
  const majorStationId = [...stationsWithLines].sort((a, b) => b.lines.length - a.lines.length)[0]?.id ?? ''
  /* The hero diagram is a map, not a decoration: the ring line and the eight
     metro services, drawn from the station coordinates and the line colours in
     the network data. The ring is closed in map order so the loop cannot cross
     itself, and the metro services run as a bundle beside the main axis. */
  const heroRing = lines.find((line) => line.circular) ?? lines[0]
  const heroMetros = lines.filter((line) => line.mode === 'metro')
  const heroStops = stations.filter(
    (station) => heroRing?.stops.includes(station.id) || heroMetros.some((line) => line.stops.includes(station.id)),
  )
  const heroWidth = 440
  const heroHeight = 260
  const heroPad = 34
  const heroMinLon = Math.min(...heroStops.map((station) => station.lon))
  const heroMaxLat = Math.max(...heroStops.map((station) => station.lat))
  const heroCentre = heroStops.reduce(
    (sum, station) => ({ lon: sum.lon + station.lon / heroStops.length, lat: sum.lat + station.lat / heroStops.length }),
    { lon: 0, lat: 0 },
  )
  /** Degrees of longitude are shorter than degrees of latitude away from the equator. */
  const heroCos = Math.cos((heroCentre.lat * Math.PI) / 180)
  const heroSpanX = (Math.max(...heroStops.map((station) => station.lon)) - heroMinLon) * heroCos
  const heroSpanY = heroMaxLat - Math.min(...heroStops.map((station) => station.lat))
  const heroFit = Math.min((heroWidth - heroPad * 2) / heroSpanX, (heroHeight - heroPad * 2) / heroSpanY)
  const heroOriginX = (heroWidth - heroSpanX * heroFit) / 2
  const heroOriginY = (heroHeight - heroSpanY * heroFit) / 2
  const heroXY = (station: Station): { x: number; y: number } => ({
    x: +(heroOriginX + (station.lon - heroMinLon) * heroCos * heroFit).toFixed(1),
    y: +(heroOriginY + (heroMaxLat - station.lat) * heroFit).toFixed(1),
  })
  const heroPoint = (id: string, shift = 0): string => {
    const station = stationById(id)
    if (!station) return ''
    const { x, y } = heroXY(station)
    return `${(x + heroNormal.x * shift).toFixed(1)},${(y + heroNormal.y * shift).toFixed(1)}`
  }
  /* The metro services share the main axis, so each one is offset along the
     normal of the axis to keep all eight readable at once. */
  const heroNormal = (() => {
    const length = Math.hypot(heroSpanX, heroSpanY) || 1
    return { x: -heroSpanY / length, y: heroSpanX / length }
  })()
  const heroRingStops = [...new Set(heroRing?.stops ?? [])]
    .map((id) => stationById(id))
    .filter((station): station is Station => Boolean(station))
    .sort(
      (a, b) =>
        Math.atan2(a.lat - heroCentre.lat, (a.lon - heroCentre.lon) * heroCos) -
        Math.atan2(b.lat - heroCentre.lat, (b.lon - heroCentre.lon) * heroCos),
    )
  const heroMap = {
    viewBox: `0 0 ${heroWidth} ${heroHeight}`,
    label: `Map of the RMA network: the ${heroRing?.description ?? 'ring line'}, and the ${heroMetros.length} metro services that run along the main axis.`,
    lines: [
      { id: heroRing?.id ?? 'ring', color: heroRing?.color ?? '', weight: 7, points: heroRingStops.map((station) => heroPoint(station.id)).join(' ') },
      ...heroMetros.map((line, index) => ({
        id: line.id,
        color: line.color,
        weight: 2.4,
        points: line.stops.map((id) => heroPoint(id, (index - (heroMetros.length - 1) / 2) * 4.2)).filter(Boolean).join(' '),
      })),
    ],
    stations: heroStops.map((station) => ({ ...heroXY(station), major: station.id === majorStationId })),
    labels: heroRingStops.map((station, index) => ({
      text: station.id,
      x: heroXY(station).x,
      y: heroXY(station).y + (index % 2 === 0 ? 15 : 27),
    })),
  }

  /** Station names in travel order, e.g. "Universität · Hohenbrück · Rathaus". */
  const stopNames = (stops: string[]): string => stops.map((stop) => stationById(stop)?.short ?? stop).join(' · ')
  const lineOrigin = (stops: string[]): string => stationById(stops[0] ?? '')?.name ?? 'its starting station'
  $: lineStopList = selectedLine.circular ? selectedLine.stops.slice(0, -1) : selectedLine.stops
  $: lineJourneyTime = (selectedLine.stops.length - 1) * selectedLine.travelTime
  $: lineDescription = selectedLine.circular
    ? `${selectedLine.id} is a circular service. It calls at ${lineStopList.length} stations and returns to ${lineOrigin(selectedLine.stops)} after ${lineJourneyTime} minutes of running time.`
    : `${selectedLine.id} runs end to end in ${lineJourneyTime} minutes and calls at ${lineStopList.length} stations, from ${lineOrigin(selectedLine.stops)} to ${lineOrigin(selectedLine.stops.slice(-1))}.`

  const titles: Record<string, string> = {
    home: 'RMA · Ruhrenberg Municipal Transport Authority',
    network: 'Network and timetable data · RMA',
    lines: 'All lines · RMA',
    stations: 'Stations · RMA',
    fleet: 'Fleet · RMA',
    brand: 'Brand system · RMA',
    group: 'RMA Group · RMA',
    contact: 'Contact and site information · RMA',
    notfound: 'Page not found · RMA',
  }
  $: title = page === 'line'
    ? `${selectedLine.id} · ${selectedLine.name} · RMA`
    : page === 'station'
      ? `${selectedStation.name} · RMA`
      : titles[page] ?? titles.home
  $: description = page === 'line'
    ? `${selectedLine.description}: ${selectedLine.name}. First and last departures, every station on the line and open timetable data.`
    : page === 'station'
      ? `${selectedStation.name} station in ${selectedStation.district}: lines, facilities and next departures.`
      : `Ruhrenberg Municipal Transport Authority: ${lines.length} lines, ${stationsWithLines.length} stations, fleet records and open GTFS timetable data for the ring line, metro, trams, buses and river ferries.`
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
</svelte:head>

<div class="site-shell">
  <a class="skip-link" href="#main" onclick={(event) => { event.preventDefault(); document.getElementById('main')?.focus() }}>Skip to main content</a>
  <header class="mast">
    <div class="mast-meta">
      <p>Issue 22 · 1 September – 31 December 2026</p>
      <span>Site language: English</span>
    </div>
    <div class="mast-bar">
      <a class="mast-brand" href="#/" aria-label="RMA home"><span class="mast-word">RMA</span></a>
      <button class="menu-button" aria-label="Menu" aria-expanded={menuOpen} aria-controls="site-nav" onclick={() => (menuOpen = !menuOpen)}>☰</button>
    </div>
    <p class="mast-name">Ruhrenberg Municipal Transport Authority</p>
    <nav class="mast-nav" class:open={menuOpen} id="site-nav" aria-label="Primary">
      <ul>
        <li><a class:active={page === 'home'} href="#/">About RMA</a></li>
        <li><a class:active={page === 'network'} href="#/network">Our network</a></li>
        <li><a class:active={page === 'lines' || page === 'line'} href="#/lines">All lines</a></li>
        <li><a class:active={page === 'stations' || page === 'station'} href="#/stations">Stations</a></li>
        <li><a class:active={page === 'fleet'} href="#/fleet">Fleet</a></li>
        <li><a class:active={page === 'brand'} href="#/brand">Brand</a></li>
      </ul>
    </nav>
    <hr class="mast-rule" aria-hidden="true" />
  </header>

  <main id="main" tabindex="-1">
  {#if page === 'home'}
    <section class="hero">
      <div class="hero-copy">
        <h1>Public transport<br /><span class="accent">for everyone.</span></h1>
        <p>One city, one network. RMA runs the ring line, the metro, trams, buses and river ferries that connect every district of Ruhrenberg.</p>
      </div>
      <div class="hero-art">
        <svg viewBox={heroMap.viewBox} role="img" aria-label={heroMap.label} focusable="false">
          {#each heroMap.lines as line}
            <polyline stroke={line.color} points={line.points} stroke-width={line.weight} stroke-linecap="round" stroke-linejoin="round" />
          {/each}
          {#each heroMap.stations as station}
            <circle class:major={station.major} cx={station.x} cy={station.y} r={station.major ? 4 : 2.6} stroke-width={station.major ? 2 : 1.4} />
          {/each}
          {#each heroMap.labels as label}
            <text x={label.x} y={label.y} text-anchor="middle">{label.text}</text>
          {/each}
        </svg>
      </div>
    </section>

    <section class="planner">
      <div class="planner-title">
        <span class="route-icon" aria-hidden="true">→</span>
        <div><h2>Where are you going today?</h2><p>Two stations, and the next direct services between them.</p></div>
      </div>
      <div class="planner-form">
        <label for="planner-from">From<select id="planner-from" bind:value={plannerFrom}>{#each stationsWithLines as station}<option value={station.id}>{station.name}</option>{/each}</select></label>
        <label for="planner-to">To<select id="planner-to" bind:value={plannerTo}>{#each stationsWithLines as station}<option value={station.id}>{station.name}</option>{/each}</select></label>
        <button class="primary" type="button" onclick={updateTimes}>Show times after {serviceClock(now)}</button>
      </div>
      {#if plannerFrom === plannerTo}
        <p class="feed-note">Choose two different stations to see direct services.</p>
      {:else if plannerJourneys.length === 0}
        <p class="feed-note">No direct service runs from {stationById(plannerFrom)?.name} to {plannerTarget?.name} at this time of day. Change at Rathaus or Osttor; through tickets are valid on every RMA service.</p>
      {:else}
        <div class="connection-list">
          {#each plannerJourneys as journey}
            <a href={`#/lines/${journey.line.id}`}>
              <span>{journey.line.id} → {journey.to.short} <small>{journey.line.description}</small></span>
              {serviceClock(journey.departure)} – {serviceClock(journey.arrival)} · {journey.duration} min
            </a>
          {/each}
        </div>
        <p class="feed-note">Direct services only. Every RMA ticket allows a change of service at any station.</p>
      {/if}
    </section>

    <section id="network">
      <div class="section-heading">
        <div><h2>A network you can read at a glance.</h2><p class="label">{lines.length} lines · {stationsWithLines.length} stations · seven modes</p></div>
        <a class="text-link" href="#/network">Explore the network <span aria-hidden="true">↗</span></a>
      </div>
      <div class="mode-grid">
        {#each modeCards as mode}
          <div class="mode-card">
            <span class="mode-icon {mode.id}" style={`--mode:${mode.color};--mode-ink:${readableTextColor(mode.color)}`} aria-hidden="true">{mode.icon}</span>
            <h3>{mode.label}</h3>
            <p>{mode.sub}</p>
          </div>
        {/each}
      </div>
      <p class="feed-note">Timetable data for every line is published as open GTFS: <a class="text-link" href="#/network">files and versions</a>.</p>
    </section>

    <section class="home-columns">
      <article>
        <h2>One authority.<br />A whole city.</h2>
        <p>RMA plans, operates and develops the transport network that connects every district of Ruhrenberg. One ticket, one timetable, one standard of service.</p>
        <a class="text-link" href="#/group">How RMA works <span aria-hidden="true">↗</span></a>
      </article>
      <article>
        <h2>Find your way<br />around RMA.</h2>
        <p>Browse {lines.length} lines and {stationsWithLines.length} stations, look up facilities and connections, or read the fleet records behind the service.</p>
        <a class="text-link" href="#/lines">Browse all lines <span aria-hidden="true">↗</span></a>
      </article>
    </section>
  {:else if page === 'network'}
    <section class="page-intro">
      <h1>One connected<br />Ruhrenberg.</h1>
      <p>{lines.length} lines across seven modes meet at {stationsWithLines.length} stations: the ring line, eight metro services, trams, BRT, river ferries, the airport people mover and the monorail.</p>
    </section>
    <section>
      <div class="section-heading"><div><h2>Choose your way through the city.</h2></div></div>
      <div class="mode-grid">
        {#each modeCards as mode}
          <div class="mode-card">
            <span class="mode-icon {mode.id}" style={`--mode:${mode.color};--mode-ink:${readableTextColor(mode.color)}`} aria-hidden="true">{mode.icon}</span>
            <h3>{mode.label}</h3>
            <p>{mode.sub}</p>
          </div>
        {/each}
      </div>
    </section>
    <section class="network-principles">
      <h2>Simple to read.<br />Easy to use.</h2>
      <p>Every service belongs to a line family with its own number and colour, so a platform sign, a timetable and a journey planner tell the same story. Interchanges are step-free, and an RMA ticket is valid on every mode in this network.</p>
    </section>
    <section class="updates">
      <div class="section-heading"><div><h2>Open timetable data.</h2><p class="label">Feed version {serviceSettings.feedVersion}</p></div></div>
      <div class="detail-grid">
        <article>
          <h3 class="card-title">GTFS files</h3>
          <div class="stop-list">
            {#each gtfsSummary() as file}<div class="facility"><b>{file.name}</b> · {file.rows} rows</div>{/each}
          </div>
        </article>
        <article>
          <h3 class="card-title">What the feed contains</h3>
          <div class="facility">Timetable period 1 September to 31 December 2026, with one daily service calendar.</div>
          <div class="facility">Both travel directions of all {lines.length} lines, with headsigns and direction ids.</div>
          <div class="facility">Stop times in service-day format, so a trip after midnight keeps the previous day's date instead of wrapping to 00:00.</div>
          <div class="facility">Frequencies, shapes and route colours generated from the same data that draws this website.</div>
          <p class="feed-note">{serviceSettings.note}</p>
        </article>
      </div>
      <div class="db-note">
        <span class="db-dot" aria-hidden="true"></span>
        <span>Network model · one data source for the website and the feed · {stationsWithLines.length} stations · {lines.length} lines · {dailyTripTotal()} trips a day</span>
      </div>
    </section>
  {:else if page === 'lines'}
    <section class="page-intro compact"><h1>Know your<br />line.</h1><p>Every RMA service with the stations it calls at, the headway it keeps and the hours it runs.</p></section>
    <section class="directory" id="map">
      <div class="section-heading">
        <div><h2>Every line, one system.</h2><p class="label">{visibleLines.length} of {lines.length} lines shown</p></div>
      </div>
      <div class="line-filters">
        {#each modeFilters as filter}
          <button class:chosen={selectedMode === filter.mode} onclick={() => (selectedMode = filter.mode)}>{filter.label} {filter.count}</button>
        {/each}
      </div>
      <div class="line-table">
        {#each visibleLines as line}
          <a class="line-row" href={`#/lines/${line.id}`} style={`--line:${line.color};--line-ink:${readableTextColor(line.color)}`}>
            <span class="route-pill">{line.id}</span>
            <span><b>{line.description}</b><small>{stopNames(line.circular ? line.stops.slice(0, -1) : line.stops)}</small></span>
            <span class="line-meta">Every {line.frequency} min<br /><small>{serviceWindow(line)}</small></span>
          </a>
        {/each}
      </div>
      <p class="feed-note">{serviceSettings.note} Windows that run past midnight are marked (+1 day).</p>
    </section>
  {:else if page === 'line'}
    <section class="detail-hero detail-hero--line" style={`--line:${selectedLine.color};--line-ink:${readableTextColor(selectedLine.color)}`}>
      <a class="back-link" href="#/lines">← All lines</a>
      <span class="large-route" aria-hidden="true">{selectedLine.id}</span>
      <h1>{selectedLine.name}</h1>
      <p>{lineDescription}</p>
    </section>
    <section class="detail-grid">
      <article>
        <h3 class="card-title">At a glance</h3>
        <div class="facts">
          <div><b>{serviceClock(parseServiceTime(selectedLine.first))}</b><small>First departure</small></div>
          <div><b>{serviceClock(parseServiceTime(selectedLine.last))}</b><small>Last departure{parseServiceTime(selectedLine.last) >= 1440 ? ' · next day' : ''}</small></div>
          <div><b>{selectedLine.frequency} min</b><small>Daytime headway</small></div>
          <div><b>{lineStopList.length}</b><small>Stations served</small></div>
          <div><b>{dailyTrips(selectedLine)}</b><small>Trips per day</small></div>
          <div><b>{lineJourneyTime} min</b><small>End to end</small></div>
        </div>
      </article>
      <article>
        <h3 class="card-title">Stations on this line</h3>
        <div class="stop-list">
          {#each lineStopList as stop, index}
            <a href={`#/stations/${stop}`}>
              <span>{String(index + 1).padStart(2, '0')}</span><b>{stationById(stop)?.name}</b><span class="arrow" aria-hidden="true">→</span>
            </a>
          {/each}
        </div>
        {#if selectedLine.circular}
          <p class="feed-note">The ring runs in both directions and returns to {lineOrigin(selectedLine.stops)}.</p>
        {/if}
      </article>
    </section>
    <section class="updates">
      <div class="section-heading"><div><h2>Both directions, every day.</h2></div></div>
      <div class="detail-grid">
        <article>
          <h3 class="card-title">Directions</h3>
          {#each lineDirections(selectedLine) as direction}
            <div class="facility"><b>{direction.headsign}</b> · calls at {stopNames(direction.stops)}</div>
          {/each}
        </article>
        <article>
          <h3 class="card-title">Service window</h3>
          <div class="facility">{serviceWindow(selectedLine)}, every {selectedLine.frequency} minutes during the day.</div>
          <div class="facility">Times are local time ({serviceSettings.timezone}); the published timetable covers 1 September to 31 December 2026.</div>
          <div class="facility">This line is part of the open GTFS feed, version {serviceSettings.feedVersion}.</div>
        </article>
      </div>
    </section>
  {:else if page === 'stations'}
    <section class="page-intro compact"><h1>Every station<br />at a glance.</h1><p>Facilities, lines and next departures for each of the {stationsWithLines.length} stations in the RMA network.</p></section>
    <section class="station-grid">
      {#each stationsWithLines as station}
        <a class="station-card" class:major={station.id === majorStationId} href={`#/stations/${station.id}`}>
          <span class="station-code">{station.id}</span>
          <span class="label">{station.district}</span>
          <h2>{station.name}</h2>
          <p>{station.description}</p>
          <div>{#each station.lines as line}<span>{line}</span>{/each}</div>
          <span class="label">Station details</span>
        </a>
      {/each}
    </section>

  {:else if page === 'station'}
    <section class="detail-hero station-detail">
      <a class="back-link" href="#/stations">← All stations</a>
      <span class="station-code big">{selectedStation.id}</span>
      <p class="label">{selectedStation.district}</p>
      <h1>{selectedStation.name}</h1>
      <p>{selectedStation.description}</p>
    </section>
    <section class="station-info">
      <article>
        <h3 class="card-title">Facilities</h3>
        <div class="facility">Platforms {selectedStation.platform}</div>
        {#each selectedStation.facilities as facility}<div class="facility">{facility}</div>{/each}
        <p class="feed-note">Every RMA platform is step-free. Assistance can be arranged at the customer centre or with staff on the platform.</p>
      </article>
      <article>
        <h3 class="card-title">Lines &amp; connections</h3>
        <div class="connection-list">
          {#each selectedStation.lines as lineId}
            <a href={`#/lines/${lineId}`}><span>{lineId} · {lineById(lineId)?.description}</span>View line <span aria-hidden="true">→</span></a>
          {/each}
        </div>
      </article>
    </section>
    <section class="updates">
      <div class="section-heading">
        <div><h2>From {selectedStation.name} after {serviceClock(now)}</h2><p class="label">Next departures · sample board</p></div>
        <button class="text-link" onclick={updateTimes}>Update times</button>
      </div>
      <div class="connection-list">
        {#each stationBoard as departure}
          <a href={`#/lines/${departure.line.id}`}>
            <span>{departure.line.id} → {departure.headsign} <small>Platform {departure.platform}</small></span>
            {serviceClock(departure.time)}{departure.nextServiceDay ? ' (+1 day)' : ''}
          </a>
        {/each}
      </div>
      <p class="feed-note">This board is calculated from the published timetable at the time the page was opened. Live running information arrives with the GTFS-Realtime feed.</p>
    </section>
    <section class="platform-sound">
      <div class="section-heading">
        <div>
          <h2>Sound on the platform.</h2>
          <p class="label">{melodies.length} platform events · RMA station sound library</p>
        </div>
      </div>
      <p class="sound-intro">Sound is part of the passenger information at {selectedStation.name}: one melody as a service arrives, one as it departs, and one when a service passes through without stopping. The same three melodies play on every RMA platform, beside the visual and tactile guidance that carries the same message.</p>
      <div class="melody-board">
        {#each melodies as melody}
          <button
            class="melody-row"
            type="button"
            aria-label={`${melody.label} melody`}
            aria-pressed={melodyId === melody.id}
            onclick={() => toggleMelody(melody)}
          >
            <span class="melody-copy"><b>{melody.label}</b><small>{melody.description}</small></span>
            <span class="melody-length">{melody.seconds.toFixed(1)} s</span>
            <span class="melody-action">{melodyId === melody.id ? 'Stop' : 'Play'}</span>
          </button>
        {/each}
      </div>
      <p class="feed-note" role="status">{melodyStatus}</p>
      <p class="feed-note">A melody only sounds when a passenger asks for one: nothing plays on page load or on hover, and playback stops as soon as you leave the page. Recordings: RMA station sound library, uncompressed 48 kHz stereo.</p>
    </section>
  {:else if page === 'fleet'}
    <section class="page-intro compact"><h1>Five generations.<br />One shared city.</h1><p>From mechanical controllers to silicon-carbide power electronics, every vehicle records a chapter of Ruhrenberg’s transport history.</p></section>
    <section class="fleet-grid">
      {#each vehicles as vehicle}
        <article class="vehicle-card" style={`--vehicle:${vehicle.color}`}>
          <div class="vehicle-illustration" aria-hidden="true">
            <div class="vehicle-front"></div>
            <div class="vehicle-window"></div>
            <div class="vehicle-belt"></div>
            <b>{vehicle.id}</b>
          </div>
          <div class="vehicle-copy">
            <div class="vehicle-top"><span class="label">{vehicle.era} · {vehicle.status}</span><span class="label">Lines {vehicle.lines}</span></div>
            <h2>{vehicle.name}</h2>
            <p class="maker">{vehicle.maker}</p>
            <p>{vehicle.description}</p>
            <div class="vehicle-specs"><span class="spec-main"><b>Era</b>{vehicle.era}</span><span><b>Control</b>{vehicle.control}</span><span><b>Capacity</b>{vehicle.seats}</span><span><b>Access</b>{vehicle.accessibility}</span></div>
          </div>
        </article>
      {/each}
    </section>
    <section class="fleet-note">
      <h2>Accessibility comes as standard.</h2>
      <p>Level boarding, open circulation, tactile guidance, audible announcements and room for every kind of journey are part of the specification, not an extra. The yellow belt is both a brand signature and a wayfinding device for passengers on the platform.</p>
    </section>

  {:else if page === 'brand'}
    <section class="page-intro compact"><h1>A clear identity<br />for a connected city.</h1><p>The RMA identity is built to be recognisable at a station, on a vehicle and across every digital service.</p></section>
    <section class="brand-guide">
      <div class="brand-swatch">
        <div class="yellow-block"><span>RMA</span><small>#FFF12B</small></div>
        <div class="swatch-meta"><h2>Ruhrenberg Yellow</h2><p>The primary corporate colour, reserved for the masthead wordmark and the primary action on a page, so that it keeps its meaning everywhere else.</p><code>RGB 255, 241, 43 · HEX #FFF12B · CMYK 0, 6, 83, 0</code></div>
      </div>
      <div class="brand-rules">
        <article><h3 class="card-title">Type</h3><h2>DM Sans</h2><p>DM Sans carries navigation, information and functional communication. DM Mono sets codes, times and labels, and Playfair Display is reserved for the masthead wordmark and the route number watermark.</p></article>
        <article><h3 class="card-title">Colour in use</h3>
          <div class="colour-row"><span class="colour-chip yellow"></span><div><b>Ruhrenberg Yellow #FFF12B</b><small>Attention · optimism · civic energy · 12.4:1 with RMA Ink</small></div></div>
          <div class="colour-row"><span class="colour-chip ink"></span><div><b>RMA Ink #192B36</b><small>Trust · clarity · infrastructure · 14.6:1 with white</small></div></div>
          <div class="colour-row"><span class="colour-chip red"></span><div><b>Service Red #DF493D</b><small>Interchange · action · darkened to #B3372B for small text, which reaches 5.33:1 on the page surface</small></div></div>
        </article>
      </div>
    </section>
  {:else if page === 'group'}
    <section class="page-intro compact"><h1>One network.<br />One promise.</h1><p>RMA is the public transport authority for Ruhrenberg: it plans the network, sets the standard and operates the services through its business areas.</p></section>
    <section class="group-grid">
      <article><span class="group-no">01</span><h2>RMA</h2><p>The authority owns the network plan, the fare system and the passenger promise, and commissions every service in this directory.</p></article>
      <article><span class="group-no">02</span><h2>RMA Rail &amp; Metro<br />RMA Tram &amp; Bus</h2><p>The operating companies run the ring line, the eight metro services, trams, BRT and the airport people mover to one timetable and one accessibility standard.</p></article>
      <article><span class="group-no">03</span><h2>RMA Water<br />RMA Develop</h2><p>River ferries connect the waterfront piers to the tram network, and RMA Develop looks after the places around our stations.</p></article>
      <article><span class="group-no">04</span><h2>RPME</h2><p>Ruhrenberg Public Maintenance Enterprise keeps track, structures and stations safe, reliable and ready for the next journey.</p></article>
    </section>

  {:else if page === 'contact'}
    <section class="page-intro compact"><h1>Talk to<br />RMA.</h1><p>Customer service, lost property and accessibility assistance for the whole network.</p></section>
    <section class="detail-grid">
      <article>
        <h3 class="card-title">Customer service</h3>
        <div class="facility">RMA Customer Centre, Hohenbrück Central, opposite platform 1</div>
        <div class="facility">Open every day, 06:00 to 22:00</div>
        <div class="facility">Lost property is registered at the customer centre and returned at Rathaus</div>
        <div class="facility">Accessibility assistance can be booked at any staffed station or on board</div>
      </article>
      <article>
        <h3 class="card-title">About this site</h3>
        <div class="facility">Ruhrenberg is a fictional city, and RMA is a demonstration transport authority. Station names, timetables and fleet records are illustrative.</div>
        <div class="facility">The timetable data on this site is generated from a single network model and published as the GTFS feed described on the network page.</div>
        <a class="text-link" href="#/network">Timetable data and feed versions <span aria-hidden="true">↗</span></a>
      </article>
    </section>

  {:else}
    <section class="page-intro compact"><h1>Error 404.<br />That page does not exist.</h1><p>The address may be out of date. Every RMA line and station has its own page, so it is easy to start again.</p></section>
    <section class="home-columns">
      <article><h2>Line directory</h2><p>All {lines.length} services with their stations, headways and service windows.</p><a class="text-link" href="#/lines">Open the line directory <span aria-hidden="true">↗</span></a></article>
      <article><h2>Station directory</h2><p>Facilities, connections and departure boards for all {stationsWithLines.length} stations.</p><a class="text-link" href="#/stations">Open the station directory <span aria-hidden="true">↗</span></a></article>
    </section>
  {/if}
  </main>

  <footer class="site-footer">
    <a class="brand" href="#/" aria-label="RMA home"><b>RMA</b><small>Ruhrenberg Municipal Transport Authority</small></a>
    <p>© 2026 RMA · Ruhrenberg Municipal Transport Authority. Public transport for everyone.</p>
    <nav aria-label="Footer">
      <a href="#/contact">Contact</a><a href="#/network">Timetable data</a><a href="#/brand">Brand</a>
    </nav>
  </footer>
</div>
