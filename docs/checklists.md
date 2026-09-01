# Checklists

Copy these into your PR template, your definition of done, or your agent's
instructions.

## Page checklist

Before you mark a page done:

- [ ] Is the TypeScript file under 50 lines?
- [ ] Does it contain zero business logic?
- [ ] Are all API calls in features, not the page?
- [ ] Is state management delegated to features?
- [ ] Are feature containers doing the heavy lifting?
- [ ] Is the template declarative and easy to scan?
- [ ] Does page state contain only route-specific things (active tab, scroll
      position) rather than filters and sort options?

A "no" to any of these means something should move into a feature.

## Feature checklist

Before you mark a feature done:

- [ ] Containers handle smart logic, components stay dumb
- [ ] Internal store facade wraps state management
- [ ] External feature facade provides a simple API
- [ ] Only the module and facade are exported via `index.ts`
- [ ] Services are private to the feature
- [ ] No dependencies on other features
- [ ] Container supports different modes via inputs
- [ ] All components have unit tests
- [ ] Feature works in isolation

## Feature boundary checklist

Before you create a feature, size it:

- [ ] **Elevator pitch test** — can you describe it in one sentence without
      using "and"?
- [ ] **Can it live alone?**
  - [ ] Can I develop this without other features existing?
  - [ ] Can I test this in complete isolation?
  - [ ] Can I use this on multiple different pages?
  - [ ] Does it handle one clear business domain?
- [ ] 3–7 components?
- [ ] 1–2 containers?
- [ ] 1–2 sprints for the initial version?

If you are unsure, go smaller. Too small beats too big, every time.

## Code review checklist

What to look for in a PFC pull request:

**Boundaries**

- [ ] No page imports a feature internal (container class, component, service,
      store)
- [ ] No feature imports another feature
- [ ] No component injects a service
- [ ] Nothing new exported from a feature's `index.ts` without a reason

**Shape**

- [ ] New page under 50 lines of TypeScript
- [ ] New feature has both facades, not just one
- [ ] One state approach in the feature, not two mixed
- [ ] Feature variation handled by an input mode, not a fork or a flag file

**Judgement**

- [ ] Does this feature still pass the elevator pitch test after this change?
- [ ] Is anything being added to `shared/` that is actually business-specific?
- [ ] Is anything being added to a page that will need extracting next sprint?

For legacy code being touched: encourage extraction, do not demand perfection.
Praise progress.

## Migration checklist

Per feature extracted from a monolith:

- [ ] Identified one distinct business concern to extract
- [ ] Created the feature folder with the standard structure
- [ ] Moved logic into the container, not into the page
- [ ] Replaced the inline code in the page with the container
- [ ] Old and new coexist; nothing else was broken to achieve it
- [ ] Any bridged legacy service is wrapped and marked with a TODO
- [ ] Page line count went down; noted where it started and where it landed
