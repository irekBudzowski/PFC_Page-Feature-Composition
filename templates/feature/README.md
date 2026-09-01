# Feature template

Copy this folder as the starting point for a new feature. Rename `<feature>` to
your feature name throughout.

**Before you copy it, size the feature:** describe it in one sentence without
using "and", and confirm it can be developed, tested and reused on its own. If
either test fails, take a smaller slice. Too small beats too big.

## Structure

```
features/<feature>/
├── components/                 # DUMB. Inputs in, events out. No services.
│   └── <thing>-card/
├── containers/                 # SMART. One or two, rarely more.
│   └── <feature>-container/
├── services/                   # PRIVATE. Never exported.
│   └── <feature>-api.service.ts
├── store/                      # PRIVATE. State + internal facade.
│   └── facade.ts
├── models/                     # Feature-private unless genuinely shared.
├── <feature>.facade.ts         # PUBLIC API. What pages may call.
├── <feature>.module.ts         # Exports the container. Nothing else.
└── index.ts                    # Exports module + public facade. Nothing else.
```

## The files

### `index.ts` — the contract

```ts
export * from './<feature>.module';
export * from './<feature>.facade';

// Deliberately NOT exported:
// ❌ the store facade      — pages would couple to your state library
// ❌ services              — pages would couple to your API shape
// ❌ components            — pages would couple to your internal UI
// ❌ store internals       — actions, reducers, effects, selectors
```

### `store/facade.ts` — internal facade, private

Wraps whatever state management this feature uses. Containers talk to this.
Pages never see it. Swapping NgRx for signals happens entirely behind this file.

```ts
@Injectable({ providedIn: 'root' })
export class <Feature>StoreFacade {
  readonly items$ = this.store.select(selectItems);
  readonly isLoading$ = this.store.select(selectIsLoading);

  constructor(private store: Store<State>) {}

  load(): void {
    this.store.dispatch(load());
  }
}
```

### `<feature>.facade.ts` — external facade, public

The contract pages hold. Keep it small: most pages never call it at all, because
they use the container.

```ts
@Injectable()
export class <Feature>Facade {
  readonly isLoading$ = this.storeFacade.isLoading$;

  constructor(private storeFacade: <Feature>StoreFacade) {}

  refresh(): void {
    this.storeFacade.load();
  }
}
```

### `containers/<feature>-container/` — smart

Owns data, state and interactions. Give it a `mode` input from the start if you
can already see a second context for this feature.

```ts
@Component({
  selector: 'app-<feature>-container',
  templateUrl: './<feature>.html'
})
export class <Feature>Container implements OnInit {
  @Input() mode: 'full' | 'compact' | 'selection' = 'full';
  @Input() maxItems?: number;
  @Output() itemSelected = new EventEmitter<string>();

  items$ = this.storeFacade.items$;
  isLoading$ = this.storeFacade.isLoading$;

  constructor(private storeFacade: <Feature>StoreFacade) {}

  ngOnInit(): void {
    this.storeFacade.load();
  }

  onSelect(id: string): void {
    this.itemSelected.emit(id);
  }
}
```

### `components/<thing>-card/` — dumb

No constructor injection. If you find yourself wanting a service here, this file
belongs in `containers/`.

```ts
@Component({
  selector: 'app-<thing>-card',
  templateUrl: './<thing>-card.component.html',
  styleUrls: ['./<thing>-card.component.scss']
})
export class <Thing>CardComponent {
  @Input() item: <Thing>;
  @Input() compact = false;

  @Output() select = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();

  onSelect(): void {
    this.select.emit(this.item.id);
  }
}
```

### `<feature>.module.ts`

```ts
@NgModule({
  imports: [CommonModule /* , StoreModule.forFeature(...), EffectsModule.forFeature(...) */],
  declarations: [<Feature>Container, <Thing>CardComponent],
  exports: [<Feature>Container],   // ONLY the container
  providers: [<Feature>Facade]
})
export class <Feature>Module {}
```

## Done when

- [ ] Containers smart, components dumb
- [ ] Both facades present
- [ ] Only module and facade exported from `index.ts`
- [ ] Services private
- [ ] No imports from another feature
- [ ] Modes supported via inputs
- [ ] Components unit tested
- [ ] Feature works in isolation
