# PFC #2 — Pages as Orchestrators

**How to compose features without losing your mind**

> Part 2 of 5 · [← Philosophy](01-philosophy.md) · [Next: Building Features →](03-building-features.md)

**TL;DR** — Pages are conductors, not implementers. They compose features into
user experiences through simple templates, handle navigation and routing, and
manage feature-to-feature communication when needed. Keep pages under 50 lines
of TypeScript by letting features own all business logic.

---

In [part 1](01-philosophy.md) we introduced the core philosophy: separate
features (business logic) from pages (orchestration). Now let us go deep on how
pages actually work as orchestrators.

Remember that messy 200-line page component mixing users, products and orders?
By the end of this you will know exactly how to break it down.

## The conductor mindset

Think about a symphony orchestra. The conductor does not play violin, trumpet or
drums. They coordinate musicians to create a cohesive performance.

Pages work the same way. They do not implement user management, product catalogs
or order processing. They coordinate features to create user experiences.

### What pages should do

- ✅ **Compose features** — arrange feature containers on the screen
- ✅ **Handle navigation** — respond to route changes and manage routing
- ✅ **Coordinate communication** — pass data between features when needed
- ✅ **Apply layout** — structure the page visually
- ✅ **Manage route-specific state** — active tab, scroll position, and the like

### What pages should NOT do

- ❌ **Business logic** — that belongs in features
- ❌ **API calls** — features handle their own data
- ❌ **Complex state management** — features manage their own state
- ❌ **Component implementation** — use feature containers, do not build inline

> **Golden rule:** if your page component has more than 50 lines of TypeScript,
> something probably belongs in a feature.

## Page anatomy

A typical page is mostly template, minimal code:

```ts
// src/app/pages/dashboard/dashboard.page.ts
@Component({
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardPage {
  constructor(private router: Router) {}

  navigateToUserDetail(userId: string): void {
    this.router.navigate(['/users', userId]);
  }
}
```

That is eight lines. The template does the heavy lifting:

```html
<!-- src/app/pages/dashboard/dashboard.html -->
<div class="dashboard-grid">
  <section class="users-section">
    <h2>Team Overview</h2>
    <app-user-management-container
      mode="compact"
      [maxItems]="8">
    </app-user-management-container>
  </section>

  <section class="products-section">
    <h2>Latest Products</h2>
    <app-product-catalog-container
      mode="summary">
    </app-product-catalog-container>
  </section>
</div>
```

The template is declarative. It says "put user management here, products there."
That is orchestration.

## Composition patterns

### Pattern 1 — Grid layout

Multiple features arranged in a grid. The most common pattern. Grid styling in
CSS; features just get composed.

```html
<div class="grid-layout">
  <div class="grid-item span-2">
    <app-user-management-container mode="compact"></app-user-management-container>
  </div>

  <div class="grid-item">
    <app-notifications-container></app-notifications-container>
  </div>

  <div class="grid-item span-3">
    <app-analytics-container></app-analytics-container>
  </div>
</div>
```

### Pattern 2 — Tabs

Different features on different tabs. The page manages which tab is active;
features do not know tabs exist.

```ts
export class AdminPage {
  activeTab = 'users';
}
```

```html
<nav class="tabs">
  <button (click)="activeTab = 'users'">Users</button>
  <button (click)="activeTab = 'products'">Products</button>
</nav>

<app-user-management-container *ngIf="activeTab === 'users'"></app-user-management-container>
<app-product-catalog-container *ngIf="activeTab === 'products'"></app-product-catalog-container>
```

### Pattern 3 — Master-detail

One feature drives what another displays.

```ts
export class CustomerPortalPage {
  selectedUserId: string | null = null;
}
```

```html
<div class="master-detail">
  <aside class="master">
    <app-user-list-container
      (userSelected)="selectedUserId = $event">
    </app-user-list-container>
  </aside>

  <main class="detail">
    <app-user-detail-container
      *ngIf="selectedUserId"
      [userId]="selectedUserId">
    </app-user-detail-container>
  </main>
</div>
```

The user list emits a selection. The page passes it to the detail view.

### Pattern 4 — Multi-step flow

A wizard with a different feature at each step. Step management is a page
concern; each step is a feature.

```ts
export class OnboardingPage {
  currentStep = 1;
}
```

```html
<div class="steps">Step {{currentStep}} of 3</div>

<app-profile-form-container
  *ngIf="currentStep === 1"
  (completed)="currentStep = 2">
</app-profile-form-container>

<app-preferences-container
  *ngIf="currentStep === 2"
  (completed)="currentStep = 3">
</app-preferences-container>
```

## Feature communication

Sometimes features need to communicate. The page coordinates.

### Simple — through the page

```ts
export class SalesDashboardPage {
  selectedDateRange: DateRange | null = null;
}
```

```html
<app-date-picker-container
  (dateRangeChanged)="selectedDateRange = $event">
</app-date-picker-container>

<app-sales-chart-container
  [dateRange]="selectedDateRange">
</app-sales-chart-container>
```

The date picker emits. The page passes to the chart. Simple and explicit.

### Advanced — using facades

When you need to trigger actions programmatically:

```ts
export class ProductManagementPage implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private productFacade: ProductCatalogFacade
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['category']) {
        this.productFacade.filterByCategory(params['category']);
      }
    });
  }
}
```

The page responds to routes and triggers feature actions via the facade. The
container still handles the UI.

## Common mistakes

### Mistake 1 — Business logic in pages

❌ **Don't:**

```ts
export class DashboardPage {
  users: User[] = [];

  ngOnInit() {
    this.userService.getUsers().subscribe(users => {
      this.users = users.filter(u => u.active);
    });
  }
}
```

✅ **Do:**

```ts
export class DashboardPage {
  // Just compose features in the template
}
```

Let the `user-management` feature handle users.

### Mistake 2 — Tightly coupled features

❌ **Don't:**

```html
<app-user-list [detailComponentRef]="userDetail"></app-user-list>
<app-user-detail #userDetail></app-user-detail>
```

Features should not know about each other.

✅ **Do:**

```html
<app-user-list (userSelected)="selectedId = $event"></app-user-list>
<app-user-detail [userId]="selectedId"></app-user-detail>
```

The page coordinates the connection.

### Mistake 3 — Complex page state

❌ **Don't:**

```ts
export class DashboardPage {
  userFilters = { ... };
  productFilters = { ... };
  sortOptions = { ... };
  // 50 more properties
}
```

✅ **Do:**

```ts
export class DashboardPage {
  activeTab = 'overview'; // Minimal page state only
}
```

Filters and sorting belong in features, not pages.

## A real example

A real admin dashboard with PFC:

```ts
// 15 lines total
export class AdminDashboardPage {
  constructor(private router: Router) {}

  onUserSelected(userId: string): void {
    this.router.navigate(['/users', userId]);
  }
}
```

```html
<!-- Template composes 4 features -->
<div class="dashboard-grid">
  <section class="stats">
    <app-analytics-container mode="summary"></app-analytics-container>
  </section>

  <section class="users">
    <h2>Recent Users</h2>
    <app-user-management-container
      mode="compact"
      (userSelected)="onUserSelected($event)">
    </app-user-management-container>
  </section>

  <section class="products">
    <h2>Top Products</h2>
    <app-product-catalog-container mode="summary"></app-product-catalog-container>
  </section>

  <section class="activity">
    <app-activity-feed-container></app-activity-feed-container>
  </section>
</div>
```

Total TypeScript: 15 lines. Features composed: 4. Business logic in the page: 0.

## The page checklist

Before you mark a page "done":

- [ ] Is the TypeScript file under 50 lines?
- [ ] Does it contain zero business logic?
- [ ] Are all API calls in features, not the page?
- [ ] Is state management delegated to features?
- [ ] Are feature containers doing the heavy lifting?
- [ ] Is the template declarative and easy to scan?

If you answered "no" to any of these, refactor something into a feature.

## Summary

- ✅ Pages compose features via templates
- ✅ Keep TypeScript under 50 lines
- ✅ Handle navigation and routing only
- ✅ Coordinate feature communication when needed
- ✅ Let features own all business logic
- ✅ Use composition patterns: grid, tabs, master-detail, steps

The beauty of this approach? Six months from now you will open a page file and
instantly understand what it does. No archaeological dig required.

## Your challenge

Look at one of your current page components:

1. How many lines of TypeScript does it have?
2. How much of that could move into features?
3. Which composition pattern would work best?

---

> [← PFC #1 — The Philosophy](01-philosophy.md) ·
> [Next: PFC #3 — Building Bulletproof Features →](03-building-features.md)
