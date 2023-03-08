import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
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

  facilityPredictorsSub: Subscription;
  meterOptionsSub: Subscription;
  predictorsOptionsSub: Subscription;
  meterGroupOptionsSub: Subscription;
  meterDataOptionSub: Subscription;
  plotDataSub: Subscription;
  meterGroupSub: Subscription;
  numberOfOptionsSelected: number;
  utilityMeterDataSub: Subscription;
  utilityMeterData: Array<IdbUtilityMeterData>;


  selectedFacilitySub: Subscription;
  selectedFacility: IdbFacility;
  constructor(private visualizationStateService: VisualizationStateService, private predictorDbService: PredictordbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.visualizationStateService.setCalanderizedMeters();
      this.initializeDate();
      this.visualizationStateService.initiliazeCorrelationPlotOptions();
      this.visualizationStateService.setMeterOptions();
      this.visualizationStateService.setMeterGroupOptions();
      this.visualizationStateService.setData();
    });

    this.facilityPredictorsSub = this.predictorDbService.facilityPredictors.subscribe(predictors => {
      if (predictors) {
        this.visualizationStateService.setPredictorOptions(predictors);
      }
    });

    this.meterOptionsSub = this.visualizationStateService.meterOptions.subscribe(() => {
      this.visualizationStateService.setData();
    });

    this.predictorsOptionsSub = this.visualizationStateService.predictorOptions.subscribe(() => {
      this.visualizationStateService.setData();
    });

    this.meterDataOptionSub = this.visualizationStateService.meterDataOption.subscribe(val => {
      this.visualizationStateService.setData();
    });

    this.meterGroupOptionsSub = this.visualizationStateService.meterGroupOptions.subscribe(val => {
      this.visualizationStateService.setData();
    })

    this.plotDataSub = this.visualizationStateService.plotData.subscribe(plotData => {
      this.numberOfOptionsSelected = plotData.length;
    });

    this.utilityMeterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(val => {
      this.utilityMeterData = val;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.facilityPredictorsSub.unsubscribe();
    this.meterOptionsSub.unsubscribe();
    this.predictorsOptionsSub.unsubscribe();
    this.plotDataSub.unsubscribe();
    this.meterGroupOptionsSub.unsubscribe();
    this.meterDataOptionSub.unsubscribe();
    this.utilityMeterDataSub.unsubscribe();
  }


  initializeDate(){
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
