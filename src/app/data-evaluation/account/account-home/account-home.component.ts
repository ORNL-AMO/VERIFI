import { Component, effect, inject, OnDestroy, Signal, untracked } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AccountHomeService } from './account-home.service';
import * as _ from 'lodash';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { AnnualAccountAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualAccountAnalysisSummaryClass';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { SubregionEmissions } from 'src/app/models/eGridEmissions';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbCustomFuel } from 'src/app/models/idbModels/customFuel';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbCustomGWP } from 'src/app/models/idbModels/customGWP';
import { CustomGWPDbService } from 'src/app/indexedDB/custom-gwp-db.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-account-home',
  templateUrl: './account-home.component.html',
  styleUrls: ['./account-home.component.css'],
  standalone: false
})
export class AccountHomeComponent implements OnDestroy {
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private accountHomeService: AccountHomeService = inject(AccountHomeService);
  private predictorDbService: PredictorDbService = inject(PredictorDbService);
  private predictorDataDbService: PredictorDataDbService = inject(PredictorDataDbService);
  private analysisDbService: AnalysisDbService = inject(AnalysisDbService);
  private utilityMeterDbService: UtilityMeterdbService = inject(UtilityMeterdbService);
  private utilityMeterDataDbService: UtilityMeterDatadbService = inject(UtilityMeterDatadbService);
  private eGridService: EGridService = inject(EGridService);
  private customFuelDbService: CustomFuelDbService = inject(CustomFuelDbService);
  private customGWPDbService: CustomGWPDbService = inject(CustomGWPDbService);

  account: Signal<IdbAccount> = toSignal(this.accountDbService.selectedAccount, { initialValue: null });
  accountFacilities: Signal<Array<IdbFacility>> = toSignal(this.facilityDbService.accountFacilities, { initialValue: [] });

  latestEnergyAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.accountHomeService.latestEnergyAnalysisItem, { initialValue: undefined });
  latestWaterAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.accountHomeService.latestWaterAnalysisItem, { initialValue: undefined });

  monthlyEnergyAnalysisData: Signal<Array<MonthlyAnalysisSummaryData>> = toSignal(this.accountHomeService.monthlyEnergyAnalysisData, { initialValue: undefined });
  monthlyWaterAnalysisData: Signal<Array<MonthlyAnalysisSummaryData>> = toSignal(this.accountHomeService.monthlyWaterAnalysisData, { initialValue: undefined });

  annualEnergyAnalysisWorker: Worker;
  annualWaterAnalysisWorker: Worker;
  accountOverviewWorker: Worker;

  constructor() {
    effect(() => {
      const account = this.account();
      if (account) {
        untracked(() => {
          this.accountHomeService.setLatestEnergyAnalysisItem(account.selectedEnergyAnalysisId);
          this.accountHomeService.setLatestWaterAnalysisItem(account.selectedWaterAnalysisId);
          this.setAccountOverviewData();
        });
      }
    });

    effect(() => {
      const energyItem = this.latestEnergyAnalysisItem();
      if (energyItem) {
        untracked(() => this.setAnnualEnergyAnalysisSummary());
      } else {
        this.accountHomeService.monthlyEnergyAnalysisData.next(undefined);
        this.accountHomeService.annualEnergyAnalysisSummary.next(undefined);
      }
    });

    effect(() => {
      const waterItem = this.latestWaterAnalysisItem();
      if (waterItem) {
        untracked(() => this.setAnnualWaterAnalysisSummary());
      } else {
        this.accountHomeService.monthlyWaterAnalysisData.next(undefined);
        this.accountHomeService.annualWaterAnalysisSummary.next(undefined);
      }
    });
  }

  ngOnDestroy() {
    if (this.annualWaterAnalysisWorker) {
      this.annualWaterAnalysisWorker.terminate();
    }
    if (this.annualEnergyAnalysisWorker) {
      this.annualEnergyAnalysisWorker.terminate();
    }
    if (this.accountOverviewWorker) {
      this.accountOverviewWorker.terminate();
    }
    this.accountHomeService.monthlyEnergyAnalysisData.next(undefined);
    this.accountHomeService.annualEnergyAnalysisSummary.next(undefined);
    this.accountHomeService.monthlyWaterAnalysisData.next(undefined);
    this.accountHomeService.annualWaterAnalysisSummary.next(undefined);
    this.accountHomeService.accountOverviewData.next(undefined);
    this.accountHomeService.calculatingEnergy.next(true);
    this.accountHomeService.calculatingOverview.next(true);
    this.accountHomeService.calculatingWater.next(true);
  }

  setAnnualEnergyAnalysisSummary() {
    let accountPredictorEntries: Array<IdbPredictorData> = this.predictorDataDbService.accountPredictorData.getValue();
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();

    if (typeof Worker !== 'undefined') {
      this.annualEnergyAnalysisWorker = new Worker(new URL('../../../web-workers/annual-account-analysis.worker', import.meta.url));
      this.annualEnergyAnalysisWorker.onmessage = ({ data }) => {
        this.annualEnergyAnalysisWorker.terminate();
        if (!data.error) {
          this.setEnergyBehaviorSubjects(data.annualAnalysisSummaries, data.monthlyAnalysisSummaryData);
          this.accountHomeService.calculatingEnergy.next(false);
        } else {
          this.accountHomeService.annualEnergyAnalysisSummary.next(undefined);
          this.accountHomeService.monthlyEnergyAnalysisData.next(undefined);
          this.accountHomeService.calculatingEnergy.next('error');
        }
      };
      this.accountHomeService.calculatingEnergy.next(true);
      this.annualEnergyAnalysisWorker.postMessage({
        accountAnalysisItem: this.latestEnergyAnalysisItem(),
        account: this.account(),
        accountFacilities: accountFacilities,
        accountPredictorEntries: accountPredictorEntries,
        allAccountAnalysisItems: accountAnalysisItems,
        calculateAllMonthlyData: true,
        meters: accountMeters,
        meterData: accountMeterData,
        accountPredictors: accountPredictors
      });
    } else {
      const account = this.account();
      let annualAnalysisSummaryClass: AnnualAccountAnalysisSummaryClass = new AnnualAccountAnalysisSummaryClass(this.latestEnergyAnalysisItem(), account, accountFacilities, accountPredictorEntries, accountAnalysisItems, true, accountMeters, accountMeterData, accountPredictors);
      let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
      this.setEnergyBehaviorSubjects(annualAnalysisSummaries, monthlyAnalysisSummaryData);
    }
  }

  setEnergyBehaviorSubjects(annualAnalysisSummaries: Array<AnnualAnalysisSummary>, monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>) {
    annualAnalysisSummaries = annualAnalysisSummaries.filter(summary => {
      return isNaN(summary.adjusted) == false;
    })
    monthlyAnalysisSummaryData = monthlyAnalysisSummaryData.filter(summary => {
      return isNaN(summary.adjusted) == false && summary.energyUse != 0;
    })
    this.accountHomeService.annualEnergyAnalysisSummary.next(annualAnalysisSummaries);
    this.accountHomeService.monthlyEnergyAnalysisData.next(monthlyAnalysisSummaryData);
  }

  setAnnualWaterAnalysisSummary() {
    let accountPredictorEntries: Array<IdbPredictorData> = this.predictorDataDbService.accountPredictorData.getValue();
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();

    if (typeof Worker !== 'undefined') {
      this.annualWaterAnalysisWorker = new Worker(new URL('../../../web-workers/annual-account-analysis.worker', import.meta.url));
      this.annualWaterAnalysisWorker.onmessage = ({ data }) => {
        this.annualWaterAnalysisWorker.terminate();
        if (!data.error) {
          this.setWaterBehaviorSubjects(data.annualAnalysisSummaries, data.monthlyAnalysisSummaryData);
          this.accountHomeService.calculatingWater.next(false);
        } else {
          this.accountHomeService.annualWaterAnalysisSummary.next(undefined);
          this.accountHomeService.monthlyWaterAnalysisData.next(undefined);
          this.accountHomeService.calculatingWater.next('error');
        }
      };
      this.accountHomeService.calculatingWater.next(true);
      this.annualWaterAnalysisWorker.postMessage({
        accountAnalysisItem: this.latestWaterAnalysisItem(),
        account: this.account(),
        accountFacilities: accountFacilities,
        accountPredictorEntries: accountPredictorEntries,
        allAccountAnalysisItems: accountAnalysisItems,
        calculateAllMonthlyData: true,
        meters: accountMeters,
        meterData: accountMeterData,
        accountPredictors: accountPredictors
      });
    } else {
      const account = this.account();
      let annualAnalysisSummaryClass: AnnualAccountAnalysisSummaryClass = new AnnualAccountAnalysisSummaryClass(this.latestWaterAnalysisItem(), account, accountFacilities, accountPredictorEntries, accountAnalysisItems, true, accountMeters, accountMeterData, accountPredictors);
      let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
      this.setWaterBehaviorSubjects(annualAnalysisSummaries, monthlyAnalysisSummaryData);
    }
  }

  setWaterBehaviorSubjects(annualAnalysisSummaries: Array<AnnualAnalysisSummary>, monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>) {
    annualAnalysisSummaries = annualAnalysisSummaries.filter(summary => {
      return isNaN(summary.adjusted) == false;
    })
    monthlyAnalysisSummaryData = monthlyAnalysisSummaryData.filter(summary => {
      return isNaN(summary.adjusted) == false && summary.energyUse != 0;
    })
    this.accountHomeService.annualWaterAnalysisSummary.next(annualAnalysisSummaries);
    this.accountHomeService.monthlyWaterAnalysisData.next(monthlyAnalysisSummaryData);
  }

  setAccountOverviewData() {
    const account = this.account();
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let co2Emissions: Array<SubregionEmissions> = this.eGridService.co2Emissions;
    let customFuels: Array<IdbCustomFuel> = this.customFuelDbService.accountCustomFuels.getValue();
    let customGWPs: Array<IdbCustomGWP> = this.customGWPDbService.accountCustomGWPs.getValue();

    if (typeof Worker !== 'undefined') {
      this.accountOverviewWorker = new Worker(new URL('../../../web-workers/account-overview.worker', import.meta.url));
      this.accountOverviewWorker.onmessage = ({ data }) => {
        if (!data.error) {
          this.accountHomeService.accountOverviewData.next(data.accountOverviewData);
          this.accountHomeService.calculatingOverview.next(false);
        } else {
          this.accountHomeService.accountOverviewData.next(undefined);
          this.accountHomeService.calculatingOverview.next('error');
        }
        this.accountOverviewWorker.terminate();
      };

      this.accountOverviewWorker.postMessage({
        meters: meters,
        facilities: facilities,
        type: 'overview',
        dateRange: undefined,
        meterData: meterData,
        inOverview: false,
        account: account,
        energyIsSource: account.energyIsSource,
        co2Emissions: co2Emissions,
        customFuels: customFuels,
        customGWPs: customGWPs
      });
    } else {
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(meters, meterData, account, true, { energyIsSource: account.energyIsSource, neededUnits: undefined }, co2Emissions, customFuels, facilities, account.assessmentReportVersion, customGWPs);
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
      let accountOverviewData: AccountOverviewData = new AccountOverviewData(calanderizedMeters, facilities, account, dateRange);
      this.accountHomeService.accountOverviewData.next(accountOverviewData);
      this.accountHomeService.calculatingOverview.next(false);
    }
  }

}
