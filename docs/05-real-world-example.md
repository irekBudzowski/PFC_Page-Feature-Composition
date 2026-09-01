# PFC #5 — Real-World Examples

**Complete dashboard implementation from start to finish**

> Part 5 of 5 · [← Migration](04-migration.md) · [Back to the README](../README.md)

**TL;DR** — See PFC in action with a real admin dashboard. Three features (user
management, analytics, notifications) composed on one page. Complete walkthrough
of folder structure, feature implementation, facades, containers and final page
composition.

---

We are building an admin dashboard that displays recent users with quick
actions, an analytics overview with charts, and a real-time notifications feed.

Three features, one page, zero spaghetti code.

## The requirements

**Show recent users** — display the last 10 active users, quick view/edit/delete
actions, click to navigate to full user management.

**Display analytics** — total users, active sessions, revenue; a simple chart
showing trends; refresh on demand.

**Show notifications** — real-time notification feed, mark-as-read, badge count
on unread items.

**Page responsibilities** — arrange features in a grid layout, handle navigation
when users click items. That is it.

## Project structure

```
src/app/
├── features/
│   ├── user-management/
│   │   ├── components/
│   │   │   └── user-card/
│   │   ├── containers/
│   │   │   └── user-management-container/
│   │   ├── store/
│   │   │   └── facade.ts
│   │   ├── services/
│   │   │   └── user-api.service.ts
│   │   ├── models/
│   │   │   └── user.interface.ts
│   │   ├── user-management.facade.ts
│   │   ├── user-management.module.ts
│   │   └── index.ts
│   │
│   ├── analytics/
│   │   ├── components/
│   │   │   └── stats-card/
│   │   ├── containers/
│   │   │   └── analytics-container/
│   │   ├── store/
│   │   ├── services/
│   │   ├── analytics.facade.ts
│   │   ├── analytics.module.ts
│   │   └── index.ts
│   │
│   └── notifications/
│       ├── components/
│       │   └── notification-item/
│       ├── containers/
│       │   └── notifications-container/
│       ├── store/
│       ├── services/
│       ├── notifications.facade.ts
│       ├── notifications.module.ts
│       └── index.ts
│
├── pages/
│   └── admin-dashboard/
│       ├── admin-dashboard.page.ts
│       ├── admin-dashboard.html
│       ├── admin-dashboard.scss
│       └── admin-dashboard.module.ts
│
└── shared/
    └── components/
```

Three focused features. One orchestrating page. Clean separation.

## Feature 1 — User management

### Models

If a model is used only by one feature, keep it inside the feature. Otherwise
move it to `shared/`, as here:

```ts
// shared/models/user.interface.ts
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  lastActive: Date;
  status: 'active' | 'inactive';
}
```

### Store facade (internal)

```ts
// features/user-management/store/facade.ts
@Injectable({ providedIn: 'root' })
export class UserStoreFacade {
  readonly users$ = this.store.select(selectUsers);
  readonly isLoading$ = this.store.select(selectIsLoading);

  constructor(private store: Store) {}

  loadRecentUsers(): void {
    this.store.dispatch(loadRecentUsers());
  }

  deleteUser(userId: string): void {
    this.store.dispatch(deleteUser({ userId }));
  }
}
```

### Container

```ts
// features/user-management/containers/user-management-container/user-management.container.ts
@Component({
  selector: 'app-user-management-container',
  templateUrl: './user-management.html'
})
export class UserManagementContainer implements OnInit {
  @Input() mode: 'full' | 'compact' = 'full';
  @Input() maxItems?: number;
  @Output() userSelected = new EventEmitter<string>();

  users$ = this.storeFacade.users$;
  isLoading$ = this.storeFacade.isLoading$;

  constructor(private storeFacade: UserStoreFacade) {}

  ngOnInit(): void {
    this.storeFacade.loadRecentUsers();
  }

  get displayUsers$() {
    return this.users$.pipe(
      map(users => this.maxItems ? users.slice(0, this.maxItems) : users)
    );
  }

  onUserClick(userId: string): void {
    this.userSelected.emit(userId);
  }

  onUserDelete(userId: string): void {
    if (confirm('Delete this user?')) {
      this.storeFacade.deleteUser(userId);
    }
  }
}
```

### Presentational component

```ts
// features/user-management/components/user-card/user-card.component.ts
@Component({
  selector: 'app-user-card',
  templateUrl: './user-card.html',
  styleUrls: ['./user-card.scss']
})
export class UserCardComponent {
  @Input() user: User;
  @Input() compact = false;
  @Output() click = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();

  onClick(): void {
    this.click.emit(this.user.id);
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    this.delete.emit(this.user.id);
  }
}
```

### Feature facade (public API)

```ts
// features/user-management/user-management.facade.ts
@Injectable()
export class UserManagementFacade {
  readonly isLoading$ = this.storeFacade.isLoading$;

  constructor(private storeFacade: UserStoreFacade) {}

  refreshUsers(): void {
    this.storeFacade.loadRecentUsers();
  }
}
```

### Public exports

```ts
// features/user-management/index.ts
export * from './user-management.module';
export * from './user-management.facade';
```

That is the complete `user-management` feature. Self-contained, testable,
reusable.

## Feature 2 — Analytics

Displays key metrics and a simple chart. Handles data loading and formatting.

```ts
// features/analytics/containers/analytics-container/analytics.container.ts
@Component({
  selector: 'app-analytics-container',
  templateUrl: './analytics.html'
})
export class AnalyticsContainer implements OnInit {
  @Input() mode: 'full' | 'summary' = 'full';

  stats$ = this.storeFacade.stats$;
  isLoading$ = this.storeFacade.isLoading$;

  constructor(private storeFacade: AnalyticsStoreFacade) {}

  ngOnInit(): void {
    this.storeFacade.loadStats();
  }

  refresh(): void {
    this.storeFacade.loadStats();
  }
}
```

```ts
// features/analytics/components/stats-card/stats-card.component.ts
@Component({
  selector: 'app-stats-card',
  templateUrl: './stats-card.html',
  styleUrls: ['./stats-card.scss']
})
export class StatsCardComponent {
  @Input() label: string;
  @Input() value: number;
  @Input() icon: string;
  @Input() trend?: 'up' | 'down';
}
```

## Feature 3 — Notifications

Displays real-time notifications, allows marking as read, shows unread count.

```ts
// features/notifications/containers/notifications-container/notifications.container.ts
@Component({
  selector: 'app-notifications-container',
  templateUrl: './notifications.html'
})
export class NotificationsContainer implements OnInit {
  @Input() maxItems = 10;

  notifications$ = this.storeFacade.notifications$;
  unreadCount$ = this.storeFacade.unreadCount$;

  constructor(private storeFacade: NotificationsStoreFacade) {}

  ngOnInit(): void {
    this.storeFacade.loadNotifications();
  }

  get displayNotifications$() {
    return this.notifications$.pipe(
      map(items => items.slice(0, this.maxItems))
    );
  }

  onMarkAsRead(id: string): void {
    this.storeFacade.markAsRead(id);
  }

  onMarkAllRead(): void {
    this.storeFacade.markAllAsRead();
  }
}
```

```ts
// features/notifications/components/notification-item/notification-item.component.ts
@Component({
  selector: 'app-notification-item',
  templateUrl: './notification-item.html',
  styleUrls: ['./notification-item.scss']
})
export class NotificationItemComponent {
  @Input() notification: Notification;
  @Output() markRead = new EventEmitter<string>();

  onMarkRead(): void {
    this.markRead.emit(this.notification.id);
  }
}
```

## The page — bringing it all together

```ts
// pages/admin-dashboard/admin-dashboard.page.ts
@Component({
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.scss']
})
export class AdminDashboardPage {
  constructor(private router: Router) {}

  onUserSelected(userId: string): void {
    this.router.navigate(['/users', userId]);
  }
}
```

That is it. Eight lines. No business logic. Just navigation.

```html
<!-- pages/admin-dashboard/admin-dashboard.html -->
<div class="dashboard-layout">
  <header class="dashboard-header">
    <h1>Admin Dashboard</h1>
    <p>Welcome back! Here's your overview.</p>
  </header>

  <div class="dashboard-grid">
    <!-- Analytics Feature -->
    <section class="analytics-section">
      <app-analytics-container mode="summary"></app-analytics-container>
    </section>

    <!-- User Management Feature -->
    <section class="users-section">
      <div class="section-header">
        <h2>Recent Users</h2>
        <a routerLink="/users">View all</a>
      </div>
      <app-user-management-container
        mode="compact"
        [maxItems]="10"
        (userSelected)="onUserSelected($event)">
      </app-user-management-container>
    </section>

    <!-- Notifications Feature -->
    <section class="notifications-section">
      <div class="section-header">
        <h2>Notifications</h2>
        <span class="unread-badge">3</span>
      </div>
      <app-notifications-container
        [maxItems]="5">
      </app-notifications-container>
    </section>
  </div>
</div>
```

Pure composition. Three features, one layout, zero logic.

```scss
// pages/admin-dashboard/admin-dashboard.scss
.dashboard-layout {
  padding: 2rem;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
}

.analytics-section {
  grid-column: 1 / -1; // Full width
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
```

Layout is a page concern. Features do not care where they are placed.

```ts
// pages/admin-dashboard/admin-dashboard.module.ts
@NgModule({
  declarations: [AdminDashboardPage],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', component: AdminDashboardPage }
    ]),
    // Import feature modules
    UserManagementModule,
    AnalyticsModule,
    NotificationsModule
  ]
})
export class AdminDashboardModule { }
```

The lazy-loaded page imports the features it needs.

## What we have achieved

### Reusability

The **user management** feature can be used on:

- the admin dashboard (compact mode, 10 users)
- the full user management page (full mode, all users)
- a user selection dialog (selection mode)
- a profile sidebar (compact mode, 1 user)

Same feature, different contexts, zero modifications.

The **analytics** feature works on the admin dashboard (summary mode), the
analytics page (full mode with charts) and a mobile app dashboard (summary
mode). The **notifications** feature appears on the dashboard (compact, 5
items), a header dropdown (compact, 3 items) and the notifications page (full,
all items).

### Testability

```ts
describe('UserManagementContainer', () => {
  it('should load users on init', () => {
    const facade = jasmine.createSpyObj('UserStoreFacade', ['loadRecentUsers']);
    const container = new UserManagementContainer(facade);

    container.ngOnInit();

    expect(facade.loadRecentUsers).toHaveBeenCalled();
  });
});
```

```ts
describe('AdminDashboardPage', () => {
  it('should navigate when user selected', () => {
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const page = new AdminDashboardPage(router);

    page.onUserSelected('user-123');

    expect(router.navigate).toHaveBeenCalledWith(['/users', 'user-123']);
  });
});
```

Clean, simple tests.

### Team workflow

- Developer A: user management feature
- Developer B: analytics feature
- Developer C: notifications feature
- Developer D: dashboard page composition

No conflicts. No waiting. Pure parallelisation.

### Maintainability

Six months later you need to add a filter to user management. Where do you look?
The `user-management` feature. Not scattered across five different pages.

Need to update the analytics chart? Analytics feature. One place, clear
boundary. Bug in notifications? Notifications feature. Isolated problem,
isolated fix.

## Alternative page layouts

Because features are composable, different layouts are trivial.

**Mobile dashboard (vertical stack):**

```html
<div class="mobile-layout">
  <app-analytics-container mode="summary"></app-analytics-container>
  <app-notifications-container [maxItems]="3"></app-notifications-container>
  <app-user-management-container mode="compact" [maxItems]="5"></app-user-management-container>
</div>
```

**Executive dashboard (different focus):**

```html
<div class="executive-layout">
  <app-analytics-container mode="full"></app-analytics-container>
  <!-- No users, no notifications - just analytics -->
</div>
```

**Custom client dashboard:**

```html
<div class="client-layout">
  <app-project-status-container></app-project-status-container>
  <app-billing-summary-container></app-billing-summary-container>
  <app-support-tickets-container></app-support-tickets-container>
</div>
```

Create new dashboards by combining and customising features.

## Key patterns demonstrated

**Container/component split** — containers handle logic and state, components
are pure presenters. Components stay highly reusable and easy to test.

**Facade pattern** — each feature exposes a simple facade. Pages use it for
programmatic actions. Internal complexity stays hidden.

**Input/output communication** — features expose inputs for configuration and
outputs for events. Pages coordinate but do not implement.

**Mode-based behaviour** — features support different modes via inputs. Same
feature, different contexts, no code duplication.

**Lazy loading** — pages are lazy-loaded routes. Features are imported by the
pages that need them. Optimal bundle sizes.

## Summary

**What we built:** a user management feature (complete CRUD capability), an
analytics feature (stats and charts), a notifications feature (real-time feed),
an admin dashboard page (pure composition), and alternative layouts (mobile,
executive, client).

**What we achieved:** features working in multiple contexts without
modification; a page with under 10 lines of business logic; simple, isolated
tests; a team able to work in parallel; predictable maintenance.

**What you should do next:** build one feature this way. See how it feels.
Experience the benefits firsthand. Then build another. And another.

Happy composing. 🎯

---

> [← PFC #4 — From Monolith to Composition](04-migration.md) ·
> [Back to the README](../README.md)
