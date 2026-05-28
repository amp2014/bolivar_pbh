# Phillips Bolivar Beach House — Supplement: Stay Occupants + Low-Supplies Tile
## Occupant Tagging · Home Low/Out Tile · (updated) Pre-Stay Email spec

**Read this with the "Home Fixes + Stay-Aware Dashboard" doc.** This supplement adds occupant tagging and the home supplies tile, and refines two pieces of that doc. Run order is given below — these depend on P3 (`useActiveStay`) and P4 (`getLowOrOutSupplies`) from that doc.

---

## CORE DEFINITION (used everywhere)

> **A user is "ON a stay" if they are the BOOKER (created the stay) OR they are TAGGED on it as an occupant.**

This single rule drives all visibility and notifications:
- The **home tile** shows to everyone on the stay (booker + tagged), and to no one else.
- The **future email** goes to everyone on the stay (booker + tagged).
- Someone not on the stay sees/gets nothing.

Tagged people are **app users** (selected from existing users). Their **email is looked up in the background** from the user record (already present via Google Auth) — no separate email entry. Tagging stores a **user reference**, not a typed address.

---

## RUN ORDER (combined with the Home Fixes doc)

| # | Prompt | Source doc |
|---|---|---|
| P1 | Home horizontal scroll fix | Home Fixes |
| P2 | Fishing ticker | Home Fixes |
| **S1** | **Stay occupants — tagging (NEW prerequisite)** | **this doc** |
| P3* | Stay-aware home — *now user-scoped* (see refinement) | Home Fixes (refined here) |
| P4 | Booking supplies note + `getLowOrOutSupplies()` | Home Fixes |
| **S2** | **Home low/out supplies tile** | **this doc** |
| — | FUTURE: pre-stay email (updated spec) | this doc — do not build |

Run S1 before P3 so P3 can scope "your stay" using the occupant model. P4 can run any time before S2.

---

## PROMPT S1 — Stay occupants (tagging)

```
Phillips Bolivar Beach House. Add the ability to tag other people onto
a stay/booking ("who else is staying"). Tagged people are existing app
users. This is a prerequisite for the home supplies tile and a future
pre-stay email.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. DATA MODEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Add stay occupants. Inspect how Stays/bookings are modeled first, then:
  Create table stay_occupants:
    id          uuid pk default gen_random_uuid()
    stay_id     uuid references <stays table>(id) on delete cascade
    user_id     uuid references users(id)
    added_by    uuid references users(id)
    added_at    timestamptz default now()
    unique(stay_id, user_id)
  - The stay's BOOKER is whoever created the stay (existing
    created_by / owner field — do NOT duplicate them into
    stay_occupants; booker is implicit).
  - "On the stay" = booker (created_by) UNION stay_occupants.user_id.

  RLS:
   - SELECT: users who are on the stay (booker or tagged) + admin.
   - INSERT/DELETE: booker of the stay + admin (the booker manages who's
     tagged). Tagged occupants can VIEW but not edit the list. (Sensible
     default — say so if you'd prefer occupants can also add others.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. HELPER: src/services/stayOccupants.js  (reusable — tile + email use it)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Export:
  getStayPeople(stayId) -> [{ user_id, name, email, role:'booker'|'occupant' }]
     // booker first, then tagged occupants; email from the user record
  isUserOnStay(userId, stay) -> boolean
     // true if userId is booker OR tagged on the stay
  getUpcomingStaysForUser(userId, withinDays) -> [stay...]
     // stays the user is ON (booker or tagged) starting within N days
  Null-safe; pure data access, no UI.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. UI: manage occupants on the stay/booking view
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
On the Stays detail/booking screen (visible to booker + admin to edit):
  - "Who's staying" section: shows the booker (labeled) + tagged people
    (name + avatar if you have one).
  - "Add people" -> a picker of existing app users (search/select).
    Exclude the booker (already on it) and already-tagged users.
  - Remove (✕) a tagged person (booker/admin only).
  - Tagged occupants see the list read-only.
  - Keep it simple; match existing design.

Show me the table + RLS, stayOccupants.js, and the manage-occupants UI.
Confirm getStayPeople returns booker + tagged with emails resolved.
```

**Gate:** On a stay, the booker can add/remove tagged app users; the list shows booker + tagged. `getStayPeople(stayId)` returns everyone with emails resolved from their user records. `isUserOnStay` correctly returns true for booker and tagged, false for others. A tagged user sees the list but can't edit.

---

## REFINEMENT TO P3 (stay-aware home) — make it user-scoped

When you run P3 from the Home Fixes doc, apply this change so "your stay" means a stay **you're on**:

```
P3 refinement: useActiveStay must be scoped to the LOGGED-IN USER via
the occupant model from S1. A stay counts for this user only if
isUserOnStay(currentUserId, stay) is true (booker OR tagged).

- ACTIVE:   today within a stay the user is ON.
- UPCOMING: a stay the user is ON starts within the next 7 days
            (use getUpcomingStaysForUser(userId, 7)).
- NONE:     the user is not on any active/near-upcoming stay.

So if the user is NOT on a given stay, it never drives their home
context. (E.g. sister is tagged on next week's stay → she sees upcoming
context; a family member not on it sees NONE.)
```

---

## PROMPT S2 — Home low/out supplies tile

```
Phillips Bolivar Beach House. Add a home Dashboard tile that alerts a
user when they have an UPCOMING stay (within 3 days) AND something is
currently low or out, so they can grab it on the way down.

Reuse:
  useActiveStay (user-scoped, per P3 refinement)
  getLowOrOutSupplies() (from P4)
  stayOccupants helpers (from S1)

LOGIC — show the tile ONLY when BOTH are true:
  1. The logged-in user is ON a stay (booker or tagged) that starts
     within the next 3 days (upcoming state, ≤3 days).
  2. getLowOrOutSupplies() returns at least one item.
If either is false → render NOTHING (return null). No empty/"all good"
tile — silence is the default.

VISIBILITY:
  - Because useActiveStay is user-scoped (S1/P3), the tile naturally
    only appears for people ON that upcoming stay. Someone not on the
    stay never sees it. (Sister tagged on the stay sees it; you, not on
    it, don't.) No extra gating needed beyond the user-scoped hook.

TILE CONTENT:
  - Label: "BEFORE YOU GO" (DM Mono section label).
  - Headline: "Your stay starts in {N} days — these are low or out:"
  - List the low/out items: OUT first (red), then LOW (amber). If the
    list is long, show the first few + "and X more".
  - Tap → House supplies screen (full list / manage).
  - Place prominently on Home (near the top / near the upcoming-stay
    context strip from P3). It complements that strip — the strip says
    "stay coming up," this tile says "and here's what to restock."
  - Match coastal design; make OUT visually urgent but not alarming.

Show me the tile component, its show/hide logic, and confirm it only
renders for users on an upcoming (≤3 day) stay when something is low/out.
```

**Gate:** As a user **on** a stay starting in ≤3 days with something low/out → tile shows with the items (out before low), taps to supplies. As that same user with nothing low/out → no tile. As a user **not** on that stay → no tile. As a user on a stay >3 days out → no tile.

---

## SMOKE TEST (this supplement)

```
Phillips Bolivar Beach House — occupants + supplies tile smoke test.
Pass/fail per line.

  ☐ Booker can tag existing app users onto a stay
  ☐ Booker/admin can remove tagged people; occupants see list read-only
  ☐ getStayPeople returns booker + tagged, emails resolved from users
  ☐ isUserOnStay true for booker + tagged, false for others
  ☐ useActiveStay is user-scoped: only stays the user is ON count
  ☐ Tile shows when user is on an upcoming (≤3d) stay AND something low/out
  ☐ Tile: OUT listed before LOW; taps to supplies
  ☐ Tile hidden when nothing low/out
  ☐ Tile hidden for users NOT on the stay
  ☐ Tile hidden when upcoming stay is >3 days out
  ☐ No console errors

Report results.
```

**Gate:** All pass. Tagging + tile complete; the data path (`getStayPeople` + `getLowOrOutSupplies`) is now ready for the future email.

---

# FUTURE (DO NOT BUILD) — Pre-Stay Low-Supplies Email (updated spec)

Now fully specified thanks to the occupant model. Reuses
`getStayPeople()` (S1) and `getLowOrOutSupplies()` (P4).

**Behavior:**
- A scheduled daily job checks: any stay starting in 1–2 days?
- For each such stay, call `getLowOrOutSupplies()`.
  - If the list is **empty → send nothing** (no email, mirrors the tile:
    silence when stocked).
  - If non-empty → email **everyone on the stay** — the booker plus all
    tagged occupants (`getStayPeople(stayId)` → their emails).
- Email content: house name, stay dates, "here's what's running low or
  out so you can grab it on the way down," the OUT-then-LOW list. Plain
  and simple, no fluff.
- Sent **from your email address** (verified sender).
- Guard against duplicate sends (mark the stay's pre-stay email as sent).

**Recipient rule (locked):** booker + everyone they tagged. Tagged people
are app users; their emails come from their user records. Tag your wife
or the family email (as a user) → they're included.

**The two infra dependencies (why it's still deferred):**
1. **Scheduling** — must be server-side (app isn't running when closed).
   Recommended: **Supabase pg_cron + an Edge Function** (logic lives with
   your data). Alt: Vercel Cron hitting an API route. The Edge Function
   re-implements/queries the same low/out + occupant logic server-side.
2. **Sending as you** — recommended: a transactional email service
   (**Resend / Postmark / SendGrid**) with your address/domain verified
   as sender. Raw Gmail/SMTP works but is flakier on auth + deliverability;
   not recommended.

**Decisions to make before building (not now):**
- Email service choice + sender verification of your address
- Lead time: 1 day vs 2 days (or admin-configurable)
- Optional admin toggle to enable/disable the whole feature
- (Locked already: recipients = booker + tagged; skip send if nothing
  low/out; tagged = app users tied to their stored email)

**Optional later niceties:**
- Include a one-tap "view supplies" link back into the app.
- Let the email list group items by category (matches the in-app note).
- A "mark as handled" so the list reflects what someone already grabbed.

---

## PRE-FLIGHT (this supplement)

- ☐ Confirm the Stays table has a clear booker/owner field (created_by)
      and start/end dates — the occupant model and "≤3 days" check need them
- ☐ Confirm the user picker can list app users for tagging
- ☐ Test data: a stay starting in ≤3 days with you tagged + another user
      tagged + a third user NOT on it, and some Low/Out supplies — so the
      tile's show/hide and per-user visibility are all verifiable
