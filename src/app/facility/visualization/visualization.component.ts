import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { VisualizationStateService } from './visualization-state.service';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { AnalyticsService } from 'src/app/analytics/analytics.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
    selector: 'app-visualization',
    templateUrl: './visualization.component.html',
    styleUrls: ['./visualization.component.css'],
    standalone: false
})
export class VisualizationComponent implements OnInit {


  utilityMeterDataSub: Subscription;
  utilityMeterData: Array<IdbUtilityMeterData>;


  selectedFacilitySub: Subscription;
  selectedFacility: IdbFacility;
  constructor(private visualizationStateService: VisualizationStateService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityDbService: FacilitydbService,
    private analyticsService: AnalyticsService) { }

  ngOnInit(): void {
    this.analyticsService.sendEvent('use_data_visualization');
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
      this.visualizationStateService.setCalanderizedMeters(this.selectedFacility);
      this.initializeDate();
      this.visualizationStateService.initilizeCorrelationPlotOptions();
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
    if (calanderizedMeters.length > 0) {
      let monthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(cMeter => {
        return cMeter.monthlyData;
      })
      if (monthlyData.length > 0) {
        let dates: Array<Date> = monthlyData.map(mData => {
          let date: Date = new Date(mData.date);
          return date;
        });
        let maxDate: Date = _.max(dates);
        let minDate: Date = _.min(dates);
        this.visualizationStateService.dateRange.next({
          maxDate: maxDate,
          minDate: minDate
        });
      } else {
        this.visualizationStateService.dateRange.next(undefined);
      }
    } else {
      this.visualizationStateService.dateRange.next(undefined);
    }
  }
}
