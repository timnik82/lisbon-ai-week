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
                        FilterBar, PrototypeNotice
pages/Schedule.tsx      schedule tab
pages/MyAgenda.tsx      saved-events tab
hooks/useFavorites.ts   localStorage-backed favourites
utils/                  format helpers, conflict detection
types/event.ts          event/catalog types
data/catalog.json       source catalog (71 listings)
data/events.ts          typed view over the catalog
tests/                  catalog, conflict and format tests
```

## About the data

`data/catalog.json` contains **71 source listings** reconciled from two overlapping scraped
exports of the Lisbon AI Week site.

- Each record has a `verificationStatus` and an `uncertainty` field; the latter can be `null` when
  no specific warning text is needed. Status counts are 12 `verified`, 1 `verified_with_conflict`,
  and 58 `unverified`.
- Many entries have **no confirmed date, start time or end time** (17 have no description and 36
  have no date/start). The UI shows "End time unknown" / "Time unknown" instead of inferring one.
- Probable aliases remain flagged as separate source listings rather than silently merged. Two
  failed/stub source records are quarantined outside this 71-listing application catalog.

**This is a personal, unverified snapshot — not a fully verified official programme.** Treat every
row as unconfirmed until it is checked against the organiser's own schedule or registration page,
and always confirm time and venue at the event's `sourceUrl` / `registrationUrl` before travelling.

Data was captured on 12 Sep 2026; the official programme may have changed since.
