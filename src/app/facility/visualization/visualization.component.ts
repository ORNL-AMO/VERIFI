import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { PlotDataItem } from 'src/app/models/visualization';
import { VisualizationStateService } from './visualization-state.service';
import * as _ from 'lodash';
import { MeterGroupingService } from '../utility-data/meter-grouping/meter-grouping.service';
import { Month, Months } from 'src/app/shared/form-data/months';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';

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
  // months: Array<Month> = Months;
  // minMonth: number;
  // minYear: number;
  // maxMonth: number;
  // maxYear: number;
  // years: Array<number>;
  // selectedFacility: IdbFacility;
  // selectedFacilitySub: Subscription;
  constructor(private visualizationStateService: VisualizationStateService, private predictorDbService: PredictordbService,
    private utilityMeterDbService: UtilityMeterdbService, private facilityDbService: FacilitydbService,
    private meterGroupingService: MeterGroupingService) { }

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
      // if (this.minMonth == undefined || this.minYear == undefined || this.maxMonth == undefined || this.maxYear == undefined) {
      //   this.setMinMaxDate(plotData);
      // }
    });

    // this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
    //   this.selectedFacility = selectedFacility;
    // });
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
    // this.visualizationStateService.dateRange.next({ minDate: undefined, maxDate: undefined });
    // this.meterGroupingService.dateRange.next({minDate: undefined, maxDate: undefined});
    // this.selectedFacilitySub.unsubscribe();
  }


  // setView(str: "splom" | "heatmap" | "timeseries") {
  //   this.visualizationStateService.selectedChart.next(str);
  // }

  // setMinMaxDate(plotData: Array<PlotDataItem>) {
  //   let minDate: Date = new Date(_.min(plotData[0].valueDates));
  //   this.minYear = minDate.getUTCFullYear();
  //   this.minMonth = minDate.getUTCMonth();
  //   let maxDate: Date = new Date(_.max(plotData[0].valueDates));
  //   this.maxYear = maxDate.getUTCFullYear();
  //   this.maxMonth = maxDate.getUTCMonth();
  //   this.years = new Array();
  //   for (let year = this.minYear; year <= this.maxYear; year++) {
  //     this.years.push(year);
  //   }
  // }

  // setMinDate() {
  //   let minDate: Date = new Date(this.minYear, this.minMonth);
  //   let dateRange: { minDate: Date, maxDate: Date } = this.visualizationStateService.dateRange.getValue();
  //   dateRange.minDate = minDate;
  //   this.visualizationStateService.dateRange.next(dateRange);
  //   this.visualizationStateService.setData();
  // }

  // setMaxDate() {
  //   let maxDate: Date = new Date(this.maxYear, this.maxMonth);
  //   let dateRange: { minDate: Date, maxDate: Date } = this.visualizationStateService.dateRange.getValue();
  //   dateRange.maxDate = maxDate;
  //   this.visualizationStateService.dateRange.next(dateRange);
  //   this.visualizationStateService.setData();
  // }

  // setFacilityEnergyIsSource(energyIsSource: boolean) {
  //   this.selectedFacility.energyIsSource = energyIsSource;
  //   this.facilityDbService.update(this.selectedFacility);
  // }
}
