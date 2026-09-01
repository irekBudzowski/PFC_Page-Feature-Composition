# FAQ

The objections that come up every time PFC is introduced to a team.

### Isn't this over-engineered for a simple dashboard?

For a toy project, yes. For a production app that will grow, no. The structure
supports growth without a complexity explosion.

The honest test is in [when not to use PFC](#when-should-i-not-use-pfc) below.
If your app is four routes and will stay four routes, skip it.

### What if features need to share data?

Let the page coordinate. Feature A emits an event, the page holds the value, the
page passes it to Feature B via an input. Keep features independent.

```html
<app-user-list-container (userSelected)="selectedId = $event"></app-user-list-container>
<app-user-detail-container [userId]="selectedId"></app-user-detail-container>
```

If coordinating through the page feels absurd because the two are genuinely
inseparable, they are probably one feature.

### Can features use each other's components?

No. Features are independent. If you need shared components, put them in
`shared/`. If two features overlap significantly, maybe they are one feature.

### How do I handle authentication?

Core concern, not a feature. Put it in `core/auth/`. Features can inject auth
services when they need them.

### What about shared utilities?

The `shared/` folder. Pipes, utility functions, truly generic components. Not
business-domain-specific.

### How do we decide feature boundaries?

Start small. Use the elevator pitch test: describe it in one sentence without
using "and". If it passes and can live alone, it is a good boundary.

Full sizing guidance in [part 4](04-migration.md#how-big-should-a-feature-be).

### What if we make features too small?

Better than too big. You can combine later; you cannot easily split a massive
feature that is already coupled to everything.

### Our codebase is too big to migrate.

Does not matter. Start with one small feature. Prove value. Expand organically.
You are not rewriting the app — see [the strangler
pattern](04-migration.md#the-strangler-pattern).

### The team does not know PFC.

Share the series. Extract one feature together. Learn by doing. New developers
understand the pattern in about ten minutes, because the rule is one sentence:
features contain business logic, pages compose features.

### What about our existing tests?

Keep them; they still test the old code. Write new tests for new features.
Delete old tests when the old code is removed. Gradual transition.

### Do I really need two facades?

Yes, and the reason is concrete: the internal store facade is where NgRx (or
signals, or a `BehaviorSubject`) lives, and the external feature facade is the
contract pages hold. With both, you can swap your state library without touching
a single page. With only one, every page is coupled to your state management
choice.

### Which state management should I pick?

NgRx for complex state with multiple data sources, or when a large team wants
predictable patterns. Signals for simpler state with less boilerplate on Angular
16+. A service with `BehaviorSubject` for simple features where NgRx is
overhead.

Pick **one per feature**. Do not mix approaches inside a single feature.

### Isn't the facade just an extra layer of indirection?

It is one file per feature, and it is what makes the feature swappable. Skip it
and you have exported your store, which means every page now depends on your
store's shape.

### Does this work outside Angular?

Yes. The principles are framework-agnostic; only the syntax is Angular. See
[framework translation](framework-translation.md) for the React, Vue and Svelte
mapping.

### When should I not use PFC?

**Skip it for:** simple landing pages or marketing sites; prototypes and
short-term experiments; solo projects under 10 routes; apps that are mostly
unique, one-off interfaces.

**Delay it if:** a major deadline is approaching, or the team is in crisis.

**Also skip if:** the app is being sunset soon, it is tiny, the team is
overwhelmed, it is already well organised, or it is in pure maintenance mode.

### How long before we see value?

Most teams see value within 2–3 sprints without disrupting ongoing work, because
you are not stopping to migrate — you are building new features the new way and
extracting old ones when you happen to touch them.

The first feature is the hardest. It gets easier.
