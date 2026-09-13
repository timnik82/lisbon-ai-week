# Lisbon AI Week — schedule app

A mobile-first personal navigator for the [Lisbon AI Week](https://lisbonaiweek.com) programme:
browse the schedule by day, search and filter listings, open a detail sheet per event, save a
personal agenda to local favourites, and see warnings when two saved events overlap.

The interface is English; event titles, venues and descriptions are kept as written in the source.

## Current published version

The design is authored in Magic Patterns. The current public app is:

**https://project-luminous-eggplant-560.magicpatterns.app**

This repository contains a local, buildable copy of that same app (component set plus scaffold —
entry HTML, TypeScript/Vite config, Tailwind config, and tests). Magic Patterns automatically
republishes its active artifact to the public address above; changes made there must be reviewed
and then synchronized into this repository separately.

## Getting started

```bash
npm ci          # install exactly the locked dependency tree
npm run dev     # local dev server (Vite)
npm run check   # typecheck (tsc --noEmit) + unit tests (vitest run)
npm run build   # production build into dist/
```

`npm run check` and `npm run build` must both pass before pushing.

## Project layout

```
App.tsx                 app shell: tabs, day filter, search, detail sheet
index.tsx, index.html   entry point and HTML host
index.css               Tailwind entry + app styles
components/             Badge, BottomNav, ConflictBanner, DateStrip, EmptyState,
                        EventBadges, EventDetailSheet, EventList, EventRow,
                        FilterBar, PrototypeNotice, PwaStatusBanner
pages/Schedule.tsx      schedule tab
pages/MyAgenda.tsx      saved-events tab
hooks/                  useFavorites.ts (localStorage favourites),
                        usePwaStatus.ts (offline + update-waiting state)
utils/                  format helpers, conflict detection
types/event.ts          event/catalog types
data/catalog.json       source catalog (71 listings)
data/events.ts          typed view over the catalog
tests/                  catalog, conflict and format tests
```

## About the data

`data/catalog.json` contains **71 source listings** reconciled from two overlapping scraped
exports of the Lisbon AI Week site.

- Each record has a `verificationStatus` and a **required** `uncertainty` string (it is never null in
  the current catalog). Status counts are 11 `verified`, 2 `verified_with_conflict`, and 58
  `unverified`.
- Many entries have **no confirmed date, start time or end time** (17 have no description, and 37 of
  the 71 records have no date at all). The UI shows "To confirm" where a date/start is missing, "Time
  not confirmed" when there is no start time, and "End time unknown" when a start exists but no end —
  it never infers one.
- Four listings carry **source-side truncated descriptions**: the official page for each was checked
  on 13 Sep 2026 and its published event-details text ends mid-word, so the description here is
  incomplete. Their text is stored as published and the missing tail was not invented:
  `fcaf5088d838` (AI OS), `251f94811db6` (AI in banking), `4d1a8946f92d` (Cafe Compute Meetup),
  `b2a60634dae9` (AI Night Thinkers).
- Probable aliases remain flagged as separate source listings rather than silently merged. Two
  failed/stub source records are quarantined outside this 71-listing application catalog.
- `ad7204602d0a` (Cascais AI Afterwork) is `verified_with_conflict`: the official page header says
  Sep 24, 19:00, while its body repeatedly says Friday / Friday evening. The page contradicts itself,
  so its date is left unconfirmed (null) while the 19:00 start is kept from the header.

**This is a personal, unverified snapshot — not a fully verified official programme.** Treat every
row as unconfirmed until it is checked against the organiser's own schedule or registration page,
and always confirm time and venue at the event's `sourceUrl` / `registrationUrl` before travelling.

Data was captured on 12 Sep 2026; the official programme may have changed since.
