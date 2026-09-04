# Autonomous session summary — 2026-09-04, ~02:53–~04:00 Bremen time

Scheduled unattended run on `D:\AITools\LearnNetworking`. Everything below was done without
stopping for approval, per your instructions. Git history has the full incremental detail —
this is the readable version.

## 1. Free navigation (the thing you specifically asked for)

Progress → Settings now has a **Free navigation** toggle. Off (default): cards unlock the
guided way, by reading prerequisites first, same as before. On: every card is clickable
immediately, and any card you open out of guided order gets an **"unlocked early"** badge
so you still know where it sits in the intended sequence. The setting persists like everything
else (localStorage), survives a save/load round-trip, and is covered by 6 automated tests.

## 2. More content

Two new Learn cards, matching the existing style (why / body / pitfalls / quiz):
- **T4 (Linux):** DNS troubleshooting — `dig`, `resolvectl`, the nsswitch/resolved chain,
  NXDOMAIN vs. timeout.
- **T5 (Windows):** DNS and DHCP troubleshooting — `nslookup`, `Resolve-DnsName`,
  `ipconfig /flushdns`, APIPA, release/renew.

Card count: **50 → 52**, quiz items: **159 → 165**. (Last session's earlier work already
brought the app from 3 tracks/20ish cards up to a full T1–T6 spread covering Linux, Windows,
and MobaXterm/WinSCP/FreeRDP — this run added targeted gaps on top of that rather than
re-doing it.)

## 3. Features (aimed for ~50, landed on a smaller set of real, working ones — see note below)

**Learn:** full-text search, filter by track, bookmark (★) any card, filter to bookmarked-only,
Random card, "Continue: <last card>", per-card difficulty tag (starter/core/advanced, derived
from prereq depth) and read-time estimate, per-track "last studied" timestamp.

**Card view:** breadcrumb showing track + position ("card 3 of 8"), Prev/Next within track,
bookmark star, difficulty/read-time badges.

**Drill:** a config screen before starting — due-backlog broken down by track, session length
(quick 5 / normal / long 20), restrict to bookmarked cards only.

**Progress:** retention-by-track bar chart, streak milestones (3/7/30 days get a 🔥 badge),
bookmarked-cards list, a status legend, and **Undo** after "Reset all progress" (one-shot
backup, consumed on restore).

**Lab:** Copy transcript button; command history now survives a page reload.

**Incident:** solved scenarios get a ✓ and show attempt counts.

**App-wide:** light theme alongside the original dark theme (footer toggle), keyboard
shortcuts (`1`–`6` jump modes, `/` search, `b` bookmark, `Esc` back, `?` shortcuts list),
toast notifications, a new **Changelog** view/nav entry, and import that validates the file
and shows a summary (cards seen, questions answered, etc.) before overwriting your progress
instead of silently replacing it.

**Note on the "~50" target:** I built ~25 real, working, individually-tested features rather
than padding to a round number with stubs — your own instructions said to prioritize
correctness over raw count, and that's the call I made. Everything listed above is real and
verified, not a placeholder.

## 4. Testing

New `tests/run.js` — a no-dependency Node test suite (loads the actual `content/*.js` and
`js/{core,features,net,shell,drills}.js` via `vm.runInThisContext`, exactly like `index.html`'s
script tags). Covers: content integrity across all 6 tracks, the unlock/free-nav/mastery index,
SM-2 spaced-repetition math, the new search/difficulty/read-time helpers, backup+restore and
import validation, generated drills' own arithmetic (checked against independently recomputed
values, not hardcoded expectations), core IPv4 math, and — the one I'd flag as most
valuable — the **full 8-command Lab walkthrough from this README, reproduced and asserted
line-by-line** against the actual simulated switch/IGMP behavior.

**Current status: 2446 assertions, all passing.** Run it yourself: `node tests/run.js`.

`js/ui.js` and `js/app.js` aren't covered by this suite (they need a real DOM) — those were
smoke-tested live in Chrome instead (see below).

## 5. Two real bugs found and fixed (via live browser testing, not the headless suite)

1. **Bookmark star was invisible in card view.** A CSS rule meant only for the small star on
   Learn-view tiles (`position:absolute`) was written on the shared `.star` class, so it leaked
   onto the larger card-view star too. With no positioned ancestor there, it got flung to the
   viewport's top-right corner — present in the DOM, functionally working, but never visible.
   Fixed by scoping the rule to `.cardtile .star`.

2. **Lab terminal text became low-contrast in light theme.** The terminal's colored lines
   (commands/errors/warnings) reused the general theme-relative CSS variables. Since the
   terminal's background stays fixed near-black in both themes (correct — a terminal shouldn't
   repaint white), switching to light theme shifted those variables to darker shades meant for
   a *white* background, hurting readability on the terminal's dark one. Fixed by adding
   dedicated `--term-*` variables that don't change with the theme.

Both were caught by comparing computed styles/DOM state against expectations while driving the
real app in Chrome — worth knowing the headless test suite alone would have missed both, since
it never touches the DOM.

## 6. A robustness fix that wasn't on the original list

While testing, the service worker (`sw.js`, added in a prior session for offline/PWA use) was
caught serving **stale JS/CSS to itself** even while online, twice:
- First pass: it was cache-first. Fixed to network-first.
- Turned out network-first alone wasn't enough — a plain `fetch()` inside a service worker can
  still be satisfied by the *browser's own* HTTP cache underneath it. Fixed by forcing
  `{cache: "no-store"}` on the network fetch, and bumped the cache version (v1 → v2 → v3) so
  stale caches from earlier in this session get cleaned up on next activate.

This wasn't something you asked me to look at, but it's the kind of bug that would have quietly
undermined every other change in this run for anyone using the installed PWA — worth fixing
in place rather than leaving for you to hit later.

## 7. Git

The folder had no git repo before this run. Initialized one, with incremental commits at each
stage (baseline snapshot → test harness → free-nav/bookmarks → search/features layer →
UI wiring + the two bug fixes → DNS content + sw.js hardening). No remote was configured or
pushed to — this is local-only, exactly as found. Full messages are in `git log`.

## What I'd flag for you

- **Difficulty tags are a heuristic** (based on how many prerequisites a card has), not
  hand-authored per card. Reasonable proxy, but if a specific card feels mistagged, that's why.
- **The PWA offline story is now correct but still LAN-only by design** (per your earlier
  decision to skip HTTPS/mkcert setup) — service workers need a secure context, so true
  offline-after-disconnect only works if you're accessing this over `localhost`, not
  `http://192.168.x.x` from your phone. Browsing over LAN still works fine either way.
- I did **not** touch the Lab/Incident simulation engines (`js/net.js`, `js/shell.js`,
  `scenarios.js`) beyond what the test suite needed to verify — all existing Lab commands and
  the 8-command walkthrough behave exactly as before.
- I stopped adding features once I'd built a solid, fully-tested set rather than mechanically
  continuing to an arbitrary number — happy to keep going in a specific direction if you want
  more (e.g. more content tracks, more Lab commands, a proper icon set for the PWA manifest).
