import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, effect, inject, OnDestroy, Signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { AnnualFacilityAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { FacilityHomeService } from './facility-home.service';
import * as _ from 'lodash';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { FacilityOverviewData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-facility-home',
  templateUrl: './facility-home.component.html',
  styleUrls: ['./facility-home.component.css'],
  standalone: false
})
export class FacilityHomeComponent implements OnDestroy {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private facilityHomeService: FacilityHomeService = inject(FacilityHomeService);
  private router: Router = inject(Router);

  facility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  facilityMeters: Signal<Array<IdbUtilityMeter>> = computed(() => [...this.accountWorkspaceStore.facilityMeters()]);
  latestEnergyAnalysisItem: Signal<IdbAnalysisItem> = toSignal(this.facilityHomeService.latestEnergyAnalysisItem, { initialValue: undefined });
  latestWaterAnalysisItem: Signal<IdbAnalysisItem> = toSignal(this.facilityHomeService.latestWaterAnalysisItem, { initialValue: undefined });

  annualEnergyAnalysisWorker: Worker;
  annualWaterAnalysisWorker: Worker;
  overviewWorker: Worker;

  constructor() {
    effect(() => {
      const facility = this.facility();
      if (facility) {
        untracked(() => {
          this.facilityHomeService.setLatestEnergyAnalysisItem(facility);
          this.facilityHomeService.setLatestWaterAnalysisItem(facility);
          this.setFacilityOverview();
        });
      }
    });

    effect(() => {
      const energyItem = this.latestEnergyAnalysisItem();
      if (energyItem) {
        untracked(() => this.setAnnualEnergyAnalysisSummary());
      } else {
        this.facilityHomeService.monthlyFacilityEnergyAnalysisData.next(undefined);
        this.facilityHomeService.annualEnergyAnalysisSummary.next(undefined);
      }
    });

    effect(() => {
      const waterItem = this.latestWaterAnalysisItem();
      if (waterItem) {
        untracked(() => this.setAnnualWaterAnalysisSummary());
      } else {
        this.facilityHomeService.monthlyFacilityWaterAnalysisData.next(undefined);
        this.facilityHomeService.annualWaterAnalysisSummary.next(undefined);
      }
    });
  }

  ngOnDestroy() {
    if (this.annualEnergyAnalysisWorker) {
      this.annualEnergyAnalysisWorker.terminate();
    }
    if (this.annualWaterAnalysisWorker) {
      this.annualWaterAnalysisWorker.terminate();
    }
    if (this.overviewWorker) {
      this.overviewWorker.terminate();
    }
    this.facilityHomeService.monthlyFacilityEnergyAnalysisData.next(undefined);
    this.facilityHomeService.annualEnergyAnalysisSummary.next(undefined);
    this.facilityHomeService.monthlyFacilityWaterAnalysisData.next(undefined);
    this.facilityHomeService.annualWaterAnalysisSummary.next(undefined);
    this.facilityHomeService.calculatingEnergy.next(true);
    this.facilityHomeService.calculatingOverview.next(true);
    this.facilityHomeService.calculatingWater.next(true);
  }

  navigateToMeters() {
    this.router.navigateByUrl('/data-evaluation/facility/' + this.facility().guid + '/utility');
  }

  setAnnualEnergyAnalysisSummary() {
    let accountPredictorEntries: Array<IdbPredictorData> = [...this.accountWorkspaceStore.predictorData()];
    let accountPredictors: Array<IdbPredictor> = [...this.accountWorkspaceStore.predictors()];
    let facilityMeters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.facilityMeters()];
    let facilityMeterData: Array<IdbUtilityMeterData> = [...this.accountWorkspaceStore.facilityMeterData()];
    let accountAnalysisItems: Array<IdbAnalysisItem> = [...this.accountWorkspaceStore.facilityAnalyses()];
    let account: IdbAccount = this.accountWorkspaceStore.account();
    if (typeof Worker !== 'undefined') {
      this.annualEnergyAnalysisWorker = new Worker(new URL('../../../web-workers/annual-facility-analysis.worker', import.meta.url));
      this.annualEnergyAnalysisWorker.onmessage = ({ data }) => {
        if (!data.error) {
          this.setEnergyBehaviorSubjects(data.annualAnalysisSummaries, data.monthlyAnalysisSummaryData);
          this.facilityHomeService.calculatingEnergy.next(false);
        } else {
          this.facilityHomeService.annualEnergyAnalysisSummary.next(undefined);
          this.facilityHomeService.monthlyFacilityEnergyAnalysisData.next(undefined);
          this.facilityHomeService.calculatingEnergy.next('error');
        }
        this.annualEnergyAnalysisWorker.terminate();
      };
      this.facilityHomeService.calculatingEnergy.next(true);
      this.annualEnergyAnalysisWorker.postMessage({
        analysisItem: this.latestEnergyAnalysisItem(),
        facility: this.facility(),
        meters: facilityMeters,
        accountPredictorEntries: accountPredictorEntries,
        calculateAllMonthlyData: true,
        meterData: facilityMeterData,
        accountPredictors: accountPredictors,
        accountAnalysisItems: accountAnalysisItems,
        assessmentReportVersion: account.assessmentReportVersion
      });
    } else {
      const facility = this.facility();
      const energyItem = this.latestEnergyAnalysisItem();
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, facilityMeterData, facility, false, { energyIsSource: energyItem.energyIsSource, neededUnits: energyItem.energyUnit }, [], [], [facility], account.assessmentReportVersion, []);
      let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(energyItem, facility, calanderizedMeters, accountPredictorEntries, true, accountPredictors, accountAnalysisItems, false);
      let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
      this.setEnergyBehaviorSubjects(annualAnalysisSummaries, monthlyAnalysisSummaryData);
      this.facilityHomeService.calculatingEnergy.next(false);
    }
  }

  setEnergyBehaviorSubjects(annualAnalysisSummaries: Array<AnnualAnalysisSummary>, monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>) {
    annualAnalysisSummaries = annualAnalysisSummaries.filter(summary => {
      return isNaN(summary.adjusted) == false;
    });
    monthlyAnalysisSummaryData = monthlyAnalysisSummaryData.filter(summary => {
      return isNaN(summary.adjusted) == false;
    });
    this.facilityHomeService.annualEnergyAnalysisSummary.next(annualAnalysisSummaries);
    this.facilityHomeService.monthlyFacilityEnergyAnalysisData.next(monthlyAnalysisSummaryData);
  }

  setAnnualWaterAnalysisSummary() {
    let accountPredictorEntries: Array<IdbPredictorData> = [...this.accountWorkspaceStore.predictorData()];
    let accountPredictors: Array<IdbPredictor> = [...this.accountWorkspaceStore.predictors()];
    let facilityMeters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.facilityMeters()];
    let facilityMeterData: Array<IdbUtilityMeterData> = [...this.accountWorkspaceStore.facilityMeterData()];
    let accountAnalysisItems: Array<IdbAnalysisItem> = [...this.accountWorkspaceStore.facilityAnalyses()];
    let account: IdbAccount = this.accountWorkspaceStore.account();
    if (typeof Worker !== 'undefined') {
      this.annualWaterAnalysisWorker = new Worker(new URL('../../../web-workers/annual-facility-analysis.worker', import.meta.url));
      this.annualWaterAnalysisWorker.onmessage = ({ data }) => {
        if (!data.error) {
          this.setWaterBehaviorSubjects(data.annualAnalysisSummaries, data.monthlyAnalysisSummaryData);
          this.facilityHomeService.calculatingWater.next(false);
        } else {
          this.facilityHomeService.annualWaterAnalysisSummary.next(undefined);
          this.facilityHomeService.monthlyFacilityWaterAnalysisData.next(undefined);
          this.facilityHomeService.calculatingWater.next('error');
        }
        this.annualWaterAnalysisWorker.terminate();
      };
      this.facilityHomeService.calculatingWater.next(true);
      this.annualWaterAnalysisWorker.postMessage({
        analysisItem: this.latestWaterAnalysisItem(),
        facility: this.facility(),
        meters: facilityMeters,
        accountPredictorEntries: accountPredictorEntries,
        calculateAllMonthlyData: true,
        meterData: facilityMeterData,
        accountPredictors: accountPredictors,
        accountAnalysisItems: accountAnalysisItems,
        assessmentReportVersion: account.assessmentReportVersion
      });
    } else {
      const facility = this.facility();
      const waterItem = this.latestWaterAnalysisItem();
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, facilityMeterData, facility, false, { energyIsSource: waterItem.energyIsSource, neededUnits: waterItem.waterUnit }, [], [], [facility], account.assessmentReportVersion, []);
      let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(waterItem, facility, calanderizedMeters, accountPredictorEntries, true, accountPredictors, accountAnalysisItems, false);
      let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
      this.setWaterBehaviorSubjects(annualAnalysisSummaries, monthlyAnalysisSummaryData);
      this.facilityHomeService.calculatingWater.next(false);
    }
  }

  setWaterBehaviorSubjects(annualAnalysisSummaries: Array<AnnualAnalysisSummary>, monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>) {
    annualAnalysisSummaries = annualAnalysisSummaries.filter(summary => {
      return isNaN(summary.adjusted) == false;
    });
    monthlyAnalysisSummaryData = monthlyAnalysisSummaryData.filter(summary => {
      return isNaN(summary.adjusted) == false;
    });
    this.facilityHomeService.annualWaterAnalysisSummary.next(annualAnalysisSummaries);
    this.facilityHomeService.monthlyFacilityWaterAnalysisData.next(monthlyAnalysisSummaryData);
  }

  setFacilityOverview() {
    const facility = this.facility();
    let meters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.facilityMeters()];
    let meterData: Array<IdbUtilityMeterData> = [...this.accountWorkspaceStore.facilityMeterData()];
    let account: IdbAccount = this.accountWorkspaceStore.account();
    if (typeof Worker !== 'undefined') {
      this.overviewWorker = new Worker(new URL('../../../web-workers/facility-overview.worker', import.meta.url));
      this.overviewWorker.onmessage = ({ data }) => {
        if (!data.error) {
          this.facilityHomeService.facilityOverviewData.next(data.facilityOverviewData);
          this.facilityHomeService.calculatingOverview.next(false);
        } else {
          this.facilityHomeService.facilityOverviewData.next(undefined);
          this.facilityHomeService.calculatingOverview.next('error');
        }
        this.overviewWorker.terminate();
      };
      this.facilityHomeService.calculatingOverview.next(true);
      this.overviewWorker.postMessage({
        type: 'overview',
        dateRange: undefined,
        facility: facility,
        inOverview: false,
        energyIsSource: facility.energyIsSource,
        meterData: meterData,
        meters: meters,
        co2Emissions: [],
        customFuels: [],
        assessmentReportVersion: account.assessmentReportVersion,
        customGWPs: []
      });
    } else {
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(meters, meterData, facility, true, { energyIsSource: facility.energyIsSource, neededUnits: undefined }, [], [], [facility], account.assessmentReportVersion, []);
      let dateRange: { endDate: Date, startDate: Date };
      if (calanderizedMeters && calanderizedMeters.length > 0) {
        let monthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(val => { return val.monthlyData });
        let latestData: MonthlyData = _.maxBy(monthlyData, 'date');
        let startData: MonthlyData = _.minBy(monthlyData, 'date');
        let maxDate: Date = new Date(latestData.year, latestData.monthNumValue);
        let minDate: Date = new Date(startData.year, startData.monthNumValue);
        minDate.setMonth(minDate.getMonth() + 1);
        dateRange = {
          endDate: maxDate,
          startDate: minDate
        };
      }
      let facilityOverviewData: FacilityOverviewData = new FacilityOverviewData(calanderizedMeters, dateRange, facility);
      this.facilityHomeService.facilityOverviewData.next(facilityOverviewData);
      this.facilityHomeService.calculatingOverview.next(false);
    }
  }
}
