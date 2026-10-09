# AGENTS.md

Instructions for coding agents working in a **Page-Feature Composition** (PFC)
codebase, or working in this repository.

Two audiences, two sections. Read the one that applies.

---

## A. You are working in an application that uses PFC

### Check first: does PFC apply to this project?

**Do not apply PFC to** landing pages, marketing sites, prototypes, solo
projects under 10 routes, or apps that are mostly unique one-off interfaces. In
those cases build the simple thing and say why. Creating `features/` and
`pages/` where there are no business capabilities to encapsulate adds ceremony
and nothing else.

**Apply PFC to** applications with 10+ routes, long lifespans, three or more
developers, or recurring UI patterns.

### The whole pattern in four lines

- **Features** own complete business capabilities. Everything for "user
  management" lives in `features/user-management/`.
- **Pages** compose features and hold zero business logic.
- **Shared** is for genuinely generic utilities. **Core** is for auth, layout
  and config.
- Features are independent; pages coordinate between them.

### Rules you must not break

1. **Pages import a feature's module and public facade only.** Never a container
   class, component, service, store, action or selector.
2. **Features never import features.** Coordination goes through the page: B
   emits, the page holds, the page passes into A as an input. If that is absurd
   because they are inseparable, they are one feature.
3. **A component that injects a service is not a component.** Move the logic to
   the container, or move the file to `containers/`.
4. **Two facades per feature** — internal store facade (private) and external
   feature facade (public). Both, always.
5. **`index.ts` exports the module and the public facade.** Nothing else.
6. **One state approach per feature.** Never two mixed.
7. **Features adapt through a `mode` input, never a fork.**
8. **A page over ~50 lines of code has absorbed something that belongs in a
   feature.**

### Where to put a new thing

| It is | Put it in |
|---|---|
| A business capability | `features/<name>/` |
| A layout arranging capabilities | `pages/<name>/` |
| Smart: needs data, state or services | `features/<name>/containers/` |
| Dumb: inputs in, events out | `features/<name>/components/` |
| Generic, no business domain | `shared/` |
| Auth, layout shell, config | `core/` |

### Sizing a new feature

Elevator pitch test — one sentence, no "and". Can-it-live-alone test —
developable independently, testable in isolation, usable on multiple pages, one
business domain. Target 3–7 components and 1–2 containers. **When unsure, go
smaller.**

### Before you say it is done

Page: under 50 lines, zero business logic, no API calls, state delegated to
features, template declarative, page state limited to route-specific things.

Feature: containers smart and components dumb, both facades present, only module
and facade exported, services private, no feature-to-feature imports, modes via
inputs, components tested, works in isolation.

Full checklists: [`docs/checklists.md`](docs/checklists.md).

---

## B. You are working in *this* repository

This repo is the canonical source of the PFC pattern. It is documentation and
agent skills — there is no application here to architect.

### Structure

```
README.md                    Front door: the idea, the rules, how to adopt it
AGENTS.md                    This file
docs/01..05-*.md             The five part series, one file per part
docs/dependency-rules.md     The import graph and how to enforce it
docs/checklists.md           Page, feature, boundary, review and migration lists
docs/faq.md                  The recurring objections
docs/framework-translation.md  React / Vue / Svelte mapping — an adaptation
skills/pfc/                  Build the PFC way
skills/pfc-review/           Audit code against PFC
skills/pfc-migrate/          Extract one feature from a monolith
skills/pfc-enforce/          Make the build fail on a broken boundary — derived
templates/feature/           Annotated feature scaffold
templates/page/              Annotated page scaffold
```

### Rules for changing this repository

**Do not change the pattern.** The five `docs/0N-*.md` files are a faithful
record of the published series. Fix typos, broken links and formatting freely.
Do **not** add rules, soften rules, or invent guidance and attribute it to the
series. If you believe the pattern needs to change, that is the author's call —
raise it, do not write it.

**Mark derived material as derived.** Anything not from the original series says
so at the top, the way `docs/framework-translation.md` does. Readers and other
agents must be able to tell the pattern from a translation of it.

**Keep the four surfaces in sync.** The rules appear in the README, in
`AGENTS.md`, in `docs/dependency-rules.md` and in `skills/pfc/SKILL.md`. Change
one and you must change all four, in the same commit, or they will drift and the
agent-facing copies will quietly contradict the human-facing ones.

**Examples must be valid.** Code samples are read and copied by both people and
agents. Straight quotes, correct syntax, imports that would actually resolve.

**Both audiences, every time.** A change that helps a human reader but leaves an
agent with a contradictory instruction is not finished.

### Commit messages

This repo is public and promoted. The log is read. Write the subject in the
imperative under 72 characters, then a body in prose explaining what changed and
why — the decision and the alternative rejected, not a restatement of the diff.
