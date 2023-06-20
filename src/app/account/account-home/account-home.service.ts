import { Injectable } from '@angular/core';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizationOptions, CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount, IdbAccountAnalysisItem, IdbUtilityMeter } from 'src/app/models/idb';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { ConvertMeterDataService } from 'src/app/shared/helper-services/convert-meter-data.service';
import * as _ from 'lodash';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AccountHomeService {

  // calanderizedMeters: Array<CalanderizedMeter>;
  latestEnergyAnalysisItem: IdbAccountAnalysisItem;
  latestWaterAnalysisItem: IdbAccountAnalysisItem;
  annualEnergyAnalysisSummary: BehaviorSubject<Array<AnnualAnalysisSummary>>;
  monthlyEnergyAnalysisData: BehaviorSubject<Array<MonthlyAnalysisSummaryData>>;
  annualWaterAnalysisSummary: BehaviorSubject<Array<AnnualAnalysisSummary>>;
  monthlyWaterAnalysisData: BehaviorSubject<Array<MonthlyAnalysisSummaryData>>;
  calculatingEnergy: BehaviorSubject<boolean | 'error'>;
  calculatingWater: BehaviorSubject<boolean | 'error'>;
  facilityAnalysisSummaries: BehaviorSubject<Array<{
    facilityId: string,
    annualAnalysisSummary: Array<AnnualAnalysisSummary>,
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
    error: boolean
  }>>;
  constructor(private accountAnalysisDbService: AccountAnalysisDbService, private utilityMeterDbService: UtilityMeterdbService,
    private accountDbService: AccountdbService, private calendarizationService: CalanderizationService, private convertMeterDataService: ConvertMeterDataService) {
    this.annualEnergyAnalysisSummary = new BehaviorSubject<Array<AnnualAnalysisSummary>>(undefined);
    this.monthlyEnergyAnalysisData = new BehaviorSubject<Array<MonthlyAnalysisSummaryData>>(undefined);
    this.annualWaterAnalysisSummary = new BehaviorSubject<Array<AnnualAnalysisSummary>>(undefined);
    this.monthlyWaterAnalysisData = new BehaviorSubject<Array<MonthlyAnalysisSummaryData>>(undefined);
    this.calculatingEnergy = new BehaviorSubject<boolean>(true);
    this.calculatingWater = new BehaviorSubject<boolean>(true);
    this.facilityAnalysisSummaries = new BehaviorSubject([]);
  }

  setLatestEnergyAnalysisItem() {
    let analysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    let energyAnalysisItems: Array<IdbAccountAnalysisItem> = analysisItems.filter(item => { return item.analysisCategory == 'energy' });
    let selectedAnalysisItems: Array<IdbAccountAnalysisItem> = energyAnalysisItems.filter(item => { return item.selectedYearAnalysis == true });
    if (energyAnalysisItems.length > 0) {
      if (selectedAnalysisItems.length != 0) {
        this.latestEnergyAnalysisItem = _.maxBy(selectedAnalysisItems, 'reportYear');
      } else {
        this.latestEnergyAnalysisItem = _.maxBy(energyAnalysisItems, 'reportYear');
      }
    } else {
      this.latestEnergyAnalysisItem = undefined;
    }

  }

  setLatestWaterAnalysisItem() {
    let analysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    let waterAnalysisItems: Array<IdbAccountAnalysisItem> = analysisItems.filter(item => { return item.analysisCategory == 'water' });
    let selectedAnalysisItems: Array<IdbAccountAnalysisItem> = waterAnalysisItems.filter(item => { return item.selectedYearAnalysis == true });
    if (waterAnalysisItems.length > 0) {
      if (selectedAnalysisItems.length != 0) {
        this.latestWaterAnalysisItem = _.maxBy(selectedAnalysisItems, 'reportYear');
      } else {
        this.latestWaterAnalysisItem = _.maxBy(waterAnalysisItems, 'reportYear');
      }
    } else {
      this.latestWaterAnalysisItem = undefined;
    }
  }



  // setCalanderizedMeters() {
  //   let analysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
  //   let selectedAnalysisItems: Array<IdbAccountAnalysisItem> = analysisItems.filter(item => { return item.selectedYearAnalysis == true });
  //   if (selectedAnalysisItems.length != 0) {
  //     this.latestAnalysisItem = _.maxBy(selectedAnalysisItems, 'reportYear');
  //   } else {
  //     this.latestAnalysisItem = _.maxBy(analysisItems, 'reportYear');
  //   }
  //   if (this.latestAnalysisItem) {
  //     let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
  //     let calanderizationOptions: CalanderizationOptions = {
  //       energyIsSource: this.latestAnalysisItem.energyIsSource
  //     }
  //     let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
  //     let calanderizedMeterData: Array<CalanderizedMeter> = this.calendarizationService.getCalanderizedMeterData(accountMeters, true, false, calanderizationOptions);

  //     calanderizedMeterData.forEach(calanderizedMeter => {
  //       calanderizedMeter.monthlyData = this.convertMeterDataService.convertMeterDataToAnalysis(this.latestAnalysisItem, calanderizedMeter.monthlyData, selectedAccount, calanderizedMeter.meter);
  //     });
  //     this.calanderizedMeters = calanderizedMeterData;
  //   } else {
  //     let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
  //     this.calanderizedMeters = this.calendarizationService.getCalanderizedMeterData(accountMeters, true, false, undefined);
  //   }
  // }
}
