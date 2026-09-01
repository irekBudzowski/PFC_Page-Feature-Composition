# PFC #4 — From Monolith to Composition

**Practical migration strategies without rewriting everything**

> Part 4 of 5 · [← Building Features](03-building-features.md) · [Next: Real-World Examples →](05-real-world-example.md)

**TL;DR** — You do not need to rewrite your entire app to adopt PFC. Start with
one new feature or refactor one messy page. Use the strangler pattern: build new
features with PFC, gradually extract from monoliths, and let old and new coexist
during migration. Most teams see value within 2–3 sprints without disrupting
ongoing work.

---

You have got an existing codebase. Maybe 50 routes. Maybe 200 components. Maybe
years of "temporary" solutions. The question is not "should we adopt PFC?" It is
"how do we adopt PFC without stopping all feature development for six months?"

Good news: you do not rewrite everything. You migrate gradually.

## The core philosophy: divide and conquer

PFC is built on the ancient principle of divide and conquer. Break complex
problems into smaller, manageable, reusable pieces. Instead of one 2000-line
component trying to do everything, you have focused features that each do one
thing well.

Once you divide correctly:

- features become truly reusable across different pages
- teams can work in parallel without conflicts
- testing becomes straightforward
- bugs have clear boundaries

The trick is knowing **how** to divide.

## How big should a feature be?

The million-dollar question. The answer: start small and logically encapsulate
one part of your app.

### The golden rule

> **Too small is always better than too big.**

Seriously. A feature that is too small can easily be merged with another later.
A feature that is too large becomes a mini-monolith, defeating the whole purpose
of PFC.

When in doubt, go smaller. You can always combine features later if they turn
out too granular. You cannot easily split a massive feature that is already
coupled to everything.

### What makes a good feature?

Think of features as logical business capabilities that can stand alone.

**User Management** — listing, creating, editing, deleting, searching. All
user-related forms and displays. Can answer "show me users" in any context.

**Product Catalog** — browse, filter, create, edit, details. Product forms,
cards, grids and filters. Can answer "show me products" in any context.

**Order Processing** — creation, viewing, updating status, tracking. Order
forms, lists and status displays. Can answer "show me orders" in any context.

Each one is complete and independent. You could develop `user-management`
without products existing. You could test it in isolation. You could use it on
five different pages.

### Start small, grow organically

Building a shopping app? **Do not** start with one giant "e-commerce" feature
handling products, cart, checkout, orders and payments.

Start with small, focused features:

1. Product catalog feature (just products)
2. Then shopping cart feature (just the cart)
3. Then checkout feature (just the checkout flow)
4. Then order history feature (just past orders)

Four focused features consistently outperform one massive feature.

### The elevator pitch test

Can you describe what the feature does in one sentence **without using "and"**?

- ✅ Good: "User management handles all user CRUD operations."
- ❌ Too big: "E-commerce handles products, shopping cart, checkout, orders and
  payments."

If you need "and", you probably have multiple features hiding in there.

### The can-it-live-alone test

Before creating a feature, ask:

1. Can I develop this without other features existing? → Yes = good feature
2. Can I test this in complete isolation? → Yes = good feature
3. Can I use this on multiple different pages? → Yes = good feature
4. Does it handle ONE clear business domain? → Yes = good feature

Pass all four and you have found a reasonable boundary.

### Practical sizing

- 3–7 components per feature
- 1–2 containers per feature
- focused on one business domain
- 1–2 sprints to build the initial version

If unsure, choose the smaller option. **Too small beats too big, every time.**

## The mindset shift

Stop thinking: *"we need to refactor the whole app."*
Start thinking: *"what is the smallest valuable change we can make?"*

Migration is not a project. It is a practice. You do not set aside three months
to "do PFC". You adopt it incrementally, one feature at a time, while continuing
to ship.

## The strangler pattern

Named after strangler fig trees that gradually replace their host trees.

1. Build new features using PFC
2. Extract pieces from old monoliths when you touch them
3. Let old and new coexist peacefully
4. Over time, PFC becomes the majority

No big-bang rewrite. No project plan. Just better decisions going forward.

## Three migration strategies

### Strategy 1 — Start with new features

**Best for:** teams actively building new features.

When you need to build something new, build it the PFC way. Create the
`features/` and `pages/` folders alongside your existing code. New features go
into the new structure. Old code stays where it is.

**Timeline:** immediate. No refactoring needed.

### Strategy 2 — Extract one messy page

**Best for:** teams with one particularly problematic page.

Pick your messiest page component and identify the distinct business concerns it
handles. Create a small, focused feature for each concern. Move the logic out of
the page into features. Update the page to simply compose those features.

**Timeline:** 1–2 sprints for one page.

### Strategy 3 — Refactor when you touch it

**Best for:** teams with stable codebases and infrequent changes.

The Boy Scout Rule: leave code better than you found it. When fixing a bug or
adding a feature, extract just the part you are changing into a small feature.
Leave the rest as-is. Over time the page gets cleaner.

**Timeline:** no dedicated time. Happens during normal work.

## Deconstructing the kitchen sink

Let us walk through extracting features from a monolithic component, one at a
time.

**The problem:** your admin page. 500+ lines handling users, products and
orders. Everything mixed together. Services injected for all three domains.
State scattered everywhere. Methods for every possible action. Unmaintainable.

### Step 1 — Extract the first feature (users)

**Sprint 1.** Focus only on users.

Create the `user-management` feature. Move all user-related logic from the page
into the feature's container: loading users, searching, selecting, deleting. All
the user complexity now resides in the feature.

Update your page: replace all the inline user code with the `user-management`
container component.

**Result:** the page shrinks from 500 lines to ~350. All user services and state
removed from the page. Progress.

### Step 2 — Extract the second feature (products)

**Sprint 2.** Create the `product-catalog` feature. Move product loading,
filtering and editing into its container. Replace the inline product code in the
page with the container.

**Result:** page is now ~200 lines. Two features extracted.

### Step 3 — Extract the third feature (orders)

**Sprint 3.** Create the `order-processing` feature. Move all order logic into
its container. Replace the inline order code.

**Result:** page is now ~50 lines. Almost nothing left but orchestration.

### Step 4 — Migrate to a clean page component

**Sprint 4.** Final cleanup. Move the remaining orchestration into a new, clean
page component in your `pages/` folder. The page composes the three feature
containers and handles navigation. When a user is selected, navigate to the user
detail route. When a product is clicked, route to product details. That is all
the page does.

**Final result:** 500+ lines → ~30 lines. Three focused features. Clean
orchestration. Pure composition.

## Passing context to features

Pages extract context from routes (like IDs) and pass them as inputs to
features. The feature receives the ID, loads the data and displays it. Clean
separation.

For example: the user detail page retrieves the user ID from the route and
passes it to the `user-management` container in "detail" mode with that ID. The
feature handles the rest.

## Handling legacy dependencies

**Bridging old services.** Your new features may need to use existing
centralised services temporarily. That is okay. Wrap the old service in your
feature's new service and delegate to it for now. Replace the implementation
later when you are ready. No rush.

**Shared state.** Old and new code might need to share data during migration.
Let them temporarily share the feature's store. Document it as a TODO. Fix it
when you can. Keep moving forward.

## Team workflow

**Clear ownership.** Small features mean one developer or pair owns each
feature. Parallel development becomes natural.

**Code review focus.** Verify that new features are concise, focused and adhere
to the PFC structure. For legacy code, encourage extraction but do not demand
perfection. Praise progress.

**Documentation.** Create a simple one-page guide showing the feature template
and basic rules. Keep it minimal.

## Common challenges

**"How do we decide feature boundaries?"** — Start small. Use the elevator pitch
test: one sentence, no "and". If it passes and can live alone, it is good.

**"What if we make features too small?"** — Better than too big. You can combine
later. You cannot easily split a massive feature.

**"Our codebase is too big."** — Does not matter. Start with one small feature.
Prove value. Expand organically.

**"The team does not know PFC."** — Share the posts. Extract one feature
together. Learn by doing. Start small.

**"What about existing tests?"** — Keep them; they still test old code. Write
new tests for new features. Delete old tests when old code is removed. Gradual
transition.

## When NOT to migrate

**Skip if:** the app is being sunset soon, it is tiny, the team is overwhelmed,
it is already well organised, or it is in pure maintenance mode.

**Delay if:** a major deadline is approaching, or the team is in crisis.

Timing matters.

## Summary

- ✅ Start small — too small beats too big
- ✅ Extract one feature per sprint from monoliths
- ✅ Let old and new coexist during migration
- ✅ Move to a clean page component when all features are extracted
- ✅ Pass context (IDs, params) as inputs to features
- ✅ Use the elevator pitch and can-it-live-alone tests
- ✅ The first feature is hardest; it gets easier

Start tomorrow. Extract one small feature from your messiest page. Show value.
Repeat.

## Your migration plan

1. Which strategy? (New features / extract page / refactor on touch)
2. What is your messiest page? Start there.
3. What is the first small feature to extract? Users? Products? Orders?
4. Does it pass the tests? (Elevator pitch / can it live alone)

---

> [← PFC #3 — Building Features](03-building-features.md) ·
> [Next: PFC #5 — Real-World Examples →](05-real-world-example.md)
