# Page template

Copy this as the starting point for a new page. A page arranges features and
handles navigation. It owns no business logic.

## Structure

```
pages/<page>/
├── <page>.page.ts       # Under 50 lines. Navigation and route state only.
├── <page>.html          # Composition: feature containers in a layout.
├── <page>.scss          # Layout. A page concern; features do not care.
└── <page>.module.ts     # Route + the feature modules this page composes.
```

## The files

### `<page>.page.ts`

```ts
@Component({
  templateUrl: './<page>.html',
  styleUrls: ['./<page>.scss']
})
export class <Page>Page {
  // Route-specific state ONLY: active tab, current step, current selection.
  // NOT filters, NOT sort options, NOT feature data.
  activeTab = 'overview';

  constructor(private router: Router) {}

  onItemSelected(id: string): void {
    this.router.navigate(['/items', id]);
  }
}
```

If this file passes 50 lines, something in it belongs in a feature.

### `<page>.html` — composition

```html
<div class="<page>-layout">
  <header class="<page>-header">
    <h1>Page title</h1>
  </header>

  <div class="<page>-grid">
    <section>
      <app-analytics-container mode="summary"></app-analytics-container>
    </section>

    <section>
      <h2>Recent items</h2>
      <app-<feature>-container
        mode="compact"
        [maxItems]="10"
        (itemSelected)="onItemSelected($event)">
      </app-<feature>-container>
    </section>
  </div>
</div>
```

### `<page>.module.ts`

```ts
@NgModule({
  declarations: [<Page>Page],
  imports: [
    CommonModule,
    RouterModule.forChild([{ path: '', component: <Page>Page }]),
    // Import the features this page composes — via their barrels
    <Feature>Module,
    AnalyticsModule
  ]
})
export class <Page>Module {}
```

## Composition patterns

**Grid** — features in a CSS grid. The default.

**Tabs** — the page holds `activeTab`; features never know tabs exist.

```html
<app-a-container *ngIf="activeTab === 'a'"></app-a-container>
<app-b-container *ngIf="activeTab === 'b'"></app-b-container>
```

**Master-detail** — one feature emits, the page passes it to the other.

```html
<app-list-container (itemSelected)="selectedId = $event"></app-list-container>
<app-detail-container *ngIf="selectedId" [itemId]="selectedId"></app-detail-container>
```

**Multi-step flow** — the page holds `currentStep`; each step is a feature.

## Done when

- [ ] Under 50 lines of code
- [ ] Zero business logic
- [ ] No API calls
- [ ] State delegated to features
- [ ] Feature containers doing the heavy lifting
- [ ] Template declarative and easy to scan
- [ ] Page state limited to route-specific things
