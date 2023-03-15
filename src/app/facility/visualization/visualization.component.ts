import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { VisualizationStateService } from './visualization-state.service';
import * as _ from 'lodash';
import { IdbFacility, IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';

@Component({
  selector: 'app-visualization',
  templateUrl: './visualization.component.html',
  styleUrls: ['./visualization.component.css']
})
export class VisualizationComponent implements OnInit {


  utilityMeterDataSub: Subscription;
  utilityMeterData: Array<IdbUtilityMeterData>;


  selectedFacilitySub: Subscription;
  selectedFacility: IdbFacility;
  constructor(private visualizationStateService: VisualizationStateService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      if (!this.selectedFacility) {
        this.selectedFacility = val;
        this.visualizationStateService.setCalanderizedMeters();
        this.initializeDate();
        this.visualizationStateService.initilizeCorrelationPlotOptions();
      } else {
        this.visualizationStateService.setCalanderizedMeters();
      }
      if (this.selectedFacility.guid != val.guid) {
        this.selectedFacility = val;
        this.initializeDate();
        this.visualizationStateService.initilizeCorrelationPlotOptions();
      }
    });

    this.utilityMeterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(val => {
      this.utilityMeterData = val;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.utilityMeterDataSub.unsubscribe();
  }


  initializeDate() {
    let calanderizedMeters: Array<CalanderizedMeter> = this.visualizationStateService.calanderizedMeters;
    let monthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(cMeter => {
      return cMeter.monthlyData;
    })
    let dates: Array<Date> = monthlyData.map(mData => {
      let date: Date = new Date(mData.date);
      return date;
    });
    let maxDate: Date = _.max(dates);
    let minDate: Date = _.min(dates);
    maxDate.setMonth(maxDate.getMonth() - 1)
    this.visualizationStateService.dateRange.next({
      maxDate: maxDate,
      minDate: minDate
    });
  }
}
