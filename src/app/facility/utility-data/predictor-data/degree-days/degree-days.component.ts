import { Component } from '@angular/core';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-degree-days',
  templateUrl: './degree-days.component.html',
  styleUrls: ['./degree-days.component.css']
})
export class DegreeDaysComponent {

  facility: IdbFacility;
  constructor(private facilityDbService: FacilitydbService, private dbChangesService: DbChangesService) {

  }

  ngOnInit() {
    this.facility = this.facilityDbService.selectedFacility.getValue();
    if (this.facility.includeDegreeDays == undefined) {
      this.facility.includeDegreeDays = false;
    }
  }

  async saveFacility() {
    await this.dbChangesService.updateFacilities(this.facility);
  }

  async toggleDegreeDays() {
    await this.saveFacility();

  }

  async changeHeatingDegreeDays() {
    await this.saveFacility();

  }

  async changeCoolingDegreeDays() {
    await this.saveFacility();

  }
}
