import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { CalanderizationOptions, CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter } from 'src/app/models/idb';
import { AccountHomeService } from './account-home.service';
import * as _ from 'lodash';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { AnnualAccountAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualAccountAnalysisSummaryClass';
import { AnnualFacilityAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { ConvertMeterDataService } from 'src/app/shared/helper-services/convert-meter-data.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';

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
  calculatingEnergy: boolean | 'error';
  calculatingEnergySub: Subscription;
  calculatingWater: boolean | 'error';
  calculatingWaterSub: Subscription;
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
    private calendarizationService: CalanderizationService,
    private convertMeterDataService: ConvertMeterDataService) { }

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
    });

    
    this.calculatingEnergySub = this.accountHomeService.calculatingEnergy.subscribe(val => {
      this.calculatingEnergy = val;
    });
    this.calculatingWaterSub = this.accountHomeService.calculatingWater.subscribe(val => {
      this.calculatingWater = val;
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
    if (this.annualWaterAnalysisWorker) {
      this.annualWaterAnalysisWorker.terminate();
    }
    if (this.annualEnergyAnalysisWorker) {
      this.annualEnergyAnalysisWorker.terminate();
    }
    this.accountHomeService.monthlyEnergyAnalysisData.next(undefined);
    this.accountHomeService.annualEnergyAnalysisSummary.next(undefined);
    this.accountHomeService.monthlyWaterAnalysisData.next(undefined);
    this.accountHomeService.annualWaterAnalysisSummary.next(undefined);
    this.accountHomeService.facilityAnalysisSummaries.next([])
  }

  setAnnualEnergyAnalysisSummary() {
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    
    let calanderizationOptions: CalanderizationOptions = {
      energyIsSource: this.accountHomeService.latestEnergyAnalysisItem.energyIsSource
    }
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calendarizationService.getCalanderizedMeterData(accountMeters, true, false, calanderizationOptions);
    calanderizedMeterData.forEach(calanderizedMeter => {
      calanderizedMeter.monthlyData = this.convertMeterDataService.convertMeterDataToAnalysis(this.accountHomeService.latestEnergyAnalysisItem, calanderizedMeter.monthlyData, this.account, calanderizedMeter.meter);
    });
    
    if (typeof Worker !== 'undefined') {
      this.annualEnergyAnalysisWorker = new Worker(new URL('src/app/web-workers/annual-account-analysis.worker', import.meta.url));
      this.annualEnergyAnalysisWorker.onmessage = ({ data }) => {
        this.annualEnergyAnalysisWorker.terminate();
        if (!data.error) {
          this.accountHomeService.annualEnergyAnalysisSummary.next(data.annualAnalysisSummaries);
          this.accountHomeService.monthlyEnergyAnalysisData.next(data.monthlyAnalysisSummaryData);
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
        calanderizedMeters: calanderizedMeterData,
        accountFacilities: accountFacilities,
        accountPredictorEntries: accountPredictorEntries,
        allAccountAnalysisItems: accountAnalysisItems,
        calculateAllMonthlyData: true
      });
    } else {
      // Web Workers are not supported in this environment.
      let annualAnalysisSummaryClass: AnnualAccountAnalysisSummaryClass = new AnnualAccountAnalysisSummaryClass(this.accountHomeService.latestEnergyAnalysisItem, this.account, calanderizedMeterData, accountFacilities, accountPredictorEntries, accountAnalysisItems, true);
      let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
      this.accountHomeService.annualEnergyAnalysisSummary.next(annualAnalysisSummaries);
      this.accountHomeService.monthlyEnergyAnalysisData.next(monthlyAnalysisSummaryData);
    }
  }

  setAnnualWaterAnalysisSummary() {
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();

    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calendarizationService.getCalanderizedMeterData(accountMeters, true, false);
    calanderizedMeterData.forEach(calanderizedMeter => {
      calanderizedMeter.monthlyData = this.convertMeterDataService.convertMeterDataToAnalysis(this.accountHomeService.latestWaterAnalysisItem, calanderizedMeter.monthlyData, this.account, calanderizedMeter.meter);
    });
    if (typeof Worker !== 'undefined') {
      this.annualWaterAnalysisWorker = new Worker(new URL('src/app/web-workers/annual-account-analysis.worker', import.meta.url));
      this.annualWaterAnalysisWorker.onmessage = ({ data }) => {
        this.annualWaterAnalysisWorker.terminate();
        if (!data.error) {
          this.accountHomeService.annualWaterAnalysisSummary.next(data.annualAnalysisSummaries);
          this.accountHomeService.monthlyWaterAnalysisData.next(data.monthlyAnalysisSummaryData);
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
        calanderizedMeters: calanderizedMeterData,
        accountFacilities: accountFacilities,
        accountPredictorEntries: accountPredictorEntries,
        allAccountAnalysisItems: accountAnalysisItems,
        calculateAllMonthlyData: true
      });
    } else {
      // Web Workers are not supported in this environment.
      let annualAnalysisSummaryClass: AnnualAccountAnalysisSummaryClass = new AnnualAccountAnalysisSummaryClass(this.accountHomeService.latestWaterAnalysisItem, this.account, calanderizedMeterData, accountFacilities, accountPredictorEntries, accountAnalysisItems, true);
      let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
      this.accountHomeService.annualWaterAnalysisSummary.next(annualAnalysisSummaries);
      this.accountHomeService.monthlyWaterAnalysisData.next(monthlyAnalysisSummaryData);
    }
  }


  // setFacilityAnalysisSummary(facilityIndex: number) {
  //   let facility: IdbFacility = this.accountFacilities[facilityIndex];
  //   let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
  //   let facilityAnalysisItems: Array<IdbAnalysisItem> = accountAnalysisItems.filter(item => { return item.facilityId == facility.guid });
  //   let selectedAnalysisItems: Array<IdbAnalysisItem> = facilityAnalysisItems.filter(item => {
  //     return item.selectedYearAnalysis == true
  //   });
  //   let latestAnalysisItem: IdbAnalysisItem;
  //   if (selectedAnalysisItems.length != 0) {
  //     latestAnalysisItem = _.maxBy(selectedAnalysisItems, 'reportYear');
  //   } else {
  //     latestAnalysisItem = _.maxBy(facilityAnalysisItems, 'reportYear');

  //   }

  //   if (latestAnalysisItem) {
  //     let calanderizedMeters: Array<CalanderizedMeter> = this.accountHomeService.calanderizedMeters;
  //     let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
  //     if (typeof Worker !== 'undefined') {
  //       this.facilityWorker = new Worker(new URL('src/app/web-workers/annual-facility-analysis.worker', import.meta.url));
  //       this.facilityWorker.onmessage = ({ data }) => {
  //         this.facilityWorker.terminate();
  //         let facilitySummary: {
  //           facilityId: string,
  //           annualAnalysisSummary: Array<AnnualAnalysisSummary>,
  //           monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
  //           error: boolean
  //         } = {
  //           facilityId: facility.guid,
  //           annualAnalysisSummary: data.annualAnalysisSummaries,
  //           monthlyAnalysisSummaryData: data.monthlyAnalysisSummaryData,
  //           error: data.error
  //         }
  //         let allSummaries: Array<{
  //           facilityId: string,
  //           annualAnalysisSummary: Array<AnnualAnalysisSummary>,
  //           monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
  //           error: boolean
  //         }> = this.accountHomeService.facilityAnalysisSummaries.getValue();
  //         allSummaries.push(facilitySummary);
  //         this.accountHomeService.facilityAnalysisSummaries.next(allSummaries);
  //         if (facilityIndex != this.accountFacilities.length - 1) {
  //           this.setFacilityAnalysisSummary(facilityIndex + 1);
  //         }
  //       };
  //       this.facilityWorker.postMessage({
  //         analysisItem: latestAnalysisItem,
  //         facility: facility,
  //         calanderizedMeters: calanderizedMeters,
  //         accountPredictorEntries: accountPredictorEntries,
  //         calculateAllMonthlyData: true
  //       });
  //     } else {
  //       // Web Workers are not supported in this environment.
  //       let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(latestAnalysisItem, facility, calanderizedMeters, accountPredictorEntries, true);
  //       let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
  //       let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
  //       let facilitySummary: {
  //         facilityId: string,
  //         annualAnalysisSummary: Array<AnnualAnalysisSummary>,
  //         monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
  //         error: boolean
  //       } = {
  //         facilityId: facility.guid,
  //         annualAnalysisSummary: annualAnalysisSummaries,
  //         monthlyAnalysisSummaryData: monthlyAnalysisSummaryData,
  //         error: false
  //       }
  //       let allSummaries: Array<{
  //         facilityId: string,
  //         annualAnalysisSummary: Array<AnnualAnalysisSummary>,
  //         monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
  //         error: boolean
  //       }> = this.accountHomeService.facilityAnalysisSummaries.getValue();
  //       allSummaries.push(facilitySummary);
  //       this.accountHomeService.facilityAnalysisSummaries.next(allSummaries);
  //       if (facilityIndex != this.accountFacilities.length - 1) {
  //         this.setFacilityAnalysisSummary(facilityIndex + 1);
  //       }
  //     }
  //   } else {
  //     if (facilityIndex != this.accountFacilities.length - 1) {
  //       this.setFacilityAnalysisSummary(facilityIndex + 1);
  //     }
  //   }
  // }

  goNext(){
    this.carrouselIndex++;
  }

  goBack(){
    this.carrouselIndex--;
  }


}
