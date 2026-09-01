# Dependency rules

The import graph on one page. These constraints are what make PFC hold; they are
stated across all five parts of the series and collected here because they are
the part that gets broken first, usually under deadline.

## The table

| From | May depend on | Must never depend on |
|---|---|---|
| **Page** | A feature's **module** and **public facade**; `shared/`; `core/` | Any feature internal — container class, components, services, store, actions, selectors |
| **Feature** | `shared/`; `core/` | **Another feature.** Ever. |
| **Container** | Its own feature's store facade, services, models, components | Anything belonging to another feature |
| **Component** (dumb) | Its `@Input()`s and `@Output()`s; its own template and styles | **Any injected service.** If it injects one it is no longer a component |
| **Shared** | Nothing above it | Features, pages, core business logic |
| **Core** | Framework and third-party only | Features, pages |

## The three rules people break

### 1. Pages may touch only the module and the public facade

A page importing `UserStoreFacade`, `UserApiService`, or `UserCardComponent` has
coupled itself to your internals. The moment you change the implementation, the
page breaks — which is precisely the coupling PFC exists to prevent.

```ts
// ❌ Page reaching into feature internals
import { UserStoreFacade } from '../../features/user-management/store/facade';

// ✅ Page using the public surface
import { UserManagementModule, UserManagementFacade } from '../../features/user-management';
```

If a page needs something the facade does not expose, the fix is to widen the
facade deliberately — not to reach around it.

### 2. Features never import features

```ts
// ❌ Inside features/order-processing/
import { ProductCatalogFacade } from '../product-catalog';
```

This is the violation that quietly undoes the whole architecture. Once two
features are coupled, neither can be tested, moved or reused independently, and
you are back to spaghetti with extra folders.

When two features need to interact, **the page carries the value between them**:
B emits an output, the page holds it, the page passes it into A as an input.

```html
<app-date-picker-container (dateRangeChanged)="range = $event"></app-date-picker-container>
<app-sales-chart-container [dateRange]="range"></app-sales-chart-container>
```

If coordinating through the page feels absurd because the two are inseparable,
that is your signal they are **one feature**, not two.

### 3. A component that injects a service is not a component

```ts
// ❌ This is a container wearing the wrong label
export class UserCardComponent {
  constructor(private userService: UserApiService) {}
}

// ✅ Dumb: data in, events out
export class UserCardComponent {
  @Input() user: User;
  @Output() delete = new EventEmitter<User>();
}
```

Either move the logic up into the container, or accept that this file is a
container and put it in `containers/`.

## Corollaries worth stating

- **Features never reach into each other's components.** Shared UI belongs in
  `shared/`. If two features need the same card, it is a shared component or
  they are one feature.
- **Authentication is `core/`, not a feature.** Features may inject auth
  services when they need them.
- **Models are feature-private by default.** Move one to `shared/` only when a
  second feature genuinely needs it.
- **The internal store facade is never exported.** Exporting it forfeits your
  ability to swap NgRx for signals later without touching a single page.

## Enforcing it

Reviews catch most of it, but tooling catches it every time. Two options that
work well:

**ESLint boundaries** — `eslint-plugin-boundaries` or
`@nx/enforce-module-boundaries` can express "pages may not import feature
internals" and "features may not import features" as lint rules that fail CI.

**A convention check** — even a grep in CI is better than nothing:

```bash
# Fail if any feature imports another feature
grep -rn "from '\.\./\.\./features/" src/app/features/ && exit 1
```

The rules are simple enough that automated enforcement is cheap, and valuable
enough that it is worth doing before the first violation rather than after the
twentieth.
