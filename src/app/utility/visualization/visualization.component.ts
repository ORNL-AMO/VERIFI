import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { VisualizationStateService } from './visualization-state.service';

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
  plotDataSub: Subscription;
  numberOfOptionsSelected: number;
  constructor(private visualizationStateService: VisualizationStateService, private predictorDbService: PredictordbService,
    private utilityMeterDbService: UtilityMeterdbService) { }

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
      }
    });

    this.meterOptionsSub = this.visualizationStateService.meterOptions.subscribe(() => {
      this.visualizationStateService.setData();
    });

    this.predictorsOptionsSub = this.visualizationStateService.predictorOptions.subscribe(() => {
      this.visualizationStateService.setData();
    });

    this.plotDataSub = this.visualizationStateService.plotData.subscribe(plotData => {
      this.numberOfOptionsSelected = plotData.length;
    });
  }

  ngOnDestroy() {
    this.selectedChartSub.unsubscribe();
    this.facilityPredictorsSub.unsubscribe();
    this.metersSub.unsubscribe();
    this.meterOptionsSub.unsubscribe();
    this.predictorsOptionsSub.unsubscribe();
    this.plotDataSub.unsubscribe();
  }


  setView(str: "splom" | "heatmap" | "timeseries"){
    this.visualizationStateService.selectedChart.next(str);
  }

}
