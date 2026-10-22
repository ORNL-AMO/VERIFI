import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, computed, signal, inject, Injector, afterNextRender } from '@angular/core';
import { FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { IdbFacility } from '@data/models/idbModels/facility';

@Component({
  selector: 'app-facility-picker',
  templateUrl: './facility-picker.component.html',
  styleUrls: ['./facility-picker.component.css'],
  standalone: false
})
export class FacilityPickerComponent {
  readonly overlayClasses = signal('v1-root v1-facility-picker__surface');
  private themeObserver?: MutationObserver;
  private readonly injector = inject(Injector);
  menuWidth = 240;
  private readonly facilitiesState = signal<readonly IdbFacility[]>([]);
  @Input() set facilities(value: readonly IdbFacility[]) { this.facilitiesState.set(value); }
  get facilities(): readonly IdbFacility[] { return this.facilitiesState(); }
  @Input() selectedFacility: IdbFacility | undefined;
  @Output() readonly facilitySelected = new EventEmitter<string>();

  @ViewChild('toggleButton') private readonly toggleButton?: ElementRef<HTMLButtonElement>;

  open = false;
  readonly search = new FormControl('', { nonNullable: true });
  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  readonly filteredFacilities = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.facilitiesState().map(facility => ({
      ...facility, location: [facility.city, facility.state].filter(Boolean).join(', ')
    })).filter(facility => !query || facility.name.toLowerCase().includes(query) || facility.location.toLowerCase().includes(query));
  });

  toggle(): void {
    if (!this.facilities.length) return;
    if (this.open) { this.close(); return; }
    this.open = true;
    this.search.setValue('');
    const root = this.toggleButton?.nativeElement.closest('.v1-root');
    const syncTheme = () => this.overlayClasses.set(['v1-root', 'v1-facility-picker__surface', ...[...(root?.classList ?? [])].filter(name => /^v1-(palette|theme|corners|contrast)-/.test(name))].join(' '));
    syncTheme();
    if (root && typeof MutationObserver !== 'undefined') {
      this.themeObserver = new MutationObserver(syncTheme);
      this.themeObserver.observe(root, { attributes: true, attributeFilter: ['class'] });
    }
    this.menuWidth = Math.max(240, this.toggleButton?.nativeElement.getBoundingClientRect().width ?? 240);
    afterNextRender(() => document.querySelector<HTMLInputElement>('.v1-facility-picker__menu input')?.focus(), { injector: this.injector });
  }

  close(): void {
    this.open = false;
    this.themeObserver?.disconnect();
    this.toggleButton?.nativeElement.focus();
  }

  select(facilityGuid: string): void {
    this.facilitySelected.emit(facilityGuid);
    this.close();
  }

  ngOnDestroy(): void { this.themeObserver?.disconnect(); }

  onMenuKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') { event.preventDefault(); this.close(); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('.v1-facility-picker__item')];
    if (!items.length) return;
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : event.key === 'ArrowDown' ? (current + 1) % items.length : current <= 0 ? items.length - 1 : current - 1;
    items[index].focus();
  }

  onEscape(): void {
    if (!this.open) {
      return;
    }
    this.close();
  }
}
