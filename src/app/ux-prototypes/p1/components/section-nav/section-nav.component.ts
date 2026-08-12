import { Component, inject } from '@angular/core';
import { P1RouteFacade } from '../../p1-route.facade';

@Component({
  selector: 'app-p1-section-nav',
  templateUrl: './section-nav.component.html',
  styleUrls: ['./section-nav.component.css'],
  standalone: false
})
export class P1SectionNavComponent {
  readonly facade = inject(P1RouteFacade);

  facilityPickerOpen = false;
  facilitySearch = '';

  get filteredFacilities() {
    const q = this.facilitySearch.trim().toLowerCase();
    const all = this.facade.accountFacilities();
    return q ? all.filter(f => f.name.toLowerCase().includes(q) || f.location?.toLowerCase().includes(q)) : all;
  }

  get showFacilitySearch(): boolean {
    return this.facade.accountFacilities().length > 5;
  }

  toggleFacilityPicker(): void {
    this.facilityPickerOpen = !this.facilityPickerOpen;
    if (this.facilityPickerOpen) {
      this.facilitySearch = '';
    }
  }

  selectFacility(id: string): void {
    this.facade.setFacility(id);
    this.facilityPickerOpen = false;
  }

  switchToFacilityContext(): void {
    const facilities = this.facade.accountFacilities();
    if (facilities.length === 1) {
      this.facade.setFacility(facilities[0].id);
    } else {
      this.facade.setContext('facility');
    }
  }
}
