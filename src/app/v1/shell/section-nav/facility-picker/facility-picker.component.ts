import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { IdbFacility } from '@data/models/idbModels/facility';

const SEARCH_THRESHOLD = 5;

@Component({
  selector: 'app-facility-picker',
  templateUrl: './facility-picker.component.html',
  styleUrls: ['./facility-picker.component.css'],
  standalone: false
})
export class FacilityPickerComponent {
  @Input() facilities: ReadonlyArray<IdbFacility> = [];
  @Input() selectedFacility: IdbFacility | undefined;
  @Output() readonly facilitySelected = new EventEmitter<string>();

  @ViewChild('toggleButton') private readonly toggleButton?: ElementRef<HTMLButtonElement>;

  open = false;
  search = '';

  get showSearch(): boolean {
    return this.facilities.length > SEARCH_THRESHOLD;
  }

  get filteredFacilities(): ReadonlyArray<IdbFacility> {
    const query = this.search.trim().toLowerCase();
    if (!query) {
      return this.facilities;
    }
    return this.facilities.filter(facility =>
      facility.name.toLowerCase().includes(query) ||
      this.facilityLocation(facility).toLowerCase().includes(query));
  }

  facilityLocation(facility: IdbFacility): string {
    return [facility.city, facility.state].filter(part => !!part).join(', ');
  }

  toggle(): void {
    this.open = !this.open;
    if (this.open) {
      this.search = '';
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
