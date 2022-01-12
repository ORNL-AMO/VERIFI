import { Component, OnInit } from '@angular/core';
import { Month, Months } from 'src/app/form-data/months';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { EnergyUnitOptions, UnitOption } from 'src/app/shared/unitOptions';

@Component({
  selector: 'app-facility-setup',
  templateUrl: './facility-setup.component.html',
  styleUrls: ['./facility-setup.component.css']
})
export class FacilitySetupComponent implements OnInit {

  energyUnitOptions: Array<UnitOption> = EnergyUnitOptions;
  months: Array<Month> = Months;

  facility: IdbFacility;
  energyUnit: string;
  constructor(private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.energyUnit = this.facility.energyUnit;
  }

}
