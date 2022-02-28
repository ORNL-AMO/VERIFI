import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { VisualizationStateService } from './visualization-state.service';
import * as _ from 'lodash';
import { IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';

@Component({
  selector: 'app-visualization',
  templateUrl: './visualization.component.html',
  styleUrls: ['./visualization.component.css']
})
export class VisualizationComponent implements OnInit {


  selectedChart: "splom" | "heatmap" | "timeseries";
  selectedChartSub: Subscription;
  metersSub: Subscription;
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
  constructor(private visualizationStateService: VisualizationStateService, private predictorDbService: PredictordbService,
    private utilityMeterDbService: UtilityMeterdbService, private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.selectedChartSub = this.visualizationStateService.selectedChart.subscribe(val => {
      this.selectedChart = val;
    });

    this.facilityPredictorsSub = this.predictorDbService.facilityPredictors.subscribe(predictors => {
      if (predictors) {
        this.visualizationStateService.setPredictorOptions(predictors);
      }
    });

    this.metersSub = this.utilityMeterDbService.facilityMeters.subscribe(facilityMeters => {
      if (facilityMeters) {
        this.visualizationStateService.setMeterOptions(facilityMeters);
        this.visualizationStateService.setMeterGroupOptions(facilityMeters);
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
    this.selectedChartSub.unsubscribe();
    this.facilityPredictorsSub.unsubscribe();
    this.metersSub.unsubscribe();
    this.meterOptionsSub.unsubscribe();
    this.predictorsOptionsSub.unsubscribe();
    this.plotDataSub.unsubscribe();
    this.meterGroupOptionsSub.unsubscribe();
    this.meterDataOptionSub.unsubscribe();
    this.utilityMeterDataSub.unsubscribe();
  }
}
