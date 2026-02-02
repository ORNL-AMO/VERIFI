import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { EnergyFootprintFacility } from 'src/app/calculations/energy-footprint/energyFootprintFacility';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';

@Component({
  selector: 'app-facility-energy-uses-footprint-table',
  standalone: false,
  templateUrl: './facility-energy-uses-footprint-table.component.html',
  styleUrl: './facility-energy-uses-footprint-table.component.css',
})
export class FacilityEnergyUsesFootprintTableComponent {
  @Input({ required: true })
  energyFootprintFacility: EnergyFootprintFacility;
  @Input({ required: true })
  facility: IdbFacility;
  @Input({ required: true })
  tableType: 'source' | 'meterGroup';

  orderByField: string = 'name';
  orderByDir: 'asc' | 'desc' = 'asc';
  orderByYear: number;

  constructor(private router: Router, private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService) { }

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

  goToMeterGroup(groupGuid: string) {
    let facilityEnergyUseGroup: IdbFacilityEnergyUseGroup = this.facilityEnergyUseGroupsDbService.getByGuid(groupGuid);
    this.router.navigateByUrl('/data-management/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/energy-uses/' + facilityEnergyUseGroup.guid + '/footprint');
  }

  toggleCollapseGroup(groupId: string) {
    let groupResult = this.energyFootprintFacility.meterGroupsAnnualResults.find(g => g.meterGroupId == groupId);
    if (groupResult) {
      groupResult.showGroupResults = !groupResult.showGroupResults;
    }
  }

  toggleCollapseSource(source: MeterSource){
    let sourceResult = this.energyFootprintFacility.includedSourcesAnnualResults.find(s => s.source == source);
    if(sourceResult){
      sourceResult.showGroupResults = !sourceResult.showGroupResults;
    }
  }
}
