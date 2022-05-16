import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { PlotDataItem } from 'src/app/models/visualization';
import * as _ from 'lodash';
import { Month, Months } from 'src/app/shared/form-data/months';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service'
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { VisualizationStateService } from '../visualization-state.service';
import { IdbFacility } from 'src/app/models/idb';
import { MeterGroupingService } from '../../utility-data/meter-grouping/meter-grouping.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';

@Component({
  selector: 'app-visualization-banner',
  templateUrl: './visualization-banner.component.html',
  styleUrls: ['./visualization-banner.component.css']
})
export class VisualizationBannerComponent implements OnInit {

  selectedChart: "splom" | "heatmap" | "timeseries";
  selectedChartSub: Subscription;
  months: Array<Month> = Months;
  minMonth: number;
  minYear: number;
  maxMonth: number;
  maxYear: number;
  years: Array<number>;
  plotDataSub: Subscription;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  modalOpen: boolean;
  modalOpenSub: Subscription;
  constructor(private visualizationStateService: VisualizationStateService,
    private facilityDbService: FacilitydbService, private meterGroupingService: MeterGroupingService,
    private sharedDataService: SharedDataService, private dbChangesService: DbChangesService) { }

  ngOnInit(): void {
    this.selectedChartSub = this.visualizationStateService.selectedChart.subscribe(val => {
      this.selectedChart = val;
    });

    this.plotDataSub = this.visualizationStateService.plotData.subscribe(plotData => {
      if (this.minMonth == undefined || this.minYear == undefined || this.maxMonth == undefined || this.maxYear == undefined) {
        this.setMinMaxDate(plotData);
      }
    });

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
    });

    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    })
  }

  ngOnDestroy() {
    this.plotDataSub.unsubscribe();
    this.selectedChartSub.unsubscribe();
    this.modalOpenSub.unsubscribe();
    this.visualizationStateService.dateRange.next({ minDate: undefined, maxDate: undefined });
    this.meterGroupingService.dateRange.next({ minDate: undefined, maxDate: undefined });
  }

  setView(str: "splom" | "heatmap" | "timeseries") {
    this.visualizationStateService.selectedChart.next(str);
  }

  setMinMaxDate(plotData: Array<PlotDataItem>) {
    let minDate: Date = new Date(_.min(plotData[0].valueDates));
    this.minYear = minDate.getUTCFullYear();
    this.minMonth = minDate.getUTCMonth();
    let maxDate: Date = new Date(_.max(plotData[0].valueDates));
    this.maxYear = maxDate.getUTCFullYear();
    this.maxMonth = maxDate.getUTCMonth();
    this.years = new Array();
    for (let year = this.minYear; year <= this.maxYear; year++) {
      this.years.push(year);
    }
  }

  setMinDate() {
    let minDate: Date = new Date(this.minYear, this.minMonth);
    let dateRange: { minDate: Date, maxDate: Date } = this.visualizationStateService.dateRange.getValue();
    dateRange.minDate = minDate;
    this.visualizationStateService.dateRange.next(dateRange);
    this.visualizationStateService.setData();
  }

  setMaxDate() {
    let maxDate: Date = new Date(this.maxYear, this.maxMonth);
    let dateRange: { minDate: Date, maxDate: Date } = this.visualizationStateService.dateRange.getValue();
    dateRange.maxDate = maxDate;
    this.visualizationStateService.dateRange.next(dateRange);
    this.visualizationStateService.setData();
  }

  async setFacilityEnergyIsSource(energyIsSource: boolean) {
    if (this.selectedFacility.energyIsSource != energyIsSource) {
      this.selectedFacility.energyIsSource = energyIsSource;
      await this.dbChangesService.updateFacilities(this.selectedFacility);
    }
  }
}
