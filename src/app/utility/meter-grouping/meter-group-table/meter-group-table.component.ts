import { Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { MeterGroupType } from 'src/app/models/calanderization';
import { IdbUtilityMeterGroup } from 'src/app/models/idb';

@Component({
  selector: 'app-meter-group-table',
  templateUrl: './meter-group-table.component.html',
  styleUrls: ['./meter-group-table.component.css']
})
export class MeterGroupTableComponent implements OnInit {
  @Input()
  meterGroupType: MeterGroupType;
  @Input()
  meterGroup: IdbUtilityMeterGroup;
  @Input()
  itemsPerPage: number;
  @Input()
  index: number;

  orderDataField: string = 'date';
  orderByDirection: string = 'desc';
  tablePageNumbers: Array<number>;
  energyUnit: string;
  waterUnit: string;
  consumptionUnit: string;
  selectedFacilitySub: Subscription;
  constructor(private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    if (this.meterGroup.combinedMonthlyData) {
      this.tablePageNumbers = this.meterGroup.combinedMonthlyData.map(() => { return 1 });
    }
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      if (selectedFacility) {
        this.waterUnit = selectedFacility.volumeLiquidUnit;
        this.energyUnit = selectedFacility.energyUnit;
      }
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }

  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }
}
