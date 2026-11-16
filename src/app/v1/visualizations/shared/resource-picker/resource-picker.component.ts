import { Component, DestroyRef, Input, OnChanges, computed, inject, input, output, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Subscription } from 'rxjs';
import type { IconName } from '@app/v1/shared/icons/icon-registry';

export interface ResourceOption { readonly guid: string; readonly label: string; readonly icon?: IconName; readonly unavailable?: boolean; readonly detail?: string; }

@Component({ selector: 'app-visualization-resource-picker', standalone: false,
  templateUrl: './resource-picker.component.html', styleUrls: ['../compact-controls.css', './resource-picker.component.css'] })
export class ResourcePickerComponent implements OnChanges {
  private readonly destroy = inject(DestroyRef);
  private subscription?: Subscription;
  @Input({ required: true }) control!: FormControl<string[]>;
  readonly label = input.required<string>();
  readonly options = input<readonly ResourceOption[]>([]);
  readonly icon = input<IconName>('meter');
  readonly disabled = input(false);
  readonly requestChanges = input(false);
  readonly selectionRequested = output<{ readonly guid: string; readonly selected: boolean }>();
  readonly selectionSetRequested = output<readonly string[]>();
  readonly filter = new FormControl('', { nonNullable: true });
  readonly query = signal('');
  private readonly selectedGuids = signal<readonly string[]>([]);
  private readonly choices = computed(() => {
    const selected = new Set(this.selectedGuids()), options = this.options();
    return [...options, ...this.selectedGuids().filter(guid => !options.some(option => option.guid === guid))
      .map<ResourceOption>(guid => ({ guid, label: `Unavailable: ${guid}`, unavailable: true, detail: '' }))]
      .map(option => ({ ...option, selected: selected.has(option.guid) }));
  });
  readonly allSelected = computed(() => this.options().length > 0 && this.options().every(option => this.selectedGuids().includes(option.guid)));
  readonly showSearch = computed(() => this.choices().length > 8 || !!this.query());
  readonly filtered = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    return this.choices().filter(option => !query || `${option.label} ${option.guid}`.toLocaleLowerCase().includes(query));
  });

  constructor() {
    this.filter.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(value => this.query.set(value));
    this.destroy.onDestroy(() => this.subscription?.unsubscribe());
  }

  ngOnChanges(): void {
    this.subscription?.unsubscribe();
    const update = () => this.selectedGuids.set(this.control.value);
    update(); this.subscription = this.control.events.subscribe(update);
  }

  toggle(guid: string): void {
    if (this.control.disabled || this.disabled()) return;
    const selected = this.control.value;
    if (this.requestChanges()) { this.selectionRequested.emit({ guid, selected: !selected.includes(guid) }); return; }
    this.control.markAsDirty();
    this.control.setValue(selected.includes(guid) ? selected.filter(value => value !== guid) : [...selected, guid]);
  }

  toggleAll(): void {
    if (this.control.disabled || this.disabled() || !this.options().length) return;
    const selected = this.allSelected() ? [] : [...new Set([...this.control.value, ...this.options().map(option => option.guid)])];
    if (this.requestChanges()) { this.selectionSetRequested.emit(selected); return; }
    this.control.markAsDirty(); this.control.setValue(selected);
  }
}
