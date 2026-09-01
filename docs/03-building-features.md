# PFC #3 — Building Bulletproof Features

**The internal architecture that actually scales**

> Part 3 of 5 · [← Pages as Orchestrators](02-pages-as-orchestrators.md) · [Next: Migration →](04-migration.md)

**TL;DR** — Features are self-contained mini-applications. Use the
container/component pattern (smart/dumb), expose a clean facade, keep internal
services private, and manage state with NgRx or signals. Only export what pages
need via `index.ts`. This makes features truly reusable across page contexts
without modification.

---

This is where the rubber meets the road. Get feature architecture right and your
app scales beautifully. Get it wrong and you are back to the spaghetti we are
trying to escape.

## The feature mission

A feature has one job: **own a complete business capability.**

Not "render a card". Not "call an API". Own the entire user management
capability. Or the product catalog. Or order processing. Everything related to
that domain lives in one place.

### What makes a good feature?

- **Self-contained** — everything it needs lives inside the feature folder
- **Focused** — one business domain, not "everything users-related ever"
- **Reusable** — works in different page contexts without modification
- **Testable** — can be tested in isolation
- **Encapsulated** — internal details hidden from pages

Think of features as npm packages you could theoretically publish. They should
be that independent.

## Feature anatomy

```
features/user-management/
├── components/                    # Dumb UI
│   ├── user-card/
│   │   ├── user-card.component.ts
│   │   ├── user-card.component.html
│   │   └── user-card.component.scss
│   └── user-form/
├── containers/                    # Smart orchestrators
│   └── user-management-container/
│       ├── user-management.container.ts
│       └── user-management.html
├── services/                      # Feature-specific services
│   └── user-api.service.ts
├── store/                         # State management
│   ├── actions.ts
│   ├── reducers.ts
│   ├── selectors.ts
│   ├── effects.ts
│   └── facade.ts                  # Internal store wrapper
├── models/
│   └── user.interface.ts
├── user-management.facade.ts      # PUBLIC API
├── user-management.module.ts
└── index.ts                       # Public exports only
```

## Containers vs components

This is the heart of feature architecture. Get this right and everything else
falls into place.

### Containers (smart components)

Containers orchestrate feature logic. They know about services, state and
business rules.

```ts
// features/user-management/containers/user-management-container/user-management.container.ts
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { User } from '../../models/user.interface';
import { UserStoreFacade } from '../../store/facade';

@Component({
  selector: 'app-user-management-container',
  templateUrl: './user-management.html'
})
export class UserManagementContainer implements OnInit {
  users$: Observable<User[]> = this.storeFacade.users$;
  isLoading$: Observable<boolean> = this.storeFacade.isLoading$;

  constructor(private storeFacade: UserStoreFacade) {}

  ngOnInit(): void {
    this.storeFacade.loadUsers();
  }

  onUserSelect(user: User): void {
    this.storeFacade.selectUser(user.id);
  }

  onUserDelete(user: User): void {
    if (confirm(`Delete ${user.name}?`)) {
      this.storeFacade.deleteUser(user.id);
    }
  }
}
```

**Container responsibilities:** fetch data via services or the store, handle
user interactions, manage feature-level state, coordinate multiple components,
expose observables to the template.

One container per feature is usually enough. Sometimes you need two or three for
complex features, but that is rare.

### Components (dumb / presentational)

Components render UI. No services, no state — just inputs and outputs.

```ts
// features/user-management/components/user-card/user-card.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from '../../models/user.interface';

@Component({
  selector: 'app-user-card',
  templateUrl: './user-card.component.html',
  styleUrls: ['./user-card.component.scss']
})
export class UserCardComponent {
  @Input() user: User;
  @Input() showActions = true;

  @Output() select = new EventEmitter<User>();
  @Output() delete = new EventEmitter<User>();

  onSelect(): void {
    this.select.emit(this.user);
  }

  onDelete(): void {
    this.delete.emit(this.user);
  }
}
```

```html
<!-- user-card.component.html -->
<div class="user-card" (click)="onSelect()">
  <img [src]="user.avatar" [alt]="user.name">
  <div class="user-info">
    <h3>{{ user.name }}</h3>
    <p>{{ user.email }}</p>
  </div>
  <button
    *ngIf="showActions"
    (click)="onDelete(); $event.stopPropagation()"
    class="delete-btn">
    Delete
  </button>
</div>
```

**Component responsibilities:** render UI based on inputs, emit events on user
interactions, apply styling, stay dumb and reusable.

> **The golden rule:** if a component injects a service, it is not dumb any
> more. Make it a container, or refactor.

### The container template

```html
<!-- user-management.html -->
<div class="user-management">
  <div class="loading" *ngIf="isLoading$ | async">
    Loading users...
  </div>

  <div class="user-list" *ngIf="!(isLoading$ | async)">
    <app-user-card
      *ngFor="let user of users$ | async"
      [user]="user"
      [showActions]="true"
      (select)="onUserSelect($event)"
      (delete)="onUserDelete($event)">
    </app-user-card>
  </div>
</div>
```

The container template coordinates components. That is it.

## The facade pattern

This is crucial. **Every feature needs two facades.**

### Internal store facade (private)

Wraps your state management. Used by containers inside the feature.

```ts
// features/user-management/store/facade.ts
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { User } from '../models/user.interface';
import * as userActions from './actions';
import * as userSelectors from './selectors';
import { State } from './reducers';

@Injectable({ providedIn: 'root' })
export class UserStoreFacade {
  readonly users$: Observable<User[]> = this.store.select(userSelectors.selectUsers);
  readonly isLoading$: Observable<boolean> = this.store.select(userSelectors.selectIsLoading);
  readonly selectedUser$: Observable<User | null> = this.store.select(userSelectors.selectSelectedUser);

  constructor(private store: Store<State>) {}

  loadUsers(): void {
    this.store.dispatch(userActions.loadUsers());
  }

  selectUser(userId: string): void {
    this.store.dispatch(userActions.selectUser({ userId }));
  }

  deleteUser(userId: string): void {
    this.store.dispatch(userActions.deleteUser({ userId }));
  }
}
```

**Not exported.** Containers use this directly.

### External feature facade (public)

A simple API for pages. Wraps the internal facade.

```ts
// features/user-management/user-management.facade.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { UserStoreFacade } from './store/facade';

@Injectable()
export class UserManagementFacade {
  readonly isLoading$: Observable<boolean> = this.storeFacade.isLoading$;

  constructor(private storeFacade: UserStoreFacade) {}

  // Pages can call these if needed
  loadUsers(): void {
    this.storeFacade.loadUsers();
  }

  refreshUsers(): void {
    this.storeFacade.loadUsers();
  }
}
```

**This gets exported.** Pages use it for programmatic actions.

### Why two facades?

**Separation of concerns** — internal facade is feature implementation detail;
external facade is a public API contract.

**Flexibility** — change internal state management (NgRx → signals) without
breaking pages. The internal facade can be complex; the external one stays
simple.

**Encapsulation** — pages only see what you want them to see. Internal
complexity stays hidden.

## State management

You have options. Pick what fits — and pick **one per feature**. Do not mix
approaches within a single feature.

### Option 1 — NgRx (recommended for complex features)

```ts
// store/actions.ts
export const loadUsers = createAction('[User Management] Load Users');
export const loadUsersSuccess = createAction(
  '[User Management] Load Users Success',
  props<{ users: User[] }>()
);

// store/reducers.ts
export const reducer = createReducer(
  initialState,
  on(loadUsers, state => ({ ...state, loading: true })),
  on(loadUsersSuccess, (state, { users }) => ({ ...state, users, loading: false }))
);

// store/effects.ts
loadUsers$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadUsers),
    switchMap(() =>
      this.userApi.getUsers().pipe(
        map(users => loadUsersSuccess({ users })),
        catchError(error => of(loadUsersFailure({ error })))
      )
    )
  )
);
```

**Use when:** complex state with multiple data sources; you need time-travel
debugging; a large team wants predictable patterns.

### Option 2 — Signals (simpler alternative)

```ts
// store/user.store.ts
@Injectable({ providedIn: 'root' })
export class UserStore {
  private usersSignal = signal<User[]>([]);
  private loadingSignal = signal(false);

  readonly users = this.usersSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();

  constructor(private userApi: UserApiService) {}

  loadUsers(): void {
    this.loadingSignal.set(true);
    this.userApi.getUsers().subscribe(users => {
      this.usersSignal.set(users);
      this.loadingSignal.set(false);
    });
  }
}
```

**Use when:** simpler state needs; you want less boilerplate; Angular 16+.

### Option 3 — Service with BehaviorSubject

```ts
// services/user-state.service.ts
@Injectable({ providedIn: 'root' })
export class UserStateService {
  private usersSubject = new BehaviorSubject<User[]>([]);
  private loadingSubject = new BehaviorSubject(false);

  readonly users$ = this.usersSubject.asObservable();
  readonly isLoading$ = this.loadingSubject.asObservable();

  constructor(private userApi: UserApiService) {}

  loadUsers(): void {
    this.loadingSubject.next(true);
    this.userApi.getUsers().subscribe(users => {
      this.usersSubject.next(users);
      this.loadingSubject.next(false);
    });
  }
}
```

**Use when:** simple features; you do not want NgRx overhead; familiar RxJS
patterns.

## Services

Feature-specific services stay private.

```ts
// services/user-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { User } from '../models/user.interface';

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private apiUrl = '/api/users';

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
```

**Not exported.** Only the store or state service uses this.

## Public API (`index.ts`)

This is your feature's contract with the outside world.

```ts
// features/user-management/index.ts
// Only export what pages need
export * from './user-management.module';
export * from './user-management.facade';

// Everything else stays private:
// ❌ UserStoreFacade
// ❌ UserApiService
// ❌ UserCardComponent
// ❌ Store internals (actions, reducers, effects)
// ❌ Models (unless other features need them)
```

> **Golden rule:** export as little as possible. Pages should only see the
> module (to import), the facade (for programmatic actions), and maybe types if
> shared across features. That is it.

## The module

```ts
// user-management.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { UserCardComponent } from './components/user-card/user-card.component';
import { UserManagementContainer } from './containers/user-management-container/user-management.container';
import { UserManagementFacade } from './user-management.facade';
import { UserEffects } from './store/effects';
import { featureKey, reducer } from './store/reducers';

@NgModule({
  imports: [
    CommonModule,
    EffectsModule.forFeature([UserEffects]),
    StoreModule.forFeature(featureKey, reducer)
  ],
  declarations: [
    UserCardComponent,
    UserManagementContainer
  ],
  exports: [
    UserManagementContainer  // Only export the container
  ],
  providers: [
    UserManagementFacade
  ]
})
export class UserManagementModule { }
```

Only export the container. Internal components stay private.

## Feature modes

Features should adapt to different contexts via **inputs**, not configuration.

```ts
@Component({
  selector: 'app-user-management-container',
  template: `...`
})
export class UserManagementContainer {
  @Input() mode: 'full' | 'compact' | 'selection' = 'full';
  @Input() maxItems?: number;
  @Input() showActions = true;

  @Output() userSelected = new EventEmitter<User>();
}
```

Usage on different pages:

```html
<!-- Dashboard: compact view -->
<app-user-management-container
  mode="compact"
  [maxItems]="5">
</app-user-management-container>

<!-- Admin: full view -->
<app-user-management-container
  mode="full">
</app-user-management-container>

<!-- Selection dialog -->
<app-user-management-container
  mode="selection"
  (userSelected)="handleSelection($event)">
</app-user-management-container>
```

Same feature, different contexts. No code changes needed.

## Common mistakes

### Mistake 1 — Exporting too much

❌ **Don't:**

```ts
export * from './components/user-card/user-card.component';
export * from './services/user-api.service';
export * from './store/actions';
```

These couple pages to your internals. Change the implementation, break the
pages.

✅ **Do:**

```ts
export * from './user-management.module';
export * from './user-management.facade';
```

### Mistake 2 — Smart components

❌ **Don't:** a component injecting services.

```ts
export class UserCardComponent {
  constructor(private userService: UserApiService) {}
}
```

✅ **Do:** a dumb component with inputs and outputs.

```ts
export class UserCardComponent {
  @Input() user: User;
  @Output() delete = new EventEmitter<User>();
}
```

### Mistake 3 — Feature-to-feature dependencies

❌ **Don't:**

```ts
import { ProductCatalogFacade } from '../product-catalog';
```

Features should be independent. If they need to communicate, let the page
coordinate.

### Mistake 4 — No facade

❌ **Don't:**

```ts
export * from './store/facade';
```

Always wrap internals in a feature facade. It gives you the freedom to change
the implementation.

## Testing strategy

**Test components in isolation:**

```ts
describe('UserCardComponent', () => {
  it('should emit select event on click', () => {
    const component = new UserCardComponent();
    const user = { id: '1', name: 'John' };
    component.user = user;

    spyOn(component.select, 'emit');
    component.onSelect();

    expect(component.select.emit).toHaveBeenCalledWith(user);
  });
});
```

**Test containers with a mocked facade:**

```ts
describe('UserManagementContainer', () => {
  let facade: jasmine.SpyObj<UserStoreFacade>;

  beforeEach(() => {
    facade = jasmine.createSpyObj('UserStoreFacade', ['loadUsers']);
  });

  it('should load users on init', () => {
    const container = new UserManagementContainer(facade);
    container.ngOnInit();

    expect(facade.loadUsers).toHaveBeenCalled();
  });
});
```

**Test feature integration:**

```ts
describe('UserManagementModule', () => {
  it('should render container with users', async () => {
    const fixture = TestBed.createComponent(UserManagementContainer);
    // Test full feature behaviour
  });
});
```

Clean architecture equals easy testing.

## The feature checklist

Before marking a feature "done":

- [ ] Containers handle smart logic, components stay dumb
- [ ] Internal store facade wraps state management
- [ ] External feature facade provides a simple API
- [ ] Only the module and facade are exported via `index.ts`
- [ ] Services are private to the feature
- [ ] No dependencies on other features
- [ ] Container supports different modes via inputs
- [ ] All components have unit tests
- [ ] Feature works in isolation

## Summary

- ✅ Use the container/component pattern (smart/dumb)
- ✅ Two facades: internal (store) plus external (feature)
- ✅ Pick one state approach per feature
- ✅ Keep services private
- ✅ Export a minimal API via `index.ts`
- ✅ Support multiple modes via inputs
- ✅ Test components and containers separately

## Your challenge

Pick one feature from your current codebase:

1. Can you identify what should be containers vs components?
2. What would you expose via the facade?
3. What services should stay private?
4. How many "modes" does it need to support?

---

> [← PFC #2 — Pages as Orchestrators](02-pages-as-orchestrators.md) ·
> [Next: PFC #4 — From Monolith to Composition →](04-migration.md)
