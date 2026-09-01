# Framework translation

> **Note on provenance.** The five part series is written with Angular
> examples and states that the principles are framework-agnostic. This page is
> an **adaptation**, not part of the original series — it maps PFC's concepts
> onto other frameworks so teams outside Angular can apply the same
> architecture. The pattern is the author's; the mappings here are a
> translation of it.

## The concept map

| PFC concept | Angular | React | Vue 3 | Svelte |
|---|---|---|---|---|
| Feature | folder + `NgModule` | folder + barrel `index.ts` | folder + barrel `index.ts` | folder + barrel `index.ts` |
| Container (smart) | component with injected facade | component using the feature's hook | component using the feature's composable | component using the feature's store |
| Component (dumb) | `@Input()` / `@Output()` | props + callback props | `defineProps` / `defineEmits` | `export let` / `createEventDispatcher` |
| Internal store facade | `@Injectable` wrapping NgRx | store hook (Zustand/Redux) internal to the feature | `defineStore` (Pinia) internal to the feature | internal writable/derived store |
| External feature facade | `@Injectable` exported | exported hook, e.g. `useUserManagement()` | exported composable, e.g. `useUserManagement()` | exported store + action functions |
| Public API | `index.ts` exporting module + facade | `index.ts` exporting container + hook | `index.ts` exporting container + composable | `index.ts` exporting container + store |
| Feature modes | `@Input() mode` | `mode` prop | `mode` prop | `mode` prop |
| Page | routed component | route component | route component | `+page.svelte` |

## What does not change

The rules are identical in every framework, because they are about dependency
direction rather than syntax:

1. Pages may touch a feature's public surface only.
2. Features never import features.
3. A component that reaches for data is not a component.
4. Export as little as possible from a feature.
5. Features adapt through props/inputs, not forks.

## React

```
src/
├── features/
│   └── user-management/
│       ├── components/            # dumb: props in, callbacks out
│       │   └── UserCard.tsx
│       ├── containers/
│       │   └── UserManagementContainer.tsx
│       ├── api/
│       │   └── userApi.ts         # private
│       ├── store/
│       │   └── useUserStore.ts    # private — the internal facade
│       ├── model/
│       │   └── user.ts
│       ├── useUserManagement.ts   # PUBLIC facade (hook)
│       └── index.ts               # exports container + public hook only
├── pages/
│   └── DashboardPage.tsx
├── shared/
└── core/
```

```tsx
// features/user-management/index.ts
export { UserManagementContainer } from './containers/UserManagementContainer';
export { useUserManagement } from './useUserManagement';
// Nothing else. Not UserCard, not userApi, not useUserStore.
```

```tsx
// pages/DashboardPage.tsx — the page is composition and navigation only
export function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-grid">
      <AnalyticsContainer mode="summary" />
      <UserManagementContainer
        mode="compact"
        maxItems={10}
        onUserSelected={(id) => navigate(`/users/${id}`)}
      />
      <NotificationsContainer maxItems={5} />
    </div>
  );
}
```

The React equivalent of "a component that injects a service is not a component"
is: **a presentational component that calls `useQuery`, `useStore` or `fetch` is
a container.** Move it, or rename it.

## Vue 3

```vue
<!-- pages/DashboardPage.vue -->
<script setup lang="ts">
import { useRouter } from 'vue-router';
import { UserManagementContainer } from '@/features/user-management';
import { AnalyticsContainer } from '@/features/analytics';

const router = useRouter();
</script>

<template>
  <div class="dashboard-grid">
    <AnalyticsContainer mode="summary" />
    <UserManagementContainer
      mode="compact"
      :max-items="10"
      @user-selected="id => router.push(`/users/${id}`)"
    />
  </div>
</template>
```

The internal facade is a Pinia store kept private to the feature; the external
facade is a composable the feature exports.

## Svelte

```svelte
<!-- routes/dashboard/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { UserManagementContainer } from '$lib/features/user-management';
</script>

<div class="dashboard-grid">
  <UserManagementContainer
    mode="compact"
    maxItems={10}
    on:userSelected={e => goto(`/users/${e.detail}`)}
  />
</div>
```

## Enforcing boundaries per ecosystem

| Ecosystem | Tool |
|---|---|
| Any | `eslint-plugin-boundaries` |
| Nx monorepo | `@nx/enforce-module-boundaries` with tags like `type:feature`, `type:page` |
| TypeScript | path aliases that only expose feature barrels (`@features/user-management`) |
| Any | a CI grep asserting no `features/*/` imports another `features/*/` |

The tooling differs; the rule does not.
