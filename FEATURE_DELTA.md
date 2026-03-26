# PlayMatch Feature Delta: Soccer vs Basketball

_Last updated: 2026-03-26_

---

## Features on Both Sides

| Feature | Soccer ⚽ | Basketball 🏀 |
|---|---|---|
| Card scanning (camera) | ✅ | ✅ |
| Pixel avatar in team builder | ✅ | ✅ (added 2026-03-26) |
| Slot X / + buttons in team builder | ✅ | ✅ (added 2026-03-26) |
| Drag-and-drop slot management | ✅ | ✅ (added 2026-03-26) |
| Roster persistence (survives logout) | ✅ | ✅ |
| My Teams page | ✅ | ✅ |
| AI match simulation | ✅ | ✅ |
| Streaming commentary | ✅ | ✅ |
| Standings view | ✅ | ✅ |
| Save standings preference | ✅ | ✅ |
| Challenge/invite via email | ✅ | ✅ |
| Sport-themed email (soccer green / basketball orange) | ✅ | ✅ (added 2026-03-26) |
| Team share ID | ✅ | ✅ |
| Sign in / sign out | ✅ | ✅ |
| Tab navigation (Build Team / My Teams / Simulate / Standings) | ✅ | ✅ |

---

## Features on Soccer Only ⚽

### Formation Selection
Soccer lets you pick from multiple formations (4-4-2, 4-3-3, 4-2-3-1, etc.) when building a team. Each formation defines how many defenders, midfielders, and forwards are in the starting 11.

**Basketball equivalent:** Lineup styles (Standard, Motion Offense, etc.) exist but don't affect slot layout — all 5 positions are always PG / SG / SF / PF / C.

### Interactive Pitch Display
Soccer's team builder renders a visual top-down soccer pitch. Players are shown in their formation positions on the field. OOP players show in mismatched rows with a visual indicator.

**Basketball equivalent:** Linear slot list with position badges and OOP labels. `BasketballCourtDisplay.tsx` component exists but is not currently wired into the team builder.

### Starting 11 (vs Starting 5)
Soccer teams have 11 players, broken into GK / DEF / MID / FWD position rows with variable slot counts per formation.

### Card Upload Limit Tracking
Soccer tracks how many cards each user has uploaded (`checkCardUploadLimit` / `incrementCardUploadCount`) to enforce a scan cap.

**Basketball equivalent:** No scan cap — unlimited scanning.

---

## Features on Basketball Only 🏀

### Live Scoreboard Animation
During simulation, basketball shows a live animated scoreboard that updates point-by-point as each play event streams in. The scoreboard snaps to the final authoritative score when the stream ends.

**Soccer equivalent:** Soccer simulation shows running text commentary but no live score counter.

### Out-of-Position (OOP) Mechanics
Basketball explicitly tracks whether each player is filling a slot outside their natural position (e.g., a PG in the C slot). OOP players get a yellow `oop` badge and a warning is shown. OOP hurts simulation performance.

Soccer has OOP detection in `InteractiveTeamDisplay` but it's based on formation overflow rather than explicit position mismatches.

### `inferPoints` Fallback
Basketball uses an `inferPoints(ev)` helper to back-fill missing `points` fields from Gemini (dunks/layups often omit the field). Soccer commentary doesn't use point values.

---

## Parity Gaps to Close (Backlog)

| Gap | Priority |
|---|---|
| Basketball: wire `BasketballCourtDisplay` into the team builder as a visual preview | Medium |
| Basketball: add card upload limit tracking | Low |
| Soccer: add live score animation during simulation | Medium |
| Soccer: expose lineup style selector (like basketball's Standard / Motion Offense) | Low |
| Both: display saved teams in a grid card view with player pixel avatars | Medium |
