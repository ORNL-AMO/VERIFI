import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { VisualizationStateService } from './visualization-state.service';
import * as _ from 'lodash';
import { IdbFacility, IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';

@Component({
  selector: 'app-visualization',
  templateUrl: './visualization.component.html',
  styleUrls: ['./visualization.component.css']
})
export class VisualizationComponent implements OnInit {


  selectedChart: "splom" | "heatmap" | "timeseries";
  selectedChartSub: Subscription;
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
      this.visualizationStateService.setMeterOptions();
      this.visualizationStateService.setMeterGroupOptions();
      this.visualizationStateService.setData();
    });


    this.selectedChartSub = this.visualizationStateService.selectedChart.subscribe(val => {
      this.selectedChart = val;
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
    this.selectedChartSub.unsubscribe();
    this.facilityPredictorsSub.unsubscribe();
    this.meterOptionsSub.unsubscribe();
    this.predictorsOptionsSub.unsubscribe();
    this.plotDataSub.unsubscribe();
    this.meterGroupOptionsSub.unsubscribe();
    this.meterDataOptionSub.unsubscribe();
    this.utilityMeterDataSub.unsubscribe();
  }
}
