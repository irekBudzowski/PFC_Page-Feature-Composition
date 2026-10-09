# Page-Feature Composition (PFC)

**A frontend architecture that stops apps turning into spaghetti as they grow.**

Six months ago your project was a thing of beauty. Clean components, organised
services, everything in its place. Today you are afraid to touch anything,
because changing one component might break three others you did not know
existed.

PFC is the fix. It is not revolutionary and it is not rocket science. It is a
sensible way to organise frontend apps that actually scales.

```
Features own business capabilities.  Pages compose features.  That is it.
```

An animated, illustrated guide to the pattern lives at
[nullhands.com/pfc](https://nullhands.com/pfc).

---

## The one idea

Stop asking **"how do I make this component reusable everywhere?"**
Start asking **"how do I make features composable on pages?"**

Components that try to be generic fail. Genericness is paid for in props, and
props multiply until every call site is configuring routes, actions and styling
by hand. That is prop hell, and its population is your entire codebase.

PFC inverts it:

| | Traditional components | PFC features |
|---|---|---|
| Goal | generic, reusable everywhere | specific, composable on pages |
| Reality | 15 optional props, still wrong in the new context | works unchanged in five contexts |
| Business logic | leaks into pages and cards alike | owned entirely by the feature |
| Reuse | copy-paste a fourth `UserCard` | compose the same feature again |

**Features** are mini-applications that own a complete business capability.
**Pages** are conductors: they arrange features on screen and hold zero business
logic. A conductor does not play the violin.

## What it looks like

```
src/app/
├── features/              # Business logic lives here
│   ├── user-management/
│   ├── product-catalog/
│   └── order-processing/
├── pages/                 # Orchestrators
│   ├── dashboard/
│   ├── admin/
│   └── customer-portal/
├── shared/                # Truly generic utilities
└── core/                  # Auth, layout, configuration
```

A real admin dashboard page, in full:

```ts
export class AdminDashboardPage {
  constructor(private router: Router) {}

  onUserSelected(userId: string): void {
    this.router.navigate(['/users', userId]);
  }
}
```

Eight lines. The template composes three features; the features do the work.

```html
<div class="dashboard-grid">
  <app-analytics-container mode="summary"></app-analytics-container>

  <app-user-management-container
    mode="compact"
    [maxItems]="10"
    (userSelected)="onUserSelected($event)">
  </app-user-management-container>

  <app-notifications-container [maxItems]="5"></app-notifications-container>
</div>
```

The same `user-management` feature also runs the full admin page, a selection
dialog and a profile sidebar. Different modes, same code, zero modifications.

## The three rules that make it hold

Everything else is detail. These are the constraints people break first:

1. **Pages may touch a feature's module and public facade. Nothing else.** No
   reaching into containers, components, services or the store.
2. **Features never import features.** If two need to talk, the page carries the
   value between them.
3. **A component that injects a service is not a component.** It is a container
   wearing the wrong label.

Full table in [docs/dependency-rules.md](docs/dependency-rules.md).

## Read the series

Five parts, in order. Each is self-contained enough to read alone.

| | | |
|---|---|---|
| **1** | [The Philosophy](docs/01-philosophy.md) | The mental shift, the four folders, why it works, and when *not* to use it |
| **2** | [Pages as Orchestrators](docs/02-pages-as-orchestrators.md) | The 50-line rule, four composition patterns, feature communication |
| **3** | [Building Bulletproof Features](docs/03-building-features.md) | Containers vs components, the two facades, state, the public API |
| **4** | [From Monolith to Composition](docs/04-migration.md) | Feature sizing, the strangler pattern, migrating without stopping delivery |
| **5** | [Real-World Examples](docs/05-real-world-example.md) | A complete three-feature dashboard, end to end |

Supporting material:

- [Dependency rules](docs/dependency-rules.md) — the import graph on one page
- [Checklists](docs/checklists.md) — page, feature and review checklists to copy
- [FAQ](docs/faq.md) — the objections that come up every time
- [Framework translation](docs/framework-translation.md) — the same pattern in
  React, Vue and Svelte

## Use it in your project

### For your team

```bash
git clone https://github.com/irekBudzowski/PFC_Page-Feature-Composition
```

Copy [`templates/feature/`](templates/feature) as the starting point for a new
feature and [`templates/page/`](templates/page) for a new page. Both are
annotated with what goes where and what must never be exported.

### For your coding agents

PFC suits coding agents for the same reasons it suits new team members. A
feature folder is the whole capability, so the context an agent needs is bounded
by one directory. There is one answer to "where does this go", so it does not
have to guess. The import rules are mechanical, so a broken boundary can be a
failing build rather than a matter of review taste. And because pages see only a
feature's barrel, a change inside a feature has a known blast radius.

This repo ships as installable agent skills. Run this in any project and your
agent knows PFC without you explaining it again:

```bash
npx skills add irekBudzowski/PFC_Page-Feature-Composition
```

Four skills are installed:

| Skill | Does |
|---|---|
| `pfc` | Builds features and pages the PFC way; enforces the dependency rules |
| `pfc-review` | Audits existing code against PFC and reports violations |
| `pfc-migrate` | Plans and executes extracting one feature out of a monolith |
| `pfc-enforce` | Sets up a build-failing boundary check — ESLint, Nx or a zero-dependency script |

There is also an [`AGENTS.md`](AGENTS.md) at the root, which agents that read
that convention pick up automatically. Point any agent at this repository and it
has the pattern.

## Should you use it?

Being honest about this matters more than adoption numbers.

**Use PFC for:**

- medium to large applications (10+ routes)
- long-term projects that will evolve
- teams of three or more developers
- apps with recurring UI patterns

**Skip PFC for:**

- simple landing pages or marketing sites
- prototypes and short-term experiments
- solo projects under 10 routes
- apps that are mostly unique, one-off interfaces

For a toy project this is over-engineering. For a production app that will grow,
it is the structure that stops complexity compounding. If you are not sure,
[the FAQ](docs/faq.md) works through the usual objections.

## What teams get

**For the code** — true reusability across contexts without modification; clear
boundaries, so no more "where does this file go?"; features testable in
isolation with no massive mock setups; growth that is linear in features rather
than exponential. Adding feature 20 does not make features 1–19 more complex.

**For the team** — parallel development with minimal merge conflicts, because
one developer owns one feature; onboarding in ten minutes, because the rule is
one sentence; clear ownership at any team size.

**For your sanity** — no prop explosion, no copy-paste hell, and no fear that
changing a feature breaks an unrelated page.

## Framework

The examples are Angular and TypeScript. The architecture is not: the
principles work in React, Vue, Svelte or any component-based framework, and
[docs/framework-translation.md](docs/framework-translation.md) maps every
concept across. Only the syntax is Angular.

## Origin

Written by **Ireneusz Budzowski** and first published as a five part series on
[better-frontend.dev](https://better-frontend.dev), 13 November 2025, after more
than a year of using PFC in production on enterprise applications.

- PFC #1 — [The Philosophy](https://better-frontend.dev/pfc-1)
- PFC #2 — [Pages as Orchestrators](https://better-frontend.dev/pfc-2)
- PFC #3 — [Building Features](https://better-frontend.dev/pfc-3)
- PFC #4 — [Migration Strategies](https://better-frontend.dev/pfc-4)
- PFC #5 — [Real-World Examples](https://better-frontend.dev/pfc-5)

This repository is the canonical, offline-readable version of that series, plus
the templates and agent skills that make it usable rather than only readable.

## License

[MIT](LICENSE). Use it, adapt it, ship it. Attribution appreciated, not required.
