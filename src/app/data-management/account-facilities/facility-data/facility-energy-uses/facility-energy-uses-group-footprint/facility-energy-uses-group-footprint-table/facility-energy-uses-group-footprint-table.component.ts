import { Component, Input } from '@angular/core';
import { EnergyFootprintGroup } from 'src/app/calculations/energy-footprint/energyFootprintGroup';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Component({
  selector: 'app-facility-energy-uses-group-footprint-table',
  standalone: false,
  templateUrl: './facility-energy-uses-group-footprint-table.component.html',
  styleUrl: './facility-energy-uses-group-footprint-table.component.css',
})
export class FacilityEnergyUsesGroupFootprintTableComponent {
  @Input({ required: true })
  energyFootprintGroup: EnergyFootprintGroup;
  @Input({ required: true })
  facility: IdbFacility;
  @Input({ required: true })
  tableType: 'source' | 'meterGroup';


  orderByField: string = 'equipmentName';
  orderByDir: 'asc' | 'desc' = 'asc';
  orderByYear: number;

  meters: Array<IdbUtilityMeter>;

  constructor(private utilityMeterDbService: UtilityMeterdbService){}

  ngOnInit(){
    this.meters = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(this.facility.guid);
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
