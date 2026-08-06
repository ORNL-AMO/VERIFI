import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilityOverviewData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { FacilityOverviewService } from './facility-overview.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import * as _ from 'lodash';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbCustomFuel } from 'src/app/models/idbModels/customFuel';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbCustomGWP } from 'src/app/models/idbModels/customGWP';

@Component({
  selector: 'app-facility-overview',
  templateUrl: './facility-overview.component.html',
  styleUrls: ['./facility-overview.component.css'],
  standalone: false
})
export class FacilityOverviewComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  facilitySub: Subscription;
  worker: Worker;
  noUtilityData: boolean;
  facility: IdbFacility;
  dateRange: { startDate: Date, endDate: Date };
  dateRangeSub: Subscription;
  customFuels: Array<IdbCustomFuel>;
  constructor(
    private facilityOverviewService: FacilityOverviewService,
    private router: Router,
    private eGridService: EGridService
  ) { }

  ngOnInit(): void {
    this.customFuels = [...this.accountWorkspaceStore.customFuels()];
    this.facilitySub = toObservable(this.accountWorkspaceStore.selectedFacility).subscribe(val => {
      if (this.facility && this.facility.guid != val.guid) {
        this.dateRange = undefined;
      }
      this.facility = val;
      let facilityMeterData: Array<IdbUtilityMeterData> = [...this.accountWorkspaceStore.facilityMeterData()]
      if (facilityMeterData.length != 0) {
        this.noUtilityData = false;
        this.calculateFacilitiesSummary();
      } else {
        this.noUtilityData = true;
      }
    });

    this.dateRangeSub = this.facilityOverviewService.dateRange.subscribe(dateRange => {
      let needUpdatedSummary: boolean = true;
      if (!this.dateRange) {
        needUpdatedSummary = false;
      }
      this.dateRange = dateRange;
      if (needUpdatedSummary) {
        this.calculateFacilitiesSummary();
      }
    });
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
    this.dateRangeSub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
    this.facilityOverviewService.facilityOverviewData.next(undefined);
    this.facilityOverviewService.utilityUseAndCost.next(undefined);
    this.facilityOverviewService.dateRange.next(undefined);
  }

  calculateFacilitiesSummary() {
    let meters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.facilityMeters()];
    let meterData: Array<IdbUtilityMeterData> = [...this.accountWorkspaceStore.facilityMeterData()];
    let account: IdbAccount = this.accountWorkspaceStore.account();
    let customGWPs: Array<IdbCustomGWP> = [...this.accountWorkspaceStore.customGWPs()];
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../../../web-workers/facility-overview.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (!data.error) {
          this.facilityOverviewService.facilityOverviewData.next(data.facilityOverviewData);
          this.facilityOverviewService.utilityUseAndCost.next(data.utilityUseAndCost);
          if (!this.dateRange) {
            this.facilityOverviewService.dateRange.next(data.dateRange);
          }
          this.facilityOverviewService.calculating.next(false);
        } else {
          this.facilityOverviewService.facilityOverviewData.next(undefined);
          this.facilityOverviewService.utilityUseAndCost.next(undefined);
          this.facilityOverviewService.calculating.next("error");
        }
        this.worker.terminate();

      };
      if (this.facilityOverviewService.utilityUseAndCost.getValue() == undefined) {
        this.facilityOverviewService.calculating.next(true);
      }
      this.worker.postMessage({
        type: 'overview',
        dateRange: this.dateRange,
        facility: this.facility,
        inOverview: false,
        energyIsSource: this.facility.energyIsSource,
        meterData: meterData,
        meters: meters,
        co2Emissions: this.eGridService.co2Emissions,
        customFuels: this.customFuels,
        assessmentReportVersion: account.assessmentReportVersion,
        customGWPs: customGWPs
      });
    } else {
      // Web Workers are not supported in this environment.
      if (this.facilityOverviewService.utilityUseAndCost.getValue() == undefined) {
        this.facilityOverviewService.calculating.next(true);
      }
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(meters, meterData, this.facility, false, undefined, this.eGridService.co2Emissions, this.customFuels, [this.facility], account.assessmentReportVersion, customGWPs);
      if (!this.dateRange) {
        if (calanderizedMeters && calanderizedMeters.length > 0) {
          let monthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(val => { return val.monthlyData });
          let latestData: MonthlyData = _.maxBy(monthlyData, 'date');
          let maxDate: Date = new Date(latestData.year, latestData.monthNumValue);
          let minDate: Date = new Date(maxDate.getMonth() - 1, maxDate.getMonth(), 1);
          minDate.setMonth(minDate.getMonth() + 1);
          this.dateRange = {
            endDate: maxDate,
            startDate: minDate
          };
          this.facilityOverviewService.dateRange.next(this.dateRange);
        }
      }
      let facilityOverviewData: FacilityOverviewData = new FacilityOverviewData(calanderizedMeters, this.dateRange, this.facility);
      let utilityUseAndCost: UtilityUseAndCost = new UtilityUseAndCost(calanderizedMeters, this.dateRange);
      this.facilityOverviewService.facilityOverviewData.next(facilityOverviewData);
      this.facilityOverviewService.utilityUseAndCost.next(utilityUseAndCost);
      this.facilityOverviewService.calculating.next(false);
    }
  }

  addUtilityData() {
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    this.router.navigateByUrl('/data-evaluation/facility/' + selectedFacility.guid + '/utility');
  }
}
