import { Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { ElectricityDataFilter, UtilityMeterDataService } from '../utility-meter-data.service';

@Component({
  selector: 'app-electricity-data-table',
  templateUrl: './electricity-data-table.component.html',
  styleUrls: ['./electricity-data-table.component.css', '../utility-meter-data.component.css']
})
export class ElectricityDataTableComponent implements OnInit {
  @Input()
  meterListItem: {
    idbMeter: IdbUtilityMeter,
    meterDataItems: Array<IdbUtilityMeterData>
  };
  @Input()
  pageSize: Array<number>;
  @Input()
  itemsPerPage: number;
  @Input()
  meterIndex: number;


  electricityDataFilters: Array<ElectricityDataFilter>;
  electricityDataFilterSub: Subscription;
  constructor(private utilityMeterDataService: UtilityMeterDataService) { }

  ngOnInit(): void {
    this.electricityDataFilterSub = this.utilityMeterDataService.electricityDataFilters.subscribe(electricityDataFilters => {
      this.electricityDataFilters = electricityDataFilters;
    });
  }

  ngOnDestroy() {
    this.electricityDataFilterSub.unsubscribe();
  }
}
