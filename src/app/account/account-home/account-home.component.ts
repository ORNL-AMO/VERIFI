import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbAccountAnalysisItem, IdbAnalysisItem, IdbPredictorEntry } from 'src/app/models/idb';
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

@Component({
  selector: 'app-account-home',
  templateUrl: './account-home.component.html',
  styleUrls: ['./account-home.component.css']
})
export class AccountHomeComponent implements OnInit {

  accountFacilities: Array<IdbFacility>;
  selectedAccountSub: Subscription;
  annualEnergyAnalysisWorker: Worker;
  annualWaterAnalysisWorker: Worker;
  accountOverviewWorker: Worker;

  monthlyEnergyAnalysisData: Array<MonthlyAnalysisSummaryData>;
  monthlyEnergyAnalysisDataSub: Subscription;
  monthlyWaterAnalysisData: Array<MonthlyAnalysisSummaryData>;
  monthlyWaterAnalysisDataSub: Subscription;
  account: IdbAccount;
  latestEnergyAnalysisItem: IdbAccountAnalysisItem;
  latestWaterAnalysisItem: IdbAccountAnalysisItem;
  carrouselIndex: number = 0;
  constructor(private facilityDbService: FacilitydbService, private accountDbService: AccountdbService,
    private accountHomeService: AccountHomeService,
    private predictorDbService: PredictordbService,
    private analysisDbService: AnalysisDbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private eGridService: EGridService,
    private customFuelDbService: CustomFuelDbService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.account = val
      this.accountHomeService.setLatestEnergyAnalysisItem();
      this.accountHomeService.setLatestWaterAnalysisItem();
      if (this.accountHomeService.latestEnergyAnalysisItem) {
        this.latestEnergyAnalysisItem = this.accountHomeService.latestEnergyAnalysisItem;
        this.setAnnualEnergyAnalysisSummary();
      } else {
        this.latestEnergyAnalysisItem = undefined;
        this.accountHomeService.monthlyEnergyAnalysisData.next(undefined);
        this.accountHomeService.annualEnergyAnalysisSummary.next(undefined);
      }

      if (this.accountHomeService.latestWaterAnalysisItem) {
        this.latestWaterAnalysisItem = this.accountHomeService.latestWaterAnalysisItem;
        this.setAnnualWaterAnalysisSummary();
      } else {
        this.latestWaterAnalysisItem = undefined;
        this.accountHomeService.monthlyWaterAnalysisData.next(undefined);
        this.accountHomeService.annualWaterAnalysisSummary.next(undefined);
      }
      this.setAccountOverviewData();
    });

    this.monthlyEnergyAnalysisDataSub = this.accountHomeService.monthlyEnergyAnalysisData.subscribe(val => {
      this.monthlyEnergyAnalysisData = val;
    });
    this.monthlyWaterAnalysisDataSub = this.accountHomeService.monthlyWaterAnalysisData.subscribe(val => {
      this.monthlyWaterAnalysisData = val;
    });
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.monthlyEnergyAnalysisDataSub.unsubscribe();
    this.monthlyWaterAnalysisDataSub.unsubscribe();


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
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();


    if (typeof Worker !== 'undefined') {
      this.annualEnergyAnalysisWorker = new Worker(new URL('src/app/web-workers/annual-account-analysis.worker', import.meta.url));
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
        accountAnalysisItem: this.accountHomeService.latestEnergyAnalysisItem,
        account: this.account,
        accountFacilities: accountFacilities,
        accountPredictorEntries: accountPredictorEntries,
        allAccountAnalysisItems: accountAnalysisItems,
        calculateAllMonthlyData: true,
        meters: accountMeters,
        meterData: accountMeterData
      });
    } else {
      // Web Workers are not supported in this environment.
      let annualAnalysisSummaryClass: AnnualAccountAnalysisSummaryClass = new AnnualAccountAnalysisSummaryClass(this.accountHomeService.latestEnergyAnalysisItem, this.account, accountFacilities, accountPredictorEntries, accountAnalysisItems, true, accountMeters, accountMeterData);
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
      return isNaN(summary.adjusted) == false;
    })
    this.accountHomeService.annualEnergyAnalysisSummary.next(annualAnalysisSummaries);
    this.accountHomeService.monthlyEnergyAnalysisData.next(monthlyAnalysisSummaryData);
  }

  setAnnualWaterAnalysisSummary() {
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();

    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();

    if (typeof Worker !== 'undefined') {
      this.annualWaterAnalysisWorker = new Worker(new URL('src/app/web-workers/annual-account-analysis.worker', import.meta.url));
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
        accountAnalysisItem: this.accountHomeService.latestWaterAnalysisItem,
        account: this.account,
        accountFacilities: accountFacilities,
        accountPredictorEntries: accountPredictorEntries,
        allAccountAnalysisItems: accountAnalysisItems,
        calculateAllMonthlyData: true,
        meters: accountMeters,
        meterData: accountMeterData
      });
    } else {
      // Web Workers are not supported in this environment.
      let annualAnalysisSummaryClass: AnnualAccountAnalysisSummaryClass = new AnnualAccountAnalysisSummaryClass(this.accountHomeService.latestWaterAnalysisItem, this.account, accountFacilities, accountPredictorEntries, accountAnalysisItems, true, accountMeters, accountMeterData);
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
      return isNaN(summary.adjusted) == false;
    })
    this.accountHomeService.annualWaterAnalysisSummary.next(annualAnalysisSummaries);
    this.accountHomeService.monthlyWaterAnalysisData.next(monthlyAnalysisSummaryData);
  }

  goNext() {
    this.carrouselIndex++;
  }

  goBack() {
    this.carrouselIndex--;
  }

  setAccountOverviewData() {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let co2Emissions: Array<SubregionEmissions> = this.eGridService.co2Emissions;
    let customFuels: Array<IdbCustomFuel> = this.customFuelDbService.accountCustomFuels.getValue();

    if (typeof Worker !== 'undefined') {
      this.accountOverviewWorker = new Worker(new URL('src/app/web-workers/account-overview.worker', import.meta.url));
      this.accountOverviewWorker.onmessage = ({ data }) => {
        if (!data.error) {
          this.accountHomeService.accountOverviewData.next(data.accountOverviewData);
          // this.accountOverviewService.utilityUseAndCost.next(data.utilityUseAndCost);
          this.accountHomeService.calculatingOverview.next(false);
        } else {
          this.accountHomeService.accountOverviewData.next(undefined);
          // this.accountOverviewService.utilityUseAndCost.next(undefined);
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
        account: this.account,
        energyIsSource: this.account.energyIsSource,
        co2Emissions: co2Emissions,
        customFuels: customFuels
      });
    } else {
      // Web Workers are not supported in this environment.
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(meters, meterData, this.account, true, { energyIsSource: this.account.energyIsSource, neededUnits: undefined }, co2Emissions, customFuels, facilities);
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
      let accountOverviewData: AccountOverviewData = new AccountOverviewData(calanderizedMeters, facilities, this.account, dateRange);
      this.accountHomeService.accountOverviewData.next(accountOverviewData);
      this.accountHomeService.calculatingOverview.next(false);
    }
  }

}
