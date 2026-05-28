# Phillips Bolivar Beach House — Build Plan
## Config-Driven Nav Refactor + Fishing Feature

**How to use this document**
- Work top to bottom. Each prompt is self-contained — paste it into Claude Code.
- **Pass the gate before moving to the next prompt.** The gate is the one check that catches the most common failure before you build on top of it.
- **Do all of PHASE A (nav, prompts 1–6) before PHASE B (fishing).** Fishing B5 registers itself into the nav system built in Phase A.
- Work in scoped sessions — don't run all 13 in one runaway context. A natural break is after A6 (nav done) and after B2 (catch logging working).

---

## RUN ORDER AT A GLANCE

| # | Prompt | Gate before next |
|---|---|---|
| **A1** | `nav_settings` table + feature registry + `useNavConfig` hook | Hook returns `{pinned, overflow}` arrays correctly |
| **A2** | Refactor BottomNav to render from config | Bar shows Home + 3 pinned + More, taps route |
| **A3** | Build More screen | Every tile navigates; admin tile hidden for non-admin |
| **A4** | Refactor SideNav to full registry (desktop) | Desktop shows all features, ignores pinning |
| **A5** | Admin bar customizer + live preview | Change pins in admin → bar updates for all users |
| **A6** | Nav smoke test | All nav paths pass |
| **B1** | Fishing DB schema (`fishing_spots`, `fishing_catches`) + NOAA tide service | Tables exist; tide service returns live data |
| **B2** | Catch logging — capture + auto-fill + human review | One catch saves with GPS + auto-filled conditions |
| **B3** | Fishing Spots — Leaflet pin-drop + Google Maps directions | Drop pin, name spot, directions deep-link opens |
| **B4** | Tide board page | 7-day tides + current state + water temp render |
| **B5** | Gallery switcher + Fishing gallery + Fishing tab integration | Switch galleries; Fishing tab pinnable in admin |
| **B6** | Fishing smoke test | Full flow passes end-to-end |

---

# PHASE A — CONFIG-DRIVEN NAV REFACTOR

The goal: navigation becomes **data, not code**. A feature registry lives in code (maps key → label/icon/route/roles). Which 3 middle items are pinned to the mobile bottom bar lives in Supabase (`nav_settings`), editable from the admin panel with no redeploy.

**Fixed rules:**
- Home = always slot 1, not removable.
- More = always slot 5, always present.
- Slots 2–4 = admin-configurable (max 3 pinned).
- Pinning affects **mobile bottom bar only**. Desktop SideNav always shows everything.

---

## PROMPT A1 — Nav config foundation

```
Working in Phillips Bolivar Beach House (React + Vite + Supabase).
I'm refactoring navigation to be config-driven so I can change the
mobile bottom bar from an admin panel without code changes.

Three things in this step. Do NOT touch BottomNav/SideNav rendering yet.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SUPABASE TABLE: nav_settings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Single-row settings table:
  id            uuid primary key default gen_random_uuid()
  pinned_items  jsonb not null default '["stays","fishing","local"]'
  updated_by    uuid references users(id)
  updated_at    timestamptz default now()

- pinned_items is an ORDERED array of feature keys (max 3).
- Seed exactly one row with the default above.
- RLS: all authenticated users can SELECT. Only admin role can UPDATE.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. FEATURE REGISTRY (code, not DB)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Create src/config/navFeatures.js exporting a FEATURES object.
Each feature: { key, label, icon (Lucide component), route, roles }
roles is an array; 'all' means everyone.

Include these features:
  home      Home      Home icon       /          roles:['all']   fixed:true
  stays     Stays     Calendar icon   /stays      roles:['all']
  fishing   Fishing   Fish icon       /fishing    roles:['all']
  local     Local     MapPin icon     /local      roles:['all']
  photos    Photos    Camera icon     /photos     roles:['all']
  house     House     Building icon   /house      roles:['all']
  houseInfo Info      KeyRound icon   /info       roles:['family','admin']
  emergency Emergency Phone icon      /emergency  roles:['all']
  admin     Admin     Shield icon     /admin      roles:['admin']

Use Lucide icons already in the project. 'fishing' route (/fishing)
won't exist yet — that's fine, it's wired in Phase B.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. HOOK: useNavConfig
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Create src/hooks/useNavConfig.js. It must:
- Fetch pinned_items from nav_settings (the single row).
- Filter ALL features by the current user's role.
- Return:
    pinned   → ordered: [home] + up to 3 pinned features (role-allowed)
    overflow → every role-allowed feature NOT in pinned and NOT home
    allFeatures → every role-allowed feature (for desktop SideNav)
    loading, error
- If a pinned key is invalid/role-blocked for this user, skip it gracefully.
- Always force 'home' first in pinned regardless of stored array.

Show me navFeatures.js and useNavConfig.js. Confirm the table was
created and seeded. Do not modify any existing nav components yet.
```

**Gate:** Console-log `useNavConfig()` output on any page. Confirm `pinned` = `[home, stays, fishing, local]` and `overflow` contains photos/house/info/emergency (+admin if you're admin). Don't proceed until the arrays are correct.

---

## PROMPT A2 — BottomNav renders from config

```
Phillips Bolivar Beach House nav refactor, step 2.
useNavConfig hook from step 1 is working.

Refactor src/components/BottomNav.jsx to render from useNavConfig
instead of hardcoded tabs.

REQUIREMENTS:
- Render exactly 5 slots on mobile:
    pinned[0..3]  (Home + up to 3 pinned features)
    + a final "More" slot (hardcoded, always last)
- "More" slot: MoreHorizontal (Lucide) icon, label "More", route /more.
- Keep ALL existing styling: active state, 44px min touch targets,
  seafoam active icon, the current colors and serif/mono labels.
- Active state: use useLocation(), highlight by pathname startsWith
  (so /house/* still highlights the House item if it's pinned).
- "More" is active when pathname starts with /more OR matches any
  overflow feature's route (so tapping into an overflow feature keeps
  More highlighted).
- Keep the existing isDesktop check: if isDesktop, return null.

Do NOT build the /more screen yet — just route to it (will 404 for now).
Show me the refactored BottomNav.jsx.
```

**Gate:** Mobile viewport (≤1024px). Bar shows Home · Stays · Fishing · Local · More. Tapping Stays/Local routes correctly. Tapping More navigates to /more (blank/404 is fine). Tapping Fishing routes to /fishing (404 fine — built in Phase B).

---

## PROMPT A3 — More screen

```
Phillips Bolivar Beach House nav refactor, step 3.
Build the /more screen.

CREATE src/pages/More.jsx, route /more.

LAYOUT:
- Header: "More" — Playfair Display serif, matching other page headers.
- A tappable tile GRID of every OVERFLOW feature from useNavConfig
  (overflow array — already role-filtered, so admin tile only appears
  for admin automatically).
- 3 columns on mobile, more on wider screens.
- Each tile:
    ~100px tall, rounded card, sand background (#F5EDD8),
    navy icon (top, the feature's Lucide icon), label below (DM Sans).
    Soft shadow, matches existing card style.
    Whole tile is one tap → navigate to feature.route.
- NO nested menus on this screen. Every tile = 1 tap to its destination.
  (The House tile leads to House's own existing sub-menu — that's fine,
   that's one intended level, don't flatten it.)

FOOTER of the More screen:
- Divider, then reuse the existing ProfileButton / profile + sign-out
  block (same component used elsewhere). This gives mobile users a
  home for profile/sign-out now that it may not be on the bar.

Empty/edge: if overflow is empty (all features pinned), show a small
muted message "Everything's pinned to your bar." — won't normally happen.

Show me More.jsx and confirm the route is registered.
```

**Gate:** Navigate to /more. All overflow tiles render. Tap each → lands on the right page. As a non-admin (or impersonating one), confirm the Admin tile does NOT appear. Profile/sign-out works from the footer.

---

## PROMPT A4 — SideNav (desktop) renders full registry

```
Phillips Bolivar Beach House nav refactor, step 4.
Refactor src/components/SideNav.jsx (desktop sidebar) to render from
useNavConfig's allFeatures array.

REQUIREMENTS:
- Desktop IGNORES pinning entirely. Render EVERY role-allowed feature
  as a vertical nav item (you have the room on desktop).
- Use each feature's icon + label + route from the registry.
- Keep ALL existing SideNav styling: 220px width, deep navy bg,
  sticky full height, active/hover states, the app-name header,
  and the bottom profile section.
- Active state by pathname startsWith (section highlighting).
- Do NOT render a "More" item on desktop — there's no overflow concept
  on desktop; everything is already shown.
- Keep the isDesktop gating (SideNav only renders when isDesktop).

Show me the refactored SideNav.jsx.
```

**Gate:** Desktop viewport (>1024px). SideNav lists *all* features (Home, Stays, Fishing, Local, Photos, House, Info, Emergency, +Admin if admin). No "More" on desktop. Active highlighting works. Resize below 1024px → SideNav disappears, BottomNav (5-slot) returns.

---

## PROMPT A5 — Admin bar customizer

```
Phillips Bolivar Beach House nav refactor, step 5.
Add a "Bottom Bar Layout" section to the existing Admin panel
(/admin). Admin-only.

PURPOSE: let admin choose which 3 features are pinned to the mobile
bottom bar (slots 2-4), and their order. Writes to nav_settings.

UI:
- Section header: "BOTTOM BAR LAYOUT" (DM Mono label style).
- Two lists:
   PINNED (max 3, ordered):
     - Each row: drag handle + feature label + remove (✕) button.
     - Drag to reorder (use a lightweight approach — HTML5 drag or a
       small dnd lib already in the project; if none, simple up/down
       arrow buttons are an acceptable fallback, keep it robust).
   AVAILABLE (everything pinnable not currently pinned):
     - Each row: feature label + add (+) button.
     - The (+) button is DISABLED when 3 are already pinned.
- Home and More are NOT shown in either list (they're fixed — never
  editable). Only pinnable features appear.
- LIVE PREVIEW: a mini bottom-bar mockup showing
  [Home][pinned1][pinned2][pinned3][More] updating as they edit.
- "Save Layout" button:
    writes the ordered pinned keys array to nav_settings.pinned_items,
    sets updated_by + updated_at.
    Show success toast.

BEHAVIOR:
- On save, the change applies to ALL users (shared single row).
- After save, make useNavConfig re-fetch so the current admin's own bar
  updates without a hard reload (re-query on focus or expose a refetch).
- Enforce max 3 in the UI — never allow saving more than 3.
- Validate keys against the registry before saving (drop unknowns).

Show me the new admin section component and confirm save writes to
nav_settings.
```

**Gate:** As admin: remove Local, add Photos, reorder, Save. Confirm `nav_settings.pinned_items` updated in Supabase. Reload app → bottom bar reflects the new pins. Confirm you cannot pin a 4th (+ disabled at 3).

---

## PROMPT A6 — Nav smoke test

```
Phillips Bolivar Beach House — run a full navigation smoke test and
report any failures with the exact error and which check failed.

  ☐ Mobile: bar shows Home + 3 pinned + More (exactly 5)
  ☐ Mobile: each pinned tab routes correctly
  ☐ Mobile: More screen shows all overflow features
  ☐ Mobile: every More tile navigates to the right page
  ☐ Admin tile hidden in More for non-admin role
  ☐ Profile/sign-out works from More footer
  ☐ Desktop: SideNav shows ALL features, no More item
  ☐ Desktop: active highlighting works
  ☐ Resize across 1024px: bar/sidebar swap cleanly
  ☐ Admin: change pins + save → nav_settings updated
  ☐ Admin: cannot pin more than 3
  ☐ After admin save: bar updates for all users on next load
  ☐ Role check: family vs guest vs admin see correct feature sets

Report pass/fail per line.
```

**Gate:** All pass. **Nav phase complete — now safe to build Fishing.**

---

# PHASE B — FISHING FEATURE (Phase 1 scope)

**Locked scope:**
1. Tide board — NOAA today + 7-day, current state + water temp
2. Geotagged catch logging — auto-fill conditions + human review, GPS→EXIF→manual-pin fallback, controlled species + Other, per-catch hide-metadata + share-to-feed toggles
3. Fishing Spots — named, Leaflet pin-drop, "Get Directions" → Google Maps deep link (opens Google Maps, not in-app)
4. Fishing gallery via a gallery switcher on the Photos screen
5. Fishing tab integrated into the config-driven nav

**Key design rules carried in from planning:**
- **Location capture = at the moment of action, not from the file.** Fallback chain: live `navigator.geolocation` → photo EXIF → manual pin. A location always attaches; `location_source` records which.
- **Conditions are auto-captured + human-reviewed**, never typed from scratch. App pre-fills tide/temp/wind; user confirms or corrects.
- **Conditions are snapshotted onto the catch row** at capture (tide changes later — never recompute on view).
- **Online-only.** But the capture flow must tolerate a failed auto-fill (flag it, let user fill the review card) and a failed upload (hold + retry, don't lose the catch).
- Maps: **Leaflet + OpenStreetMap** (free, no key). Directions = keyless Google Maps URL that opens externally.

---

## PROMPT B1 — Fishing schema + NOAA tide service

```
Phillips Bolivar Beach House — start the Fishing feature.
This step: database schema + a NOAA data service. No UI yet.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SUPABASE TABLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

fishing_spots
  id          uuid pk default gen_random_uuid()
  name        text not null
  lat         double precision not null
  lng         double precision not null
  spot_type   text          -- surf | jetty | pier | wade | boat | other
  notes       text
  created_by  uuid references users(id)
  created_at  timestamptz default now()

fishing_catches
  id            uuid pk default gen_random_uuid()
  photo_url     text
  r2_key        text
  lat           double precision
  lng           double precision
  location_source text        -- gps | exif | manual | none
  spot_id       uuid references fishing_spots(id)  -- nullable
  species       text
  length_in     numeric
  weight_lb     numeric
  bait          text
  notes         text
  caption       text
  -- auto-captured conditions snapshot (at moment of catch):
  tide_state    text          -- e.g. "rising" | "falling" | "high" | "low"
  tide_height_ft numeric
  water_temp_f  numeric
  air_temp_f    numeric
  wind_mph      numeric
  wind_dir      text
  conditions_fetched_ok boolean default false
  -- display / sharing:
  hide_metadata boolean default false   -- per-catch privacy
  shared_to_feed boolean default false
  caught_at     timestamptz
  caught_by     uuid references users(id)
  created_at    timestamptz default now()

RLS for both:
- SELECT: all authenticated users.
- INSERT: any family/admin user.
- UPDATE/DELETE: only the row's creator (created_by / caught_by) OR admin.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. NOAA TIDE + WATER SERVICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Create src/services/noaa.js using the NOAA CO-OPS API (free, no key).

IMPORTANT — verify the station before hardcoding:
Use the NOAA Tides & Currents station nearest to Bolivar Peninsula /
Galveston Bay entrance for tide PREDICTIONS, and the nearest station
that reports WATER TEMPERATURE (may be a different station). Look these
up against the CO-OPS station list and put the chosen station IDs in
clearly-labeled constants at the top of the file with a comment noting
what each serves and that they can be swapped. Do not assume an ID —
confirm it returns data.

Functions to export:
- getTidePredictions({ days })  -> high/low predictions for today..+days
    NOAA product=predictions, interval=hilo, datum=MLLW, units=english,
    time_zone=lst_ldt. Return normalized array:
    [{ datetime, type: 'H'|'L', height_ft }]
- getCurrentTideState() -> derive current state from latest prediction
    window: { state: rising|falling|high|low, height_ft, next: {type,datetime} }
- getWaterTemp() -> latest water temperature in °F (product=water_temperature)
    Return null gracefully if station has no recent reading.

Each function: wrap in try/catch, return a clear ok/err shape, never throw
to the UI. These will be called both by the tide board AND by catch
auto-fill, so keep them reusable and side-effect free.

Show me the schema confirmation, the chosen station IDs (and why), and
noaa.js. Demonstrate getTidePredictions and getCurrentTideState return
real data for the next 2 days.
```

**Gate:** Both tables exist in Supabase with RLS. `noaa.js` returns real tide predictions and a sane current-state object for the next couple days. Water temp returns a number or a clean null. Don't proceed until live tide data comes back.

---

## PROMPT B2 — Catch logging (capture + auto-fill + human review)

```
Phillips Bolivar Beach House — Fishing catch logging.
Schema + noaa.js from B1 are working. Existing weather service and
R2 photo upload (get-upload-url API + PUT pattern) already exist —
reuse them, don't rebuild.

Build the catch-logging flow as a component opened from a "Log Catch"
button (the Fishing tab will mount it in B5; for now expose it on a
temporary /fishing/log route so I can test).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. User taps "Log Catch" → camera/library picker
   (accept="image/*" capture="environment" for direct camera on mobile).

2. The MOMENT a photo is chosen, auto-capture in parallel:
   a. LOCATION (fallback chain, record which in location_source):
      - Try navigator.geolocation.getCurrentPosition (high accuracy).
        On success → location_source = 'gps'.
      - If denied/unavailable → attempt to read EXIF GPS from the file
        (use a small EXIF lib). On success → location_source = 'exif'.
      - If neither → location_source = 'none' for now; user will drop a
        pin in the review step (→ becomes 'manual').
   b. CONDITIONS:
      - tide: noaa.getCurrentTideState()
      - water temp: noaa.getWaterTemp()
      - air temp / wind / wind dir: existing weather service
      - Set conditions_fetched_ok = true only if the core calls succeed;
        if any fail, false (review card shows "couldn't auto-fill").
   c. caught_at = now.

3. REVIEW CARD (human in the loop) — everything pre-filled + editable:
      📍 Location: "Located via GPS" / "From photo" / "Tap map to set"
         - If source is 'none', show an inline Leaflet mini-map to drop
           a pin (reuse the SpotMap pin-drop from B3 — if B3 isn't built
           yet, a lat/lng manual entry is an acceptable temporary stand-in;
           wire the map in B3).
      🌊 Tide: "{state} {height}ft"        [editable]
      🌡️ Water {f}°  ·  Air {f}°  ·  Wind {mph} {dir}   [editable]
      🐟 Species: dropdown (controlled list + "Other" → free text)
         List: Speckled Trout, Redfish, Flounder, Black Drum,
               Sheepshead, Croaker, Sand Trout, Gafftop, Hardhead,
               Other
      Length (in) [optional]   Weight (lb) [optional]
      Bait [optional]   Notes [optional]   Caption [optional]
      Link to Spot: dropdown of existing fishing_spots [optional]

      TOGGLES:
        [ ] Don't show fishing metadata   (per-catch; default off)
            → when ON, this catch HIDES tide/location/temp on display.
              NOTE: data is still STORED — only hidden from view.
        [ ] Share to family feed          (default off)

   If conditions_fetched_ok is false, show a small amber note:
   "Couldn't auto-fill conditions — add them manually if you like."

4. SAVE:
   - Upload photo to R2 (reuse existing get-upload-url → PUT flow).
   - On upload success → INSERT fishing_catches row with all fields
     (snapshotted conditions, location, source, toggles).
   - If upload FAILS: keep the form state, show an error with a Retry
     button — do NOT lose the catch (online-only, but tolerate flaky
     signal). No offline queue.
   - On success: toast + clear form.

Show me the component(s) and the temporary /fishing/log route. Walk me
through one successful save end to end.
```

**Gate:** From a phone, tap Log Catch → choose/take a photo → location auto-grabs (allow the permission) → conditions pre-fill → pick a species → save. Confirm a `fishing_catches` row appears with lat/lng, `location_source='gps'`, snapshotted tide/temp, and the photo in R2. Test the deny-location path → falls through to EXIF or manual.

---

## PROMPT B3 — Fishing Spots (Leaflet pin-drop + directions)

```
Phillips Bolivar Beach House — Fishing Spots with map pin-drop.
Use Leaflet + OpenStreetMap tiles (free, no API key). Install leaflet
and react-leaflet if not present.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SpotMap component (reusable)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Leaflet map centered on Bolivar Peninsula / 604 Nelson Ave area
  (sensible default center + zoom showing the peninsula and jetties).
- OSM tile layer.
- Two modes:
    view mode: render existing fishing_spots as markers.
    pick mode: tap/click the map drops a single pin; expose the
               chosen lat/lng to the parent (used by Add Spot AND by
               the catch review card's manual-location fallback in B2).
- Custom marker styling to match the coastal theme if easy; default
  Leaflet marker is acceptable otherwise.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. Add Spot flow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- "Add Spot" button → SpotMap in pick mode.
- Drop pin → form: name (required), spot_type (dropdown: surf/jetty/
  pier/wade/boat/other), notes (optional).
- Save → INSERT fishing_spots (created_by = current user).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. Spot detail / list
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Tapping a spot marker (or list row) shows: name, type, notes, and a
  count of catches linked to it (catches where spot_id = this spot).
- "Get Directions" button:
    Opens Google Maps EXTERNALLY in a new tab/app — do NOT route in-app.
    URL: https://www.google.com/maps/dir/?api=1&destination=LAT,LNG
    (keyless). Use target="_blank" rel="noopener".
    Add small helper text: "Opens in Google Maps."
- Delete spot: creator or admin only.

Wire SpotMap's pick mode back into B2's catch review card so the
manual-location fallback drops a real pin.

Show me SpotMap.jsx, the Add Spot flow, and the spot detail with the
working Google Maps directions link.
```

**Gate:** Add a spot by dropping a pin, name it, save → appears as a marker. Open spot detail → "Get Directions" opens Google Maps externally with the right coordinates. Confirm B2's manual-location fallback now uses the same pin-drop.

---

## PROMPT B4 — Tide board page

```
Phillips Bolivar Beach House — Tide board for the Fishing tab.
Uses noaa.js from B1. Build as /fishing/tides (the Fishing tab home
in B5 will surface this prominently).

LAYOUT:
- "Current conditions" card at top:
    Big current tide state: e.g. "Rising · 1.8 ft"
    Next event: "High 3.47 ft at 3:47 PM"
    Water temp: "Water 74°F" (or "—" if unavailable)
    Pull air temp/wind from existing weather service if easy.
- "Next 7 days" tide list:
    Grouped by day. Each day shows its high/low events with time +
    height, H/L clearly marked. Clean, scannable, mobile-first.
    Highlight today.
- Loading: skeleton. Error: "Couldn't load tides" + retry.
- Cache the daily prediction fetch in memory for the session so we
  don't hammer NOAA on every navigation (a simple module-level cache
  keyed by date is fine — no new table needed for Phase 1).

Match the existing coastal design system (serif headers, sand cards,
navy/teal). Show me the page.
```

**Gate:** /fishing/tides shows correct current state, next event, water temp, and a readable 7-day breakdown. Cross-check a couple of high/low times against NOAA's website for the chosen station.

---

## PROMPT B5 — Gallery switcher + Fishing gallery + Fishing tab

```
Phillips Bolivar Beach House — three integration pieces.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. GALLERY SWITCHER (refactor Photos screen)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Refactor the Photos page so it's a CONTAINER with a gallery selector,
not a single hardcoded feed. This sets up future galleries (Guest,
Trip albums) as config, not new screens.

- Add a gallery switcher at the top of /photos (segmented control or
  dropdown): "Family" | "Fishing".
- Extract the existing feed into a reusable <Gallery galleryKey="..." />
  component that just filters its data source by gallery:
    Family  → existing family photos table/feed (unchanged behavior).
    Fishing → fishing_catches where shared_to_feed = true, displayed
              as a gallery (photo + species + caption).
- Keep existing lightbox, upload, delete behaviors for Family.
- Design the switcher so adding a third gallery later = one entry,
  no new screen.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. FISHING TAB HOME (/fishing)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Build /fishing as the Fishing tab landing page tying it together:
- Top: current tide + water temp summary card (reuse B4's current-
  conditions card; "See 7-day tides →" links to /fishing/tides).
- Primary action: big "Log Catch" button → B2 flow.
- "Fishing Spots" section: SpotMap (view mode) + Add Spot → B3.
- "Recent Catches" gallery: fishing_catches newest first.
    Each catch shows photo, species, and conditions line
    (tide/temp/location) — BUT if hide_metadata is true, hide the
    tide/location/temp for that catch (show photo + species only).
    Creator/admin can delete a catch.
- Mobile-first, coastal design system.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. REGISTER FISHING IN NAV
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The 'fishing' feature already exists in the registry (Phase A1) and is
in the default pinned_items. Confirm:
- /fishing route is registered and renders the Fishing tab home.
- Fishing appears on the mobile bottom bar (it's in default pins) and
  in the desktop SideNav.
- Fishing is pinnable/unpinnable from the Admin bar customizer (A5)
  like any other feature — no special-casing.

Show me the refactored Photos container, the Gallery component, the
Fishing tab home, and confirm nav integration.
```

**Gate:** /photos switches between Family and Fishing galleries. A catch with "share to family feed" on appears in the Fishing gallery. /fishing shows tides + Log Catch + spots map + recent catches, and respects per-catch hide_metadata. Fishing shows on the bar and is togglable in admin.

---

## PROMPT B6 — Fishing smoke test

```
Phillips Bolivar Beach House — full Fishing smoke test. Report
pass/fail per line with errors.

  ☐ /fishing loads: tide summary + Log Catch + spots map + recent catches
  ☐ Tide summary shows correct current state + water temp
  ☐ /fishing/tides shows 7-day breakdown, today highlighted
  ☐ Log Catch: photo capture works on mobile
  ☐ Location auto-grabs via GPS (permission granted) → source 'gps'
  ☐ Deny location → falls back to EXIF, else manual pin drop works
  ☐ Conditions auto-fill (tide/water/air/wind) in review card
  ☐ Conditions-fetch failure shows amber note, still saves
  ☐ Species dropdown + Other works
  ☐ "Don't show fishing metadata" hides tide/location/temp on display
     but data still stored in the row
  ☐ "Share to family feed" makes catch appear in Fishing gallery
  ☐ Photo lands in R2; row in fishing_catches with snapshotted conditions
  ☐ Upload failure → retry, catch not lost
  ☐ Add Spot: drop pin, name, save → marker appears
  ☐ Spot detail: "Get Directions" opens Google Maps externally, right coords
  ☐ Catch can optionally link to a spot; spot shows catch count
  ☐ Delete catch/spot: creator or admin only
  ☐ /photos gallery switcher flips Family ↔ Fishing
  ☐ Fishing tab on bottom bar (mobile) + SideNav (desktop)
  ☐ Fishing pin/unpin works from Admin bar customizer

Report results.
```

**Gate:** All pass. **Phase 1 Fishing complete.**

---

# WHAT'S DEFERRED (Phase 2 / 3 — already supported by this schema)

You do **not** need to plan these now — the data shape built above already supports them, which was the point of the upfront design work.

| Feature | Phase | Why it's free later |
|---|---|---|
| **Map of all catches** | 2 | Every catch already has lat/lng + source — just plot `fishing_catches` as markers |
| **Solunar feeding times** (major/minor) | 2 | Pure sun/moon math, no API, no schema change |
| **Rip current risk badge** | 2 | Parse NWS Surf Zone Forecast → Low/Mod/High badge |
| **Tidal currents** | 2 | NOAA currents API where a station is near enough |
| **"Best time to fish today"** composite | 2 | Combines tide movement + solunar + daylight you already have |
| **Catch analytics** (best spot/tide/species) | 2 | `species` is controlled + conditions snapshotted = queryable now |
| **Guest gallery / trip albums** | 2 | Gallery switcher is already a container — add an entry |
| **Sargassum trend** | 3 | No clean API; lean on USF bulletins + family-reported notes |
| **TPWD regs quick-reference** | 3 | Link out; controlled species enables size/bag mapping |
| **Catch leaderboard / records** | 3 | Controlled species + length/weight already captured |
| **Push alert** ("incoming tide + feeding window") | 3 | Tide + solunar data already in hand |
| **Offline catch queue** | 3 | Only if family actually hits signal pain |
| **Per-user customizable bar** | 3 maybe | You chose admin-controlled; revisit only if family asks |

---

# PRE-FLIGHT CHECKLIST

Before you start B1:

- ☐ Confirm R2 photo upload (get-upload-url API + PUT) is live — B2 reuses it
- ☐ Confirm existing weather service is callable from new code — B2/B4 reuse it
- ☐ Have your Supabase service role handy for the schema steps
- ☐ Decide the NOAA station in B1 *by verifying it returns data* — don't trust a hardcoded ID
- ☐ Test catch logging on an actual phone (geolocation + camera behave differently than desktop)
