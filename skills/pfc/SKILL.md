---
name: pfc
description: Page-Feature Composition — the architecture for building frontend apps that scale. Features own complete business capabilities; pages compose them and hold zero business logic; features never import features. Use when structuring a frontend application, creating a new feature or page, deciding where code belongs, reviewing whether a component should be smart or dumb, or when a page component is growing past 50 lines. Angular, React, Vue and Svelte. Do NOT apply to landing pages, marketing sites, prototypes, or apps under 10 routes.
---

# Page-Feature Composition

Build frontend applications where **features own business capabilities** and
**pages compose features**. This skill turns that into concrete decisions about
where code goes and what may import what.

## Before anything else: does PFC apply here?

**Do not apply PFC when the project is:**

- a landing page or marketing site
- a prototype or short-term experiment
- a solo project under 10 routes
- an app that is mostly unique, one-off interfaces

In those cases say so plainly and build the simple thing. Creating `features/`
and `pages/` for a five-section marketing page adds ceremony with nothing to
encapsulate. **Applying this pattern where it does not belong is a worse failure
than not knowing it.**

**Apply PFC when the project is:** 10+ routes, long-lived, has 3+ developers, or
has recurring UI patterns.

## The decision order

When asked to build or place any piece of UI, decide in this order.

**1. Is this a business capability or a layout?**
A business capability ("manage users", "browse products", "process orders") is a
**feature**. A layout that arranges capabilities is a **page**.

**2. If it is a feature — does it pass the sizing tests?**
- *Elevator pitch*: describe it in one sentence without using "and". Need "and"?
  It is two features.
- *Can it live alone*: developable without other features, testable in
  isolation, usable on multiple pages, one clear business domain.
- Target 3–7 components, 1–2 containers.
- **When unsure, go smaller.** Small features merge easily; large ones never
  split.

**3. Inside a feature — is this file smart or dumb?**
If it needs data, state or services, it is a **container** (`containers/`). If
it takes inputs and emits outputs, it is a **component** (`components/`).
The moment a component injects or calls anything, it stops being a component.

**4. Does a page need to grow logic?**
No. If a page exceeds ~50 lines of code, something in it belongs in a feature.

## The structure you create

```
src/app/
├── features/<feature-name>/
│   ├── components/          # dumb UI, inputs in / events out
│   ├── containers/          # smart, one or two per feature
│   ├── services/            # PRIVATE, never exported
│   ├── store/               # state + internal facade, PRIVATE
│   ├── models/              # feature-private unless shared
│   ├── <feature>.facade.ts  # PUBLIC API for pages
│   ├── <feature>.module.ts  # exports only the container
│   └── index.ts             # exports only module + public facade
├── pages/<page-name>/       # composition + navigation only
├── shared/                  # truly generic; no business domain
└── core/                    # auth, layout, config
```

## Rules you must not break

1. **Pages may import a feature's module and public facade. Nothing else.**
   Never a container class, component, service, store, action or selector.
2. **Features never import features.** If two need to talk, the page carries the
   value: B emits, page holds, page passes into A as an input. If that feels
   absurd because they are inseparable, they are one feature — merge them.
3. **A component that injects a service is not a component.** Move the logic to
   the container, or move the file to `containers/`.
4. **Two facades per feature.** The internal store facade (private, wraps NgRx /
   signals / Pinia / Zustand) and the external feature facade (public, the
   contract pages hold). Both, always — one facade means pages are coupled to
   your state library.
5. **Export as little as possible.** `index.ts` exports the module and the
   public facade. Nothing else, unless a type is genuinely shared.
6. **One state approach per feature.** NgRx *or* signals *or* a subject-based
   service. Never two in one feature.
7. **Features adapt through inputs, not forks.** Add a `mode` input
   (`'full' | 'compact' | 'selection'`), never a second copy of the feature.

## What a page looks like when you are done

```ts
export class AdminDashboardPage {
  constructor(private router: Router) {}

  onUserSelected(userId: string): void {
    this.router.navigate(['/users', userId]);
  }
}
```

Composition lives in the template: feature containers arranged in a layout, with
outputs wired to navigation. Zero business logic, zero API calls, zero feature
state.

## Composition patterns for pages

- **Grid** — features arranged in a CSS grid. The default.
- **Tabs** — page holds `activeTab`; features never know tabs exist.
- **Master-detail** — one feature emits a selection, the page passes it as an
  input to the other.
- **Multi-step flow** — page holds `currentStep`; each step is a feature.

Page state is limited to route-specific things: active tab, current step,
selection, scroll position. Filters and sort options belong in features.

## Before you call it done

Page: under 50 lines, zero business logic, no API calls, state delegated,
template declarative.

Feature: containers smart / components dumb, both facades present, only module +
facade exported, services private, no feature-to-feature imports, modes via
inputs, components unit tested, works in isolation.

## Deeper reference

Full series, worked examples and the complete dependency table live alongside
this skill in the repository it was installed from:

- `docs/01-philosophy.md` — the mental shift and the four folders
- `docs/02-pages-as-orchestrators.md` — composition patterns in full
- `docs/03-building-features.md` — feature internals, facades, state, testing
- `docs/04-migration.md` — sizing tests and the strangler pattern
- `docs/05-real-world-example.md` — a complete three-feature dashboard
- `docs/dependency-rules.md` — the import graph and how to enforce it in CI
- `docs/framework-translation.md` — React, Vue and Svelte equivalents

For auditing existing code against these rules, use the `pfc-review` skill. For
extracting a feature out of a monolith, use `pfc-migrate`.
