import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, computed, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { IdbFacility } from '@data/models/idbModels/facility';

const SEARCH_THRESHOLD = 5;

@Component({
  selector: 'app-facility-picker',
  templateUrl: './facility-picker.component.html',
  styleUrls: ['./facility-picker.component.css'],
  standalone: false
})
export class FacilityPickerComponent {
  private readonly facilitiesState = signal<readonly IdbFacility[]>([]);
  @Input() set facilities(value: readonly IdbFacility[]) { this.facilitiesState.set(value); }
  get facilities(): readonly IdbFacility[] { return this.facilitiesState(); }
  @Input() selectedFacility: IdbFacility | undefined;
  @Output() readonly facilitySelected = new EventEmitter<string>();

  @ViewChild('toggleButton') private readonly toggleButton?: ElementRef<HTMLButtonElement>;

  open = false;
  readonly search = new FormControl('', { nonNullable: true });
  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  readonly showSearch = computed(() => this.facilitiesState().length > SEARCH_THRESHOLD);
  readonly filteredFacilities = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.facilitiesState().map(facility => ({
      ...facility, location: [facility.city, facility.state].filter(Boolean).join(', ')
    })).filter(facility => !query || facility.name.toLowerCase().includes(query) || facility.location.toLowerCase().includes(query));
  });

  toggle(): void {
    this.open = !this.open;
    if (this.open) {
      this.search.setValue('');
    }
  }

  close(): void {
    this.open = false;
  }

  select(facilityGuid: string): void {
    this.facilitySelected.emit(facilityGuid);
    this.close();
  }

  onEscape(): void {
    if (!this.open) {
      return;
    }
    this.close();
    this.toggleButton?.nativeElement.focus();
  }
}
