<script lang="ts">
  let menuOpen = false
  let page = 'home'
  function navigate(next: string) { page = next; menuOpen = false; window.scrollTo({ top: 0, behavior: 'smooth' }) }
  import { stops, trips, gtfsSql } from './lib/gtfs'
  import { lines, stations, serviceSettings } from './lib/network'
  import { vehicles } from './lib/vehicles'
  let selectedMode = 'all'
  let selectedLine = lines[0]
  let selectedStation = stations[0]
  function openLine(line: typeof lines[number]) { selectedLine = line; navigate('line') }
  function openStation(station: typeof stations[number]) { selectedStation = station; navigate('station') }
  $: visibleLines = selectedMode === 'all' ? lines : lines.filter(line => line.mode === selectedMode)

  const modes = [
    { id: 'metro', label: 'Metro', sub: 'Ring line S1 / Metro U2–U17', icon: 'M' },
    { id: 'tram', label: 'Tram & Bus', sub: 'LRT T18–T21 / BRT B22–B30', icon: 'T' },
    { id: 'water', label: 'Water', sub: 'Ferries F31–F33 / AGT A34', icon: 'W' },
  ]
</script>

<svelte:head><title>RMA · Ruhrenberg Municipal Transport Authority</title><meta name="description" content="Transportation for all citizens." /></svelte:head>

<div class="site-shell">
  <header>
    <a class="brand" href="/" aria-label="RMA home"><span class="mark">R</span><span><b>RMA</b><small>RUHRENBERG MUNICIPAL<br />TRANSPORT AUTHORITY</small></span></a>
    <button class="menu-button" aria-label="Toggle navigation" onclick={() => menuOpen = !menuOpen}>☰</button>
    <nav class:open={menuOpen}>
      <a class:active={page === 'home'} href="#home" onclick={(e) => { e.preventDefault(); navigate('home') }}>About RMA</a><a class:active={page === 'network'} href="#network" onclick={(e) => { e.preventDefault(); navigate('network') }}>Our network</a><a class:active={page === 'lines' || page === 'line'} href="#lines" onclick={(e) => { e.preventDefault(); navigate('lines') }}>All lines</a><a class:active={page === 'stations' || page === 'station'} href="#stations" onclick={(e) => { e.preventDefault(); navigate('stations') }}>Stations</a><a class:active={page === 'fleet'} href="#fleet" onclick={(e) => { e.preventDefault(); navigate('fleet') }}>Fleet</a><a class:active={page === 'brand'} href="#brand" onclick={(e) => { e.preventDefault(); navigate('brand') }}>Brand</a>
    </nav>
    <div class="header-actions"><span class="lang-static">EN</span></div>
  </header>

  <main>
  {#if page === 'home'}
    <section class="hero" id="travel">
      <div class="hero-copy"><p class="eyebrow">WELCOME TO RUHRENBERG</p><h1>Transportation<br /><em>for all citizens.</em></h1><p class="intro">One city. Every direction. RMA connects Ruhrenberg with a network designed around the way you live.</p></div>
      <div class="hero-art" aria-label="Stylized Ruhrenberg transit map"><div class="sun"></div><div class="map-lines"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="station s1">HDC</div><div class="station s2">N</div><div class="station s3">R</div><div class="map-label l1">Hohenbrück Central</div><div class="map-label l2">Rathaus</div><div class="map-label l3">Hafen</div></div>
    </section>

    <section class="network" id="network"><div class="section-heading"><div><p class="eyebrow">THE RMA NETWORK · {stops.length} STATIONS · {trips.length} DEPARTURES</p><h2>Move freely across the city.</h2></div><button class="text-link button-link" onclick={() => navigate('network')}>Explore the network <span>↗</span></button></div><div class="mode-grid">{#each modes as mode}<div class="mode-card"><span class="mode-icon {mode.id}">{mode.icon}</span><span><strong>{mode.label}</strong><small>{mode.sub}</small></span></div>{/each}</div><div class="db-note"><span class="db-dot"></span><span>Network specification · {gtfsSql.split('\n')[0].slice(0, 48)}…</span></div></section>
    <section class="home-columns"><article><p class="eyebrow">PUBLIC SERVICE</p><h2>One authority.<br />A whole city.</h2><p>RMA plans, operates and develops the transport network that connects every district of Ruhrenberg.</p><button class="text-link button-link" onclick={() => navigate('group')}>How RMA works <span>↗</span></button></article><article><p class="eyebrow">IN THIS SITE</p><h2>Find your way<br />around RMA.</h2><p>Explore our network, understand our lines and meet the group behind transportation for all citizens.</p><button class="text-link button-link" onclick={() => navigate('lines')}>Browse all lines <span>↗</span></button></article></section>
  {:else if page === 'network'}
    <section class="page-intro"><p class="eyebrow">OUR NETWORK</p><h1>One connected<br /><em>Ruhrenberg.</em></h1><p>From the ring line to the waterfront, RMA brings seven modes together as one legible city network.</p></section>
    <section class="network page-section"><div class="section-heading"><div><p class="eyebrow">TRANSPORT MODES</p><h2>Choose your way through the city.</h2></div></div><div class="mode-grid">{#each modes as mode}<div class="mode-card"><span class="mode-icon {mode.id}">{mode.icon}</span><span><strong>{mode.label}</strong><small>{mode.sub}</small></span></div>{/each}</div></section>
    <section class="network-principles"><p class="eyebrow">NETWORK PRINCIPLES</p><div><h2>Simple to read.<br />Easy to use.</h2><p>Every service is identified by a clear line family, consistent color and direct interchange. RMA is designed as one network, not a collection of separate operators.</p></div></section>
  {:else if page === 'lines'}
    <section class="page-intro compact"><p class="eyebrow">LINE DIRECTORY</p><h1>Know your<br /><em>line.</em></h1><p>Our complete service directory, from S1 to M35.</p></section>

    <section class="directory" id="map"><div class="section-heading"><div><p class="eyebrow">COMPLETE NETWORK · FEED {serviceSettings.feedVersion}</p><h2>Every line, one system.</h2></div></div><div class="line-filters"><button class:chosen={selectedMode==='all'} onclick={()=>selectedMode='all'}>All {lines.length}</button><button class:chosen={selectedMode==='metro'} onclick={()=>selectedMode='metro'}>Metro</button><button class:chosen={selectedMode==='tram'} onclick={()=>selectedMode='tram'}>Tram</button><button class:chosen={selectedMode==='brt'} onclick={()=>selectedMode='brt'}>BRT</button><button class:chosen={selectedMode==='ferry'} onclick={()=>selectedMode='ferry'}>Ferry</button><button class:chosen={selectedMode==='agt'} onclick={()=>selectedMode='agt'}>AGT</button><button class:chosen={selectedMode==='mono'} onclick={()=>selectedMode='mono'}>Monorail</button></div><div class="line-table">{#each visibleLines as line}<article class="clickable" onclick={() => openLine(line)}><span class="route-pill" style={`--line:${line.color}`}>{line.id}</span><div><b>{line.description}</b><small>{line.stops.join('  ·  ')}</small></div><span class="line-meta">Every {line.frequency} min<br /><small>{line.first}–{line.last}</small></span></article>{/each}</div><p class="feed-note">{serviceSettings.note} · {serviceSettings.timezone} · Weekday and weekend calendars included.</p></section>
  {:else if page === 'line'}
    <section class="detail-hero" style={`--line:${selectedLine.color}`}><button class="back-link" onclick={() => navigate('lines')}>← All lines</button><span class="large-route">{selectedLine.id}</span><p class="eyebrow">{selectedLine.mode.toUpperCase()} · LINE PROFILE</p><h1>{selectedLine.description}</h1><p>{selectedLine.circular ? 'A circular service around the city centre.' : 'A direct cross-city service connecting key districts of Ruhrenberg.'}</p></section>
    <section class="detail-grid"><article><p class="eyebrow">AT A GLANCE</p><div class="facts"><div><b>{selectedLine.first}</b><small>First service</small></div><div><b>{selectedLine.last}</b><small>Last service</small></div><div><b>{selectedLine.frequency} min</b><small>Daytime frequency</small></div><div><b>{selectedLine.stops.length}</b><small>Stations</small></div></div></article><article><p class="eyebrow">STATIONS ON THIS LINE</p><div class="stop-list">{#each selectedLine.stops as stop, index}<button onclick={() => openStation(stations.find(s => s.name === stop) ?? stations[0])}><span>{String(index + 1).padStart(2,'0')}</span><b>{stop}</b><i>→</i></button>{/each}</div></article></section>
  {:else if page === 'stations'}
    <section class="page-intro compact"><p class="eyebrow">STATION DIRECTORY</p><h1>Every stop<br /><em>has a story.</em></h1><p>Station facilities, connections and local context for every RMA interchange.</p></section><section class="station-grid">{#each stations as station}<article class="station-card clickable" onclick={() => openStation(station)}><span class="station-code">{station.code}</span><p class="eyebrow">{station.district}</p><h2>{station.name}</h2><p>{station.description}</p><div>{#each station.lines as line}<span>{line}</span>{/each}</div><b class="card-arrow">View station ↗</b></article>{/each}</section>
  {:else if page === 'station'}
    <section class="detail-hero station-detail"><button class="back-link" onclick={() => navigate('stations')}>← All stations</button><span class="station-code big">{selectedStation.code}</span><p class="eyebrow">{selectedStation.district.toUpperCase()} · STATION PROFILE</p><h1>{selectedStation.name}</h1><p>{selectedStation.description}</p></section><section class="station-info"><article><p class="eyebrow">FACILITIES</p>{#each selectedStation.facilities as facility}<div class="facility">✓ {facility}</div>{/each}</article><article><p class="eyebrow">LINES & CONNECTIONS</p><div class="connection-list">{#each selectedStation.lines as line}<button onclick={() => openLine(lines.find(l => l.id === line) ?? lines[0])}><span>{line}</span>View line →</button>{/each}</div></article></section>
  {:else if page === 'fleet'}
    <section class="page-intro compact"><p class="eyebrow">RMA FLEET</p><h1>Five generations.<br /><em>One shared city.</em></h1><p>From mechanical controllers to silicon-carbide power electronics, every vehicle carries a piece of Ruhrenberg’s transport history.</p></section><section class="fleet-grid">{#each vehicles as vehicle}<article class="vehicle-card" style={`--vehicle:${vehicle.color}`}><div class="vehicle-copy"><div class="vehicle-top"><p class="eyebrow">{vehicle.era} · {vehicle.status}</p><span>{vehicle.lines}</span></div><h2>{vehicle.name}</h2><p class="maker">{vehicle.maker}</p><p>{vehicle.description}</p><div class="vehicle-specs"><span><b>Control</b>{vehicle.control}</span><span><b>Capacity</b>{vehicle.seats}</span><span><b>Access</b>{vehicle.accessibility}</span></div></div></article>{/each}</section>
    <section class="fleet-note"><p class="eyebrow">DESIGN STANDARD</p><div><h2>Accessibility is not an option.</h2><p>The Civic series makes the RMA promise visible: level boarding, open circulation, tactile guidance, audible announcements and room for every kind of journey. The yellow belt is both a brand signature and a wayfinding device for passengers on the platform.</p></div></section>
  {:else if page === 'brand'}
    <section class="page-intro compact"><p class="eyebrow">RMA BRAND SYSTEM</p><h1>A clear identity<br /><em>for a connected city.</em></h1><p>The RMA identity is built to be recognisable at a station, on a vehicle and across every digital service.</p></section>
    <section class="brand-guide"><div class="brand-swatch"><div class="yellow-block"><span>RMA</span><small>#FFF12B</small></div><div class="swatch-meta"><p class="eyebrow">PRIMARY CORPORATE COLOUR</p><h2>Ruhrenberg Yellow</h2><p>RGB 255, 241, 43<br />HEX #FFF12B<br />CMYK 0, 6, 83, 0</p></div></div><div class="brand-rules"><article><p class="eyebrow">TYPE</p><h2>Inter</h2><p>Inter is the corporate typeface for navigation, information, wayfinding and all functional communication.</p></article><article><p class="eyebrow">COLOUR IN USE</p><div class="colour-row"><span class="colour-chip yellow"></span><div><b>Ruhrenberg Yellow</b><small>Attention · optimism · civic energy</small></div></div><div class="colour-row"><span class="colour-chip ink"></span><div><b>RMA Ink</b><small>Trust · clarity · infrastructure</small></div></div><div class="colour-row"><span class="colour-chip red"></span><div><b>Service Red</b><small>Action · interchange · movement</small></div></div></article></div></section>
  {:else}
    <section class="page-intro compact"><p class="eyebrow">RMA GROUP</p><h1>Moving the city.<br /><em>Building its future.</em></h1><p>RMA is a public transport group with a clear mission: make Ruhrenberg accessible to everyone.</p></section>
    <section class="group-grid"><article><span class="group-no">01</span><p class="eyebrow">RMA GROUP</p><h2>One group,<br />four capabilities.</h2><p>The holding structure keeps each service focused while giving citizens one integrated network.</p></article><article><span class="group-no">02</span><p class="eyebrow">OPERATING COMPANIES</p><h2>RMA Metro<br />RMA Tram&Bus</h2><p>Rail, underground, light rail and bus services operate under a common passenger promise.</p></article><article><span class="group-no">03</span><p class="eyebrow">BEYOND THE RAIL</p><h2>RMA Water<br />RMA Develop</h2><p>Ferries, AGT and the places around our stations connect mobility with everyday life.</p></article><article><span class="group-no">04</span><p class="eyebrow">INFRASTRUCTURE</p><h2>RPME</h2><p>Ruhrenberg Public Maintenance Enterprise keeps the infrastructure safe, reliable and ready for the next journey.</p></article></section>
  {/if}

  </main>
  <footer><a class="brand" href="/"><span class="mark">R</span><span><b>RMA</b><small>RUHRENBERG MUNICIPAL<br />TRANSPORT AUTHORITY</small></span></a><p>© 2026 RMA Group · Transportation for all citizens.</p><div><a href="#about">Contact</a><a href="#about">Imprint</a><a href="#about">Privacy</a></div></footer>
</div>
<style>
  :global(:root) { --rma-khaki: #ab9700; }
  :global(.mark), :global(.primary), :global(.download), :global(.route-icon) { background: #ab9700; color: #fff; }
  :global(nav a.active) { border-color: #ab9700; color: #192b36; }
  :global(.hero-art), :global(.network-mini) { background: #ab9700; }
  :global(.hero h1 em), :global(.page-intro em) { text-decoration-color: #ab9700; }
  :global(.text-link), :global(.line-filters button.chosen), :global(.filters button.chosen) { border-color: #ab9700; }
  :global(.line-filters button.chosen), :global(.filters button.chosen) { background: #ab9700; color: #fff; }
</style>
