import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { EnergyUsesGroupSummary } from 'src/app/calculations/energy-footprint/energyUsesGroupSummary';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-energy-uses-group-summary-table',
  standalone: false,
  templateUrl: './facility-energy-uses-group-summary-table.component.html',
  styleUrl: './facility-energy-uses-group-summary-table.component.css',
})
export class FacilityEnergyUsesGroupSummaryTableComponent {
  @Input({ required: true })
  energyUsesGroupSummary: EnergyUsesGroupSummary;
  @Input({ required: true })
  facility: IdbFacility;


  orderByField: string = 'equipmentName';
  orderByDir: 'asc' | 'desc' = 'asc';
  orderByYear: number;

  constructor(private router: Router) { }


  goToEquipment(equipmentGuid: string) {
    this.router.navigateByUrl('/data-management/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/energy-uses/' + this.energyUsesGroupSummary.groupId + '/equipment/' + equipmentGuid);
  }

  setOrderDataField(str: string, year: number) {
    if (str == this.orderByField && year == this.orderByYear) {
      if (this.orderByDir == 'desc') {
        this.orderByDir = 'asc';
      } else {
        this.orderByDir = 'desc';
      }
    } else {
      this.orderByField = str;
      this.orderByYear = year;
    }
  }
}
