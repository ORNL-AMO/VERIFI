import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { Month, Months } from 'src/app/shared/form-data/months';
import { CorrelationPlotOptions, VisualizationStateService } from '../../visualization-state.service';

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
  constructor(private visualizationStateService: VisualizationStateService,
    private utilityMeterDataDbService: UtilityMeterDatadbService) {
  }

  ngOnInit() {
    this.correlationPlotOptionsSub = this.visualizationStateService.correlationPlotOptions.subscribe(correlationPlotOptions => {
      this.setDateRange();
      this.years = this.utilityMeterDataDbService.getYearOptions(false);
      this.correlationPlotOptions = correlationPlotOptions;
    });
  }

  ngOnDestroy(){
    this.correlationPlotOptionsSub.unsubscribe();
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
}

export interface AxisOption {
  itemId: string,
  label: string,
  type: 'meter' | 'meterGroup' | 'predictor',
  selected: boolean
}
