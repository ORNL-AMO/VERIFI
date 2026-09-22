import { Component, EventEmitter, Output, computed, signal } from '@angular/core';
import { FuelTypeOption } from '@shared/fuel-options/fuelTypeOption';
import { STANDARD_FUEL_GROUPS, StandardFuelSelection, buildStandardFuelSelection } from '../custom-fuel.models';

@Component({
  selector: 'app-existing-fuel-picker',
  templateUrl: './existing-fuel-picker.component.html',
  styleUrls: ['./existing-fuel-picker.component.css'],
  standalone: false
})
export class ExistingFuelPickerComponent {
  @Output() selected = new EventEmitter<StandardFuelSelection>();
  @Output() cancelled = new EventEmitter<void>();

  readonly groups = STANDARD_FUEL_GROUPS;
  readonly groupId = signal(STANDARD_FUEL_GROUPS[0].id);
  readonly search = signal('');
  readonly group = computed(() => this.groups.find(group => group.id === this.groupId()) ?? this.groups[0]);
  readonly options = computed(() => {
    const search = this.search().trim().toLowerCase();
    return [...this.group().options]
      .filter(option => !search || option.value.toLowerCase().includes(search))
      .sort((first, second) => first.value.localeCompare(second.value));
  });

  setGroup(value: string): void {
    if (this.groups.some(group => group.id === value)) {
      this.groupId.set(value);
    }
  }

  setSearch(value: string): void {
    this.search.set(value);
  }

  select(option: FuelTypeOption): void {
    this.selected.emit(buildStandardFuelSelection(this.group(), option));
  }
}
