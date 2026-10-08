---
name: pfc-review
description: Audit frontend code against Page-Feature Composition rules and report violations with the specific fix for each. Checks page size and purity, feature-to-feature imports, pages reaching into feature internals, smart components, over-exported barrels, missing facades, and mixed state approaches. Use when reviewing a PR in a PFC codebase, when asked whether code follows PFC, or when a codebase feels tangled and you need to know where the boundaries broke.
---

# Reviewing code against PFC

Audit a codebase or a diff against Page-Feature Composition. Report what is
broken, where, and the specific fix. Default to flagging; approval is earned.

## First, establish whether PFC applies

If the project is a landing page, a marketing site, a prototype, or an app under
10 routes, **PFC does not apply and its absence is not a finding.** Say so and
stop. Do not generate violations for a project the pattern explicitly excludes.

## The seven checks, in severity order

If the project already has a boundary check configured (a `pfc-verify` script,
`eslint-plugin-boundaries` or `@nx/enforce-module-boundaries`), run it first: it
covers checks 1 and 2 mechanically, and part of 3 by heuristic.

### 1. Feature imports another feature — CRITICAL

```bash
grep -rn "features/" src/app/features/ --include=*.ts | grep -v "^src/app/features/\([^/]*\)/.*features/\1/"
```

Any import crossing from one feature into another undoes the architecture. Both
features become untestable and unmovable.

**Fix:** delete the import. Move coordination up to the page — B emits an
output, the page holds the value, the page passes it into A as an input. If the
two are genuinely inseparable, the finding is that they should be **one
feature**; say so.

### 2. Page reaches into feature internals — CRITICAL

Look for page files importing anything from a feature other than its barrel:
container classes, components, services, store facades, actions, selectors.

**Fix:** import only from the feature's `index.ts`. If the page needs something
not exposed, widen the public facade deliberately — never reach around it.

### 3. Smart component — HIGH

A file in `components/` that injects a service, calls an API, subscribes to a
store, or uses a data-fetching hook.

**Fix:** move the logic into the container and pass results down as inputs; or,
if the file genuinely orchestrates, move it to `containers/` and rename it.

### 4. Over-exported barrel — HIGH

A feature's `index.ts` exporting components, services, store internals, actions
or reducers.

**Fix:** reduce to the module and the public facade. Every extra export is a
coupling that will break a page when the implementation changes.

### 5. Missing or single facade — MEDIUM

A feature with no facade, or one that exports its store facade directly as the
public API.

**Fix:** add the external feature facade wrapping the internal store facade.
Without the split, every page is coupled to the state library.

### 6. Fat page — MEDIUM

A page component over ~50 lines, or one containing API calls, filters, sort
options, or feature state.

**Fix:** name which concern belongs in which feature and move it. Page state
should be limited to route-specific things: active tab, current step, selection,
scroll position.

### 7. Mixed state approaches — LOW

NgRx and signals, or a store and a subject-based service, inside one feature.

**Fix:** pick one per feature and converge.

## Also worth flagging

- A feature that fails the elevator pitch test — its description needs "and", so
  it is really two features.
- Business-specific code in `shared/`. `shared/` is for genuinely generic
  things.
- Auth logic inside a feature rather than `core/`.
- A feature duplicated or forked to serve a second context, where a `mode` input
  would do.

## How to report

For each finding: the file and line, which rule it breaks, why it matters
concretely (what will break and when), and the specific fix. Order by severity —
boundary violations first, since those are what compound.

Distinguish clearly between **new code**, which should meet the bar, and
**legacy code being migrated**, where partial progress is the goal. Encourage
extraction in legacy; do not demand perfection. Praise progress.

If nothing is broken, say so in one line. Do not manufacture findings.
