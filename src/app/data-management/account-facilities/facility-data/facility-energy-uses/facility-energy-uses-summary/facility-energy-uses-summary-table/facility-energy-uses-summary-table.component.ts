import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { EnergyUsesFacilitySummary } from 'src/app/calculations/energy-footprint/energyUsesFacilitySummary';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-energy-uses-summary-table',
  standalone: false,
  templateUrl: './facility-energy-uses-summary-table.component.html',
  styleUrl: './facility-energy-uses-summary-table.component.css',
})
export class FacilityEnergyUsesSummaryTableComponent {
  @Input({ required: true })
  energyUsesFacilitySummary: EnergyUsesFacilitySummary;
  @Input({ required: true })
  facility: IdbFacility;

  orderByField: string = 'groupName';
  orderByDir: 'asc' | 'desc' = 'asc';
  orderByYear: number;

  constructor(private router: Router) { }

  goToGroup(groupId: string) {
    this.router.navigateByUrl('/data-management/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/energy-uses/' + groupId + '/summary');
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
