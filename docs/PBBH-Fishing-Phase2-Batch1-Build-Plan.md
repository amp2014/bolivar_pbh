# Phillips Bolivar Beach House — Fishing Phase 2, Batch 1
## Solunar · Best-Time Composite · Catch Map · Rip Current Badge · Home Recent-Catch Hero

**Prerequisite:** Phase 1 fishing + config-driven nav are shipped and passing. This batch builds directly on:
- `noaa.js` tide/water-temp service (extended here for currents-free solunar inputs)
- existing weather service (air temp / wind / pressure)
- `fishing_catches` table (already stores lat/lng + conditions snapshot)
- Leaflet `SpotMap` component (reused for the catch map)
- the config-driven nav + dashboard

**How to use:** same as before — paste each prompt into Claude Code, pass the gate before the next. Order matters: P1→P2 (composite needs solunar), P3 is independent, P4 is last (only one with external-parsing risk), P5 is the home hero.

---

## DATA SOURCE NOTES (verified May 2026)

- **Solunar** — pure astronomy (moon transit / moonrise / moonset for a lat/lng/date). No API, computed client-side with a moon-position library (e.g. `suncalc`, which gives moon times + illumination + phase). Major periods = moon overhead (transit) and underfoot (anti-transit), ~2 hrs each. Minor periods = moonrise and moonset, ~1 hr each.
- **Important framing:** for SALTWATER (Bolivar), tide movement dominates fishing far more than solunar. Solunar is a secondary "tiebreaker" signal. The composite score below **weights tide heaviest**, solunar lighter. Label solunar in-app as a guide, not a guarantee.
- **Rip current** — NWS Surf Zone Forecast carries a standardized Low / Moderate / High risk level for Gulf-facing beaches, via the NWS API (api.weather.gov), free, no key. SEASONAL: the Surf Zone Forecast is typically issued Memorial Day → Labor Day (swim season). Outside that window it may be absent — code MUST handle "no current SZF / risk unknown" gracefully and not show a stale/blank badge.

---

## RUN ORDER

| # | Prompt | Gate before next |
|---|---|---|
| **P1** | Solunar service + Fishing-tab solunar card | Major/minor periods + moon phase render for today, cross-checked |
| **P2** | "Best time to fish today" composite | Composite score + window renders, tide-weighted |
| **P3** | Map of all catches (Leaflet) | All geotagged catches plot; tap pin → catch detail |
| **P4** | Rip current risk badge (Dashboard + Fishing) | Live risk shows; seasonal/no-data fallback works |
| **P5** | Home recent-catch hero card | Most recent catch photo shows on dashboard, respects hide_metadata |

---

## PROMPT P1 — Solunar service + solunar card

```
Phillips Bolivar Beach House — Fishing Phase 2.
Add solunar (moon-based) feeding times. Pure client-side astronomy,
NO API. Install a moon-position library — suncalc is preferred
(getMoonTimes, getMoonIllumination, getMoonPosition).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SERVICE: src/services/solunar.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use the beach house coordinates (Bolivar / 604 Nelson Ave) as the
default location. Export:

getSolunarDay(date) -> {
  majorPeriods: [{ start, peak, end }, ...]   // ~2hr windows
      // peaks at lunar transit (moon overhead) and
      // anti-transit (moon underfoot)
  minorPeriods: [{ start, peak, end }, ...]   // ~1hr windows
      // centered on moonrise and moonset
  moonPhase: { fraction, name }   // e.g. 0.5 -> "Full Moon"
  moonIllumination: number        // 0..1
  dayRating: 1..4                 // simple: higher near new/full moon
}

CALCULATION NOTES:
- Major peaks: lunar transit time (moon crosses meridian, overhead)
  and anti-transit (~12h25m offset, underfoot). suncalc.getMoonPosition
  altitude peak / or compute transit from moon times. Build a small
  helper to find transit by sampling altitude across the day and taking
  the max (overhead) and min (underfoot) — robust and dependency-light.
- Minor peaks: moonrise and moonset from suncalc.getMoonTimes.
- Window widths: major ±60min around peak (2hr), minor ±30min (1hr).
- moonPhase name from illumination fraction + waxing/waning
  (getMoonIllumination gives phase 0..1).
- dayRating: bias toward new moon (~0) and full moon (~0.5) phases —
  these are the strongest. Keep it a simple 1-4 scale.
- All times in local TX time (America/Chicago), DST-aware.
- Pure functions, no side effects, return null-safe shapes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. SOLUNAR CARD on the Fishing tab (/fishing)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Add a "Feeding Times" card below the tide summary:
- Moon phase icon + name + illumination %.
- Today's 2 major periods (peak time + window range), marked "Major".
- Today's 2 minor periods, marked "Minor".
- Highlight any period happening NOW or NEXT.
- Small muted footnote: "Solunar times are a guide — on the coast,
  tide movement usually matters more." (Set expectations honestly.)
- Coastal design system (serif headers, sand cards, navy/teal).

Show me solunar.js and the card. Print today's major/minor periods
and moon phase so I can sanity-check against a public solunar table
for Galveston.
```

**Gate:** Solunar card shows 2 major + 2 minor periods and the moon phase for today. Cross-check the major-period peaks and moon phase against any public solunar table for Galveston/Bolivar — they should be within a reasonable margin (exact minute alignment varies by method; phase and rough timing should match).

---

## PROMPT P2 — "Best time to fish today" composite

```
Phillips Bolivar Beach House — Fishing Phase 2.
Build a "Best Time to Fish Today" composite that blends the signals we
already have. This is the headline feature of the Fishing tab.

INPUTS (all already available):
- Tide movement (noaa.js): incoming/outgoing flow and times of max
  flow between high/low. MOVING water = better; slack = worse.
- Solunar major/minor periods (solunar.js from P1).
- Daylight: dawn/dusk windows (suncalc getTimes — sunrise/sunset,
  civil twilight). Dawn & dusk are prime.
- Weather (existing service): wind (too high = worse), and
  barometric pressure trend if available (falling/just-after-front
  often good; steady high less so).

SCORING (weight TIDE HEAVIEST — this is saltwater):
- Tide movement:        ~40%  (peak score near max flow, low at slack)
- Solunar overlap:      ~20%  (major > minor; bonus if near new/full)
- Dawn/dusk proximity:  ~25%
- Wind/pressure:        ~15%  (penalize high wind; small pressure bonus)
Produce a 0-100 score sampled across daylight hours (e.g. every 30 min),
then identify the TOP 1-2 windows of the day.

OUTPUT — a "Best Time to Fish" card at the TOP of /fishing:
- The #1 recommended window today, big: e.g.
  "Best bite: 6:15-7:45 AM"  with a one-line why:
  "Incoming tide + dawn + major feeding period"
- A secondary window if there's a clear second-best.
- A simple 1-5 star or Poor→Excellent day rating for today overall.
- Tap to expand → a simple hourly bar/sparkline of the score across
  the day so they can see the curve (reuse any existing chart approach;
  a lightweight inline SVG bar row is fine — no heavy chart lib needed).
- Honest footnote: "Based on tide, sun, moon and wind. Fish don't read
  charts — local knowledge wins."

Create src/services/bestTime.js (the scoring) + the card. Keep scoring
weights as named constants at the top so they're easy to tune later.
Show me bestTime.js and the card, and print today's score curve + top
window.
```

**Gate:** "Best Time to Fish" card shows a sensible top window with a plain-English reason, and the day rating renders. Spot-check: on a day with strong incoming tide at dawn, that window should score high; a slack-tide midday with high wind should score low. Tide should visibly dominate the recommendation.

---

## PROMPT P3 — Map of all catches

```
Phillips Bolivar Beach House — Fishing Phase 2.
Build a "Catch Map" showing every geotagged catch. Reuse the existing
Leaflet SpotMap component / setup (OSM tiles, no API key).

ROUTE: /fishing/map (link to it from the Fishing tab — add a
"Catch Map" entry/button near the spots section).

REQUIREMENTS:
- Query fishing_catches WHERE lat IS NOT NULL AND lng IS NOT NULL.
- Plot each as a marker on the Leaflet map, centered/zoomed to fit
  the catches (fit bounds; fall back to Bolivar default if none).
- ALSO optionally overlay fishing_spots markers, visually distinct
  from catch markers (e.g. spots = pin icon, catches = small photo
  dot or fish icon). Add a simple toggle: "Catches / Spots / Both".
- Marker popup / tap → mini catch card:
    thumbnail photo, species, date.
    RESPECT hide_metadata: if a catch has hide_metadata = true, do
    NOT plot it on the map at all (its location is private) — OR plot
    with no location detail. SIMPLEST + safest: EXCLUDE hide_metadata
    catches from the map entirely. Do that.
  Tapping the mini card → open the full catch detail/lightbox.
- location_source awareness: if you show any location precision text,
  reflect 'manual'/'exif' as approximate vs 'gps' as precise.
- Empty state: "No geotagged catches yet — log one from the Fishing tab."
- Performance: fine to load all catches for now (family-scale data).

Show me the Catch Map page and confirm hide_metadata catches are
excluded.
```

**Gate:** /fishing/map plots all geotagged catches, fits bounds, popups show species/photo/date and open detail. Confirm a catch with `hide_metadata = true` does NOT appear on the map. Toggle between Catches/Spots/Both works.

---

## PROMPT P4 — Rip current risk badge (Dashboard + Fishing)

```
Phillips Bolivar Beach House — Fishing Phase 2.
Add a rip current risk badge. Source: NWS API (api.weather.gov), free,
no key. This is a FAMILY SAFETY feature — surface it on the Dashboard
(home), not just Fishing.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SERVICE: src/services/ripCurrent.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Get the current rip current risk for the Bolivar / Gulf-facing beach
from NWS. Approach:
- Use api.weather.gov. First resolve the point:
  GET https://api.weather.gov/points/{lat},{lng}  (beach house coords)
  → gives the forecast office (gridId, e.g. HGX) and zones.
- Rip current risk lives in the Surf Zone Forecast / coastal hazard
  products and the forecast text. Pull the relevant product:
    Try the active alerts endpoint for the zone:
      GET https://api.weather.gov/alerts/active?zone={coastalZoneId}
      → look for Rip Current Statement / High Risk products.
    AND/OR fetch the zone forecast / surf zone product text and parse
    the standardized phrase: "RIP CURRENT RISK...LOW|MODERATE|HIGH"
    (NWS uses these exact qualifiers; only one qualifier per zone).
- REQUIRED HEADER: api.weather.gov requires a User-Agent header
  identifying the app (e.g. "PhillipsBolivarBeachHouse (contact email)").
  Set it on every request.
- Return: { risk: 'low'|'moderate'|'high'|'unknown',
            source, issuedAt, detail }
- SEASONAL FALLBACK: the Surf Zone Forecast is typically only issued
  Memorial Day–Labor Day. If no current product / no risk phrase is
  found, return risk: 'unknown' (NOT low). Never show a stale value.
- Wrap everything in try/catch; on any failure return 'unknown'.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. BADGE COMPONENT: <RipCurrentBadge />
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- low      → green, "Rip Current Risk: Low"
- moderate → amber, "Rip Current Risk: Moderate"
- high     → red,   "Rip Current Risk: HIGH"
- unknown  → muted/neutral, "Rip current risk: not available"
            (small, unobtrusive — don't alarm when we just don't know)
- Each includes the NWS safety guidance, short:
    low: "Generally safe near a lifeguard; currents still possible
          near jetties and groins."
    moderate: "Life-threatening rip currents possible. Only experienced
               swimmers in the surf."
    high: "Life-threatening rip currents likely. Stay out of the surf."
- Tap → expand for the full detail / issuedAt timestamp.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. PLACEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- FISHING TAB: always show the badge in the conditions area.
- DASHBOARD (home): show the badge ONLY when risk is moderate or high
  (so a calm day doesn't clutter home, but a dangerous day is the first
  thing the family sees). When low/unknown, render nothing on the
  dashboard. Place it prominently near the top (near weather).
- Cache the result for the session / refresh every ~30-60 min; don't
  call NWS on every render.

Show me ripCurrent.js, the badge, and both placements. Print the raw
NWS response and parsed risk so I can verify the parsing.
```

**Gate:** Badge shows a real risk level (or a clean "not available" out of season) on the Fishing tab. On the dashboard, it appears only for moderate/high. Verify the parse against the live NWS HGX surf zone / alerts text. Confirm out-of-season returns "unknown," not a stale "low."

---

## PROMPT P5 — Home recent-catch hero card

```
Phillips Bolivar Beach House — add a "Latest Catch" card to the
Dashboard (home) showing the most recent catch photo. Gives the home
screen life between trips.

PLACEMENT: on the Dashboard, a card in the main flow — suggest just
below the weather/ferry row or near the Recent Photos strip. Use good
judgment to fit the existing layout rhythm.

CARD CONTENT:
- Query the single most recent fishing_catches row (by caught_at desc)
  that has a photo.
- Show: the catch photo (hero, nicely cropped), species, who caught it,
  and how long ago ("2 days ago").
- RESPECT hide_metadata: if the latest catch has hide_metadata = true,
  show the photo + species + angler ONLY — hide tide/location/temp.
  (Still fine to show on home; just no conditions/location.)
- If that catch is NOT shared_to_feed, it can still appear here for
  family on the home dashboard (home is family-internal, not the public
  feed) — but if you've built a guest role, HIDE this card entirely for
  guest users (a catch location/photo isn't guaranteed guest-appropriate).
  Family/admin see it; guest does not.
- Tap the card → open that catch's detail/lightbox (reuse existing).
- Label: "LATEST CATCH" (DM Mono section label, matching other
  dashboard section labels like "RECENT PHOTOS").

EMPTY STATE: if there are no catches yet, render nothing (return null) —
same pattern as the PhotoFeedPreview component.

Show me the card component and its placement in the Dashboard.
```

**Gate:** Dashboard shows the latest catch photo with species/angler/time-ago, tapping opens detail. A catch with `hide_metadata` shows photo+species only. No catches → card hidden. (If guest role exists) guests don't see the card.

---

## BATCH SMOKE TEST

```
Phillips Bolivar Beach House — Fishing Phase 2 Batch 1 smoke test.
Report pass/fail per line with errors.

  ☐ Fishing tab: Best Time to Fish card shows top window + reason
  ☐ Best Time rating reflects tide-weighted scoring (tide dominates)
  ☐ Solunar card: 2 major + 2 minor periods + moon phase for today
  ☐ Solunar "now/next" highlighting works
  ☐ Catch Map: all geotagged catches plot, bounds fit
  ☐ Catch Map: hide_metadata catches EXCLUDED
  ☐ Catch Map: Catches/Spots/Both toggle works; popups open detail
  ☐ Rip badge on Fishing tab shows live risk (or "not available")
  ☐ Rip badge on Dashboard appears ONLY for moderate/high
  ☐ Rip badge out-of-season returns "unknown", not stale low
  ☐ Latest Catch card on home shows most recent catch photo
  ☐ Latest Catch respects hide_metadata (photo+species only)
  ☐ Latest Catch hidden for guest role (if guest exists); none → hidden
  ☐ No console errors; NWS calls send a User-Agent header

Report results.
```

**Gate:** All pass. **Phase 2 Batch 1 complete.**

---

## STILL DEFERRED (Phase 2 Batch 2 / Phase 3)

| Feature | When | Note |
|---|---|---|
| **Tidal currents** (NOAA currents API) | P2 Batch 2 | Fiddly: bin numbers + sparse stations + MetaData API lookups. Own focused session. Lower payoff for surf/jetty fishing than this batch. |
| **Catch analytics** (best spot/tide/species combos) | P2 Batch 2 | Much better after the catch map ships and more catches accumulate. Controlled species + snapshotted conditions already make it queryable. |
| **Guest gallery / trip albums** | P2/P3 | Gallery switcher already a container — add entries. |
| **Sargassum trend** | P3 | No clean API; lean on family-reported notes + USF bulletins. |
| **TPWD regs quick-reference** | P3 | Link out; controlled species enables size/bag mapping. |
| **Catch leaderboard / seasonal records** | P3 | Length/weight + species already captured. |
| **Push alerts** ("incoming tide + feeding window 4-6pm") | P3 | All inputs now exist (tide + solunar + bestTime). |

---

## PRE-FLIGHT

- ☐ Confirm `suncalc` (or chosen moon lib) installs cleanly in the Vite build
- ☐ Confirm existing weather service exposes wind (and pressure if available) to bestTime.js
- ☐ Set a real User-Agent string for api.weather.gov before testing P4
- ☐ Test P4 during swim season if possible to see a live risk; otherwise verify the "unknown" fallback path explicitly
- ☐ Have a couple of geotagged test catches logged so P3 (map) and P5 (home hero) have data to show
