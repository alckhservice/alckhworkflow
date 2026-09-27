---
name: project-conventions
description: How the ALCKH Working Flow Report (index.html) is built — single-file app, the shared `state` object, Firestore sync guards, render() pattern, team login and deploy rules. Read before changing index.html.
user-invocable: false
---

# ALCKH Working Flow Report — how this app is built

A monthly work-progress checklist for ALCKH's client companies (import/export, GP, VAT, FA,
salary, bank rec, e-filing…). Used by the whole team at
https://alckhservice.github.io/alckhworkflow/ .

## Hard rules

1. **One self-contained file.** Everything lives in `index.html` (HTML + CSS + JS). No build step,
   no npm, no bundler, no new files the page depends on. External libraries only via `<script src>`
   from a CDN, pinned to an exact version (currently SheetJS 0.18.5, Firebase compat 10.13.0).
2. **Plain browser JavaScript**, Firebase *compat* API (`firebase.firestore()`, `firebase.auth()`),
   not the modular `import { … }` API. Don't mix the two.
3. **Don't touch without being asked:** `firebaseConfig`, `TEAM_EMAIL`, the Firestore path
   `alckh_working_flow_report/shared_state`, `STORAGE_KEY` (`alckh_working_report_v2`). Changing
   any of these signs everyone out or makes their data "disappear". A hook will ask to confirm.
4. **Every release bumps `version.txt`** (`YYYYMMDDHHMMSS`). The script at the top of `index.html`
   compares it and auto-reloads open browsers. Use `/deploy`.

## Data model

- `state` (global, `let`) is the single source of truth:
  - `state.months` — `{ "<Month YYYY>": [rows…] }`, each row
    `{ name, import_, export, gp1, gp2, vat0, fa, sales0cmt, invadj, salary, bankrec, efiling, … }`
  - `state.order` — month names in display order
  - `state.current` — the month being viewed
  - `state.locked` — `{ "<Month YYYY>": true }` for closed months (read-only)
- `DEFAULT_DATA` seeds the client list; `COLS`, `DROPDOWN_COLS`, `GROUPS` describe the columns.
- Client names are `"<number> - <COMPANY NAME>"`; ordering uses `nameLeadingNumber` / `sortByCompanyNumber`.
- **Old saved data must keep loading.** If you add or rename a field, handle it in
  `migrateOld()` / `loadState()` with a default, never assume it exists.

## Change → save → sync flow

- UI change → mutate `state` → `saveState()` → `render()`.
- `saveState()` writes localStorage (offline cache) and calls `pushToCloud()`.
- `pushToCloud()` is debounced (600 ms) and does `docRef.set(state)` — the **whole** state as
  one Firestore document.
- `startCloudSync()` listens with `onSnapshot` and replaces `state` with the cloud copy.
- Keep the two guards intact:
  - `applyingRemote` — stops a remote update from triggering a write back.
  - `initialSyncDone` — stops a device from pushing its stale local copy over the cloud before
    it has heard from the cloud once. Removing it can wipe the team's data.
- Firestore limit: one document ≤ 1 MB. Don't store big blobs (files, images, long logs) in `state`.

## Rendering

- `render()` rebuilds the table from `state`; `attachRowEvents()` wires the inputs.
- Features extend render by wrapping it (see `_pmOrigRender`): save the original, call it, then
  add your part. Follow the same pattern instead of editing `render()` for add-ons.
- Escape user text before putting it in HTML (`escapeAttr`, `pmEsc`).
- Locked months (`isLocked()`) must stay read-only in any new UI.

## Login

- Firebase Auth email/password with one shared account (`TEAM_EMAIL`); the page shows only
  the password box. `onAuthStateChanged` unlocks the UI and starts cloud sync once.
- Firestore rules (`firestore.rules`) only let that account read/write. Any new collection needs
  a matching rule, or it will fail with "permission denied".

## Before finishing any change

- The PostToolUse hook syntax-checks inline scripts automatically; fix anything it reports.
- If a Playwright MCP server is connected, open the page and click through what you changed.
