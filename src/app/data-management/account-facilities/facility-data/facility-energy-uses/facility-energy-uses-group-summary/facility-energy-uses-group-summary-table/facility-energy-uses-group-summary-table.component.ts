import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { EnergyFootprintGroup } from 'src/app/calculations/energy-footprint/energyFootprintGroup';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';

@Component({
  selector: 'app-facility-energy-uses-group-summary-table',
  standalone: false,
  templateUrl: './facility-energy-uses-group-summary-table.component.html',
  styleUrl: './facility-energy-uses-group-summary-table.component.css',
})
export class FacilityEnergyUsesGroupSummaryTableComponent {
  @Input({ required: true })
  energyFootprintGroup: EnergyFootprintGroup;
  @Input({ required: true })
  facility: IdbFacility;


  orderByField: string = 'equipmentName';
  orderByDir: 'asc' | 'desc' = 'asc';
  orderByYear: number;

  constructor(private router: Router) { }


  goToEquipment(equipmentGuid: string) {
    this.router.navigateByUrl('/data-management/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/energy-uses/' + this.energyFootprintGroup.groupId + '/equipment/' + equipmentGuid);
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
