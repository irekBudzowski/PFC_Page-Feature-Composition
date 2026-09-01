# PFC #1 — The Philosophy

**Why frontend projects turn into spaghetti, and how to fix it**

> Part 1 of 5 · [Next: Pages as Orchestrators →](02-pages-as-orchestrators.md)

**TL;DR** — Traditional projects tend to become spaghetti-like as they grow.
Components get tightly coupled to contexts. Copy-paste becomes the norm. PFC
fixes this by separating **features** (business logic) from **pages**
(orchestration). Result: truly reusable features, cleaner code, happier teams.
The examples are Angular; the concepts apply to React, Vue and any other
component-based framework.

---

Six months ago, your project was a thing of beauty. Clean components, organised
services, everything in its place. Today? You are afraid to touch anything,
because changing one component might break three others you did not know
existed.

Sound familiar? You are not alone. Every developer has been there.

If that describes your current situation, you are about to meet your new best
friend: Page-Feature Composition.

## The philosophy

Stop fighting your framework and start working with it. The key insight is
simple:

> Stop asking "how do I make this component reusable everywhere?" and start
> asking "how do I make features composable on pages?"

### The problem we keep creating

We have all written this:

```ts
@Component({
  selector: 'app-user-card',
  template: `...`
})
export class UserCardComponent {
  @Input() user: User;

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  editUser() {
    this.router.navigate(['/admin/users/edit', this.user.id]);
  }
}
```

Innocent enough. Until six months later, when you need the same card in a
customer dashboard, but it navigates to the wrong route. Now you are adding
props to control routes, actions and styling.

Welcome to **prop hell**. Population: your entire codebase.

### The mental shift

Components try to be generic — and fail. Features are specific but composable.
Pages orchestrate features into different contexts without modifying them.

## Folder structure

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
├── shared/                # Utilities
│   └── components/
└── core/                  # App foundation
    └── auth/
```

**Features** — self-contained business capabilities. Everything related to "user
management" lives in one folder: components, services, state management, all of
it. Think of features as mini-applications focused on a single business domain.

**Pages** — conductors that compose features into user experiences but contain
zero business logic. Just orchestration. A page arranges features on screen and
handles navigation.

**Shared** — truly generic stuff. Button components, pipes, utilities that work
anywhere. If it does not belong to a specific feature and is not page-specific,
it goes here.

**Core** — app-wide concerns. Authentication, layout, configuration. Things that
are truly global to your application.

## Pages as orchestrators

This is the key insight that makes everything fall into place. **Pages do not
implement features. They compose them.**

Think of a symphony orchestra. The conductor does not play the instruments. They
coordinate the musicians (features) to create a cohesive performance (the user
experience).

### What you are probably doing now

Your page component contains over 200 lines of template mixing users, products,
orders and notifications. The TypeScript file has 50+ properties and methods
handling everything.

It is a kitchen sink. Nobody wants to touch it, because changing one thing might
break three others.

### The PFC way

```ts
// src/app/pages/dashboard/dashboard.page.ts
@Component({
  templateUrl: './dashboard.html'
})
export class DashboardPage { }
```

```html
<!-- src/app/pages/dashboard/dashboard.html -->
<div class="dashboard-grid">
  <section class="users-section">
    <h2>Team Overview</h2>
    <app-user-management-container></app-user-management-container>
  </section>

  <section class="products-section">
    <h2>Latest Products</h2>
    <app-product-catalog-container></app-product-catalog-container>
  </section>
</div>
```

The page is almost empty. It arranges features on the screen and adds
page-specific layout.

- User logic? Lives in the `user-management` feature.
- Product logic? Lives in the `product-catalog` feature.
- Dashboard layout? That is the page's only job.

Clean separation. Clear boundaries. No confusion about where code belongs.

## Features architecture

Each feature is a mini-application focused on one business domain. This is where
the real work happens.

```
features/user-management/
├── components/            # Dumb UI (user cards, forms)
├── containers/            # Smart orchestrators
├── services/              # API calls
├── store/                 # State management (NgRx/signals)
├── models/                # TypeScript interfaces
├── user-management.facade.ts     # Public API
├── user-management.module.ts
└── index.ts               # What pages can use
```

The magic is in what you export versus what stays internal.

### Public vs private API

```ts
// src/app/features/user-management/index.ts
export * from './user-management.module';
export * from './user-management.facade';

// Everything else stays private:
// - Internal components
// - Services
// - Store details
// - Helper utilities
```

Pages can only access what you explicitly export. This prevents tight coupling
and keeps your architecture clean.

### The facade pattern

Each feature exposes a facade — a simple API that pages can use to trigger
feature actions programmatically.

```ts
// src/app/features/user-management/user-management.facade.ts
@Injectable()
export class UserManagementFacade {
  readonly isLoading$ = this.storeFacade.isLoading$;

  constructor(private storeFacade: UserStoreFacade) {}

  loadUsers(): void {
    this.storeFacade.loadUsers();
  }
}
```

Most of the time, pages use the container component and never interact with the
facade. But it is there when you need it — programmatically refreshing data, or
responding to route changes.

## Why this works

After using PFC in production for over a year on real enterprise applications:

### For your code

- **True reusability.** The `user-management` container works on the dashboard,
  the admin panel and the customer portal. Same code, different contexts, no
  modifications.
- **Clear boundaries.** No more "where does this file go?" debates. User stuff
  goes in `features/user-management/`. The dashboard page goes in
  `pages/dashboard/`. Done.
- **Easy testing.** Test features in isolation with simple inputs and outputs.
  Test pages as composition exercises. No massive mock setups.
- **Predictable growth.** Your codebase grows linearly with features, not
  exponentially. Adding feature 20 does not make features 1–19 more complex.

### For your team

- **Parallel development.** Developer A builds `user-management`. Developer B
  builds `product-catalog`. Developer C composes them into pages. Minimal merge
  conflicts.
- **Fast onboarding.** New developers understand the pattern in ten minutes:
  "features contain business logic, pages compose features, that's it."
- **Scales with team size.** Great for solo developers (clear structure), scales
  to large teams (clear ownership).

### For your sanity

- **No prop explosion.** Features handle their own modes and configurations
  internally. No 15+ optional props trying to make components "generic".
- **No copy-paste hell.** Build the feature once, compose it everywhere.
- **No modification fear.** Changing a feature does not randomly break unrelated
  pages. Clear boundaries mean predictable impact.

## When NOT to use PFC

Let us be honest. This is not always the answer.

**Skip it for:**

- simple landing pages or marketing sites
- prototypes or short-term experiments
- solo projects under 10 routes
- apps with mostly unique, one-off interfaces

**Use it for:**

- medium to large applications (10+ routes)
- long-term projects that will evolve
- teams of 3+ developers
- apps with recurring UI patterns

## Your mission

Before reading part 2, audit your current project:

1. **Find your most complex page component.** How many lines? How many different
   business concerns does it handle?
2. **Count your component variations.** How many "Card" components do you have?
   `UserCard`, `ProductCard`, `CustomerCard`, `EmployeeCard`…
3. **Identify feature boundaries.** What natural business groupings exist? What
   chunks of functionality could be self-contained?

**Bonus challenge:** identify one feature in your current codebase that could be
extracted using PFC principles. What would you put in the feature folder? What
would the facade expose?

---

> [Next: PFC #2 — Pages as Orchestrators →](02-pages-as-orchestrators.md)
