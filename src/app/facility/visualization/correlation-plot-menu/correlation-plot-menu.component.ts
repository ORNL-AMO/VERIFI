import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { Month, Months } from 'src/app/shared/form-data/months';
import { CorrelationPlotOptions, VisualizationStateService } from '../visualization-state.service';

@Component({
  selector: 'app-correlation-plot-menu',
  templateUrl: './correlation-plot-menu.component.html',
  styleUrls: ['./correlation-plot-menu.component.css']
})
export class CorrelationPlotMenuComponent {


  years: Array<number>;
  months: Array<Month> = Months;
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;

  correlationPlotOptions: CorrelationPlotOptions;

  correlationPlotOptionsSub: Subscription;
  plotType: 'timeseries' | 'variance' | 'correlation';
  facility: IdbFacility;
  facilitySub: Subscription;
  constructor(private visualizationStateService: VisualizationStateService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService) {
  }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facility = val;
    });
    this.correlationPlotOptionsSub = this.visualizationStateService.correlationPlotOptions.subscribe(correlationPlotOptions => {
      this.setDateRange();
      this.years = this.utilityMeterDataDbService.getYearOptions();
      this.correlationPlotOptions = correlationPlotOptions;
    });
  }

  ngOnDestroy() {
    this.correlationPlotOptionsSub.unsubscribe();
    this.facilitySub.unsubscribe();
  }

  saveDateRange() {
    let minDate: Date = new Date(this.startYear, this.startMonth, 1);
    let maxDate: Date = new Date(this.endYear, this.endMonth, 1);
    this.visualizationStateService.dateRange.next({ minDate: minDate, maxDate: maxDate });
  }

  savePlotOptions() {
    this.visualizationStateService.correlationPlotOptions.next(this.correlationPlotOptions);
  }

  setDateRange() {
    let dateRange: { minDate: Date, maxDate: Date } = this.visualizationStateService.dateRange.getValue();
    if (dateRange) {
      this.startMonth = dateRange.minDate.getMonth();
      this.startYear = dateRange.minDate.getFullYear();
      this.endMonth = dateRange.maxDate.getMonth();
      this.endYear = dateRange.maxDate.getFullYear();
    }
  }

  async saveSiteOrSource() {
    await this.dbChangesService.updateFacilities(this.facility);
  }

  setTimeSeriesLeftAxis() {
    this.correlationPlotOptions.timeSeriesGroupYAxis1Options.forEach(option => {
      if (option.selected) {
        let sameOption: AxisOption = this.correlationPlotOptions.timeSeriesGroupYAxis2Options.find(option2 => {
          return option2.itemId == option.itemId;
        });
        sameOption.selected = false;
      }
    })
    this.correlationPlotOptions.timeSeriesMeterYAxis1Options.forEach(option => {
      if (option.selected) {
        let sameOption: AxisOption = this.correlationPlotOptions.timeSeriesMeterYAxis2Options.find(option2 => {
          return option2.itemId == option.itemId;
        });
        sameOption.selected = false;
      }
    })
    this.correlationPlotOptions.timeSeriesPredictorYAxis1Options.forEach(option => {
      if (option.selected) {
        let sameOption: AxisOption = this.correlationPlotOptions.timeSeriesPredictorYAxis2Options.find(option2 => {
          return option2.itemId == option.itemId;
        });
        sameOption.selected = false;
      }
    })

    this.savePlotOptions();
  }

  setTimeSeriesRightAxis() {
    this.correlationPlotOptions.timeSeriesGroupYAxis2Options.forEach(option => {
      if (option.selected) {
        let sameOption: AxisOption = this.correlationPlotOptions.timeSeriesGroupYAxis1Options.find(option2 => {
          return option2.itemId == option.itemId;
        });
        sameOption.selected = false;
      }
    })
    this.correlationPlotOptions.timeSeriesMeterYAxis2Options.forEach(option => {
      if (option.selected) {
        let sameOption: AxisOption = this.correlationPlotOptions.timeSeriesMeterYAxis1Options.find(option2 => {
          return option2.itemId == option.itemId;
        });
        sameOption.selected = false;
      }
    })
    this.correlationPlotOptions.timeSeriesPredictorYAxis2Options.forEach(option => {
      if (option.selected) {
        let sameOption: AxisOption = this.correlationPlotOptions.timeSeriesPredictorYAxis1Options.find(option2 => {
          return option2.itemId == option.itemId;
        });
        sameOption.selected = false;
      }
    })

    this.savePlotOptions();
  }
}

export interface AxisOption {
  itemId: string,
  label: string,
  type: 'meter' | 'meterGroup' | 'predictor',
  selected: boolean
}
