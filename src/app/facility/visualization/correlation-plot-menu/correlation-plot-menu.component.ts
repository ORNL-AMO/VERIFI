import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { Month, Months } from 'src/app/shared/form-data/months';
import { CorrelationPlotOptions, VisualizationStateService } from '../visualization-state.service';
import { MonthlyData } from 'src/app/models/calanderization';
import * as _ from 'lodash';

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
  disableY1SelectedTotal: boolean;
  disableY2SelectedTotal: boolean;
  constructor(private visualizationStateService: VisualizationStateService,
    private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService) {
  }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facility = val;
      this.setYears();
    });
    this.correlationPlotOptionsSub = this.visualizationStateService.correlationPlotOptions.subscribe(correlationPlotOptions => {
      this.setDateRange();
      this.correlationPlotOptions = correlationPlotOptions;
      this.setDisableBools();
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
    let hasSelectedY1Group: boolean = false;
    this.correlationPlotOptions.timeSeriesGroupYAxis1Options.forEach(option => {
      if (option.selected) {
        hasSelectedY1Group = true;
        let sameOption: AxisOption = this.correlationPlotOptions.timeSeriesGroupYAxis2Options.find(option2 => {
          return option2.itemId == option.itemId;
        });
        sameOption.selected = false;
      }
    });
    let hasSelectedY1Meter: boolean = false
    this.correlationPlotOptions.timeSeriesMeterYAxis1Options.forEach(option => {
      if (option.selected) {
        hasSelectedY1Meter = true;
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
    });
    if ((this.correlationPlotOptions.asMeters && !hasSelectedY1Meter) || (!this.correlationPlotOptions.asMeters && !hasSelectedY1Group)) {
      this.correlationPlotOptions.totalSelectedEnergyTimeSeriesYAxis1 = false;
    }

    if (this.correlationPlotOptions.totalEnergyTimeSeriesYAxis1) {
      this.correlationPlotOptions.totalEnergyTimeSeriesYAxis2 = false;
    }

    if (this.correlationPlotOptions.totalSelectedEnergyTimeSeriesYAxis1) {
      this.correlationPlotOptions.totalSelectedEnergyTimeSeriesYAxis2 = false;
    }

    // this.setDisableBools();
    this.savePlotOptions();
  }

  setTimeSeriesRightAxis() {
    let hasSelectedY2Group: boolean = false;
    this.correlationPlotOptions.timeSeriesGroupYAxis2Options.forEach(option => {
      if (option.selected) {
        hasSelectedY2Group = true;
        let sameOption: AxisOption = this.correlationPlotOptions.timeSeriesGroupYAxis1Options.find(option2 => {
          return option2.itemId == option.itemId;
        });
        sameOption.selected = false;
      }
    });
    let hasSelectedY2Meter: boolean = false
    this.correlationPlotOptions.timeSeriesMeterYAxis2Options.forEach(option => {
      if (option.selected) {
        hasSelectedY2Meter = true;
        let sameOption: AxisOption = this.correlationPlotOptions.timeSeriesMeterYAxis1Options.find(option2 => {
          return option2.itemId == option.itemId;
        });
        sameOption.selected = false;
      }
    });
    if ((this.correlationPlotOptions.asMeters && !hasSelectedY2Meter) || (!this.correlationPlotOptions.asMeters && !hasSelectedY2Group)) {
      this.correlationPlotOptions.totalSelectedEnergyTimeSeriesYAxis2 = false;
    }


    this.correlationPlotOptions.timeSeriesPredictorYAxis2Options.forEach(option => {
      if (option.selected) {
        let sameOption: AxisOption = this.correlationPlotOptions.timeSeriesPredictorYAxis1Options.find(option2 => {
          return option2.itemId == option.itemId;
        });
        sameOption.selected = false;
      }
    });

    if (this.correlationPlotOptions.totalEnergyTimeSeriesYAxis2) {
      this.correlationPlotOptions.totalEnergyTimeSeriesYAxis1 = false;
    }

    if (this.correlationPlotOptions.totalSelectedEnergyTimeSeriesYAxis2) {
      this.correlationPlotOptions.totalSelectedEnergyTimeSeriesYAxis1 = false;
    }
    this.savePlotOptions();
  }


  setDisableBools() {
    if (this.correlationPlotOptions.asMeters) {
      let hasSelectedY1Meter = this.correlationPlotOptions.timeSeriesMeterYAxis1Options.find(option => {
        return option.selected == true;
      });
      this.disableY1SelectedTotal = (hasSelectedY1Meter == undefined);
      let hasSelectedY2Meter = this.correlationPlotOptions.timeSeriesMeterYAxis2Options.find(option => {
        return option.selected == true;
      });
      this.disableY2SelectedTotal = (hasSelectedY2Meter == undefined);
    } else {
      let hasSelectedY1Meter = this.correlationPlotOptions.timeSeriesGroupYAxis1Options.find(option => {
        return option.selected == true;
      });
      this.disableY1SelectedTotal = (hasSelectedY1Meter == undefined);
      let hasSelectedY2Meter = this.correlationPlotOptions.timeSeriesGroupYAxis2Options.find(option => {
        return option.selected == true;
      });
      this.disableY2SelectedTotal = (hasSelectedY2Meter == undefined);
    }
  }

  setYears() {
    let combinedMonthlyData: Array<MonthlyData> = this.visualizationStateService.calanderizedMeters.flatMap(cMeter => { return cMeter.monthlyData });
    let allYears: Array<number> = combinedMonthlyData.flatMap(monthlyData => { return monthlyData.year });
    allYears = _.uniq(allYears);
    this.years = allYears;
  }
}

export interface AxisOption {
  itemId: string,
  label: string,
  type: 'meter' | 'meterGroup' | 'predictor',
  selected: boolean
}
