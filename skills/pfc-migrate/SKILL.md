---
name: pfc-migrate
description: Extract one feature out of a monolithic page or component using the PFC strangler pattern, without rewriting the app. Plans the boundary, moves logic into a feature container, reduces the page to composition, and bridges legacy services temporarily. Only runs when explicitly invoked.
disable-model-invocation: true
---

# Migrating to PFC, one feature at a time

Extract a single feature from a monolith. **Never a rewrite.** Old and new
coexist; each pass leaves the app shippable.

## The governing idea

Migration is a practice, not a project. Nobody sets aside three months to "do
PFC". You take one concern out of one page, ship it, and repeat. The first
extraction is the hardest; it gets easier.

Pick the strategy that matches the team:

| Strategy | For | Timeline |
|---|---|---|
| **New features only** — new work uses PFC, old code untouched | Teams actively building | Immediate |
| **Extract one messy page** — split the worst page into features | Teams with one bad page | 1–2 sprints |
| **Refactor when you touch it** — Boy Scout rule, extract only what you are already changing | Stable codebases | No dedicated time |

## The extraction, step by step

### Step 1 — Pick one concern

Read the monolith and list the distinct business concerns it handles. Pick
**one** — usually the largest or the one you are already touching.

Validate the boundary before writing anything:

- **Elevator pitch**: one sentence, no "and".
- **Can it live alone**: developable independently, testable in isolation,
  usable on multiple pages, one business domain.

If it fails, pick a smaller slice. **Too small beats too big** — small features
merge easily later; large ones never split.

### Step 2 — Create the feature skeleton

```
features/<name>/
├── components/          # dumb UI moved out of the page
├── containers/          # the smart orchestrator
├── services/            # private
├── store/               # state + internal facade, private
├── models/
├── <name>.facade.ts     # public API
└── index.ts             # module + facade only
```

### Step 3 — Move the logic into the container, not the page

Everything for this concern moves into the feature's container: data loading,
filtering, selection, mutations, and the state that backs them. The page keeps
none of it.

Give the container a `mode` input from the start if you can already see a second
context for it.

### Step 4 — Replace the inline code with the container

In the page, delete the concern's markup, properties, methods and injected
services, and put the feature container in their place. Wire the container's
outputs to page-level navigation.

**Measure it.** Note the page's line count before and after — that number is how
you show value to the team and justify the next pass.

### Step 5 — Repeat, then clean the page

One concern per pass, one pass per sprint. When the last concern is out, move
the remaining orchestration into a proper page component under `pages/`. It
composes the containers and handles navigation, and nothing else.

A realistic arc for a 500-line admin page: 500 → 350 → 200 → 50 → ~30 lines,
three focused features, over four sprints.

## Living with legacy while you migrate

**Bridging old services.** A new feature may need an existing centralised
service. Wrap it in the feature's own service and delegate. Replace the
implementation later. This is expected, not a violation.

**Shared state.** Old and new code may need to share data temporarily. Let them
share the feature's store, mark it with a TODO, and fix it when you can. Keep
moving.

**Existing tests.** Keep them — they still test the old code. Write new tests
for the extracted feature. Delete old tests when the old code goes.

## Do not

- Rewrite multiple concerns in one pass.
- Break the app to reach a cleaner end state.
- Demand perfection from legacy code you are only passing through.
- Extract a feature that fails the sizing tests because it "feels like a
  module".
- Migrate at all when the app is being sunset, is tiny, already well organised,
  in pure maintenance mode, or the team is mid-crisis or facing a deadline.

## Report at the end of each pass

What was extracted, the page's before and after line count, what was bridged
temporarily and why, and which concern is next.
