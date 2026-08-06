import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, OnInit, inject, computed } from '@angular/core';
import { Subscription } from 'rxjs';
import { VisualizationStateService } from './visualization-state.service';
import * as _ from 'lodash';
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
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);


  utilityMeterDataSub: Subscription;
  utilityMeterData: Array<IdbUtilityMeterData>;


  selectedFacilitySub: Subscription;
  selectedFacility: IdbFacility;
  constructor(
    private visualizationStateService: VisualizationStateService,
    private analyticsService: AnalyticsService
  ) { }

  ngOnInit(): void {
    this.analyticsService.sendEvent('use_data_visualization');
    this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility).subscribe(val => {
      this.selectedFacility = val;
      this.visualizationStateService.setCalanderizedMeters(this.selectedFacility);
      this.initializeDate();
      this.visualizationStateService.initilizeCorrelationPlotOptions();
    });

    this.utilityMeterDataSub = toObservable(computed(() => [...this.accountWorkspaceStore.facilityMeterData()])).subscribe(val => {
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
