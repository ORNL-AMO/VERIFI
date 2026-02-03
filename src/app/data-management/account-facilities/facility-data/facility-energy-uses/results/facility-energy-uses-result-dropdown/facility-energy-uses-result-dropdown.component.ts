import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-energy-uses-result-dropdown',
  standalone: false,
  templateUrl: './facility-energy-uses-result-dropdown.component.html',
  styleUrl: './facility-energy-uses-result-dropdown.component.css',
})
export class FacilityEnergyUsesResultDropdownComponent {


  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  dropdownOpen: boolean = false;
  constructor(private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService
  ) { }

  ngOnInit() {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }

  async setFacilityEnergyIsSource() {
    await this.dbChangesService.updateFacilities(this.selectedFacility);
  }

  toggleDropdownMenuOpen() {
    this.dropdownOpen = !this.dropdownOpen;
  }

}
