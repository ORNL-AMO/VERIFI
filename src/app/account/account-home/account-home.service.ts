import { Injectable } from '@angular/core';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAccountAnalysisItem } from 'src/app/models/idb';
import * as _ from 'lodash';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { BehaviorSubject } from 'rxjs';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';

@Injectable({
  providedIn: 'root'
})
export class AccountHomeService {

  latestEnergyAnalysisItem: IdbAccountAnalysisItem;
  latestWaterAnalysisItem: IdbAccountAnalysisItem;
  annualEnergyAnalysisSummary: BehaviorSubject<Array<AnnualAnalysisSummary>>;
  monthlyEnergyAnalysisData: BehaviorSubject<Array<MonthlyAnalysisSummaryData>>;
  annualWaterAnalysisSummary: BehaviorSubject<Array<AnnualAnalysisSummary>>;
  monthlyWaterAnalysisData: BehaviorSubject<Array<MonthlyAnalysisSummaryData>>;
  calculatingEnergy: BehaviorSubject<boolean | 'error'>;
  calculatingWater: BehaviorSubject<boolean | 'error'>;
  calculatingOverview: BehaviorSubject<boolean | 'error'>;
  accountOverviewData: BehaviorSubject<AccountOverviewData>;

  constructor(private accountAnalysisDbService: AccountAnalysisDbService) {
    this.annualEnergyAnalysisSummary = new BehaviorSubject<Array<AnnualAnalysisSummary>>(undefined);
    this.monthlyEnergyAnalysisData = new BehaviorSubject<Array<MonthlyAnalysisSummaryData>>(undefined);
    this.annualWaterAnalysisSummary = new BehaviorSubject<Array<AnnualAnalysisSummary>>(undefined);
    this.monthlyWaterAnalysisData = new BehaviorSubject<Array<MonthlyAnalysisSummaryData>>(undefined);
    this.calculatingEnergy = new BehaviorSubject<boolean | 'error'>(true);
    this.calculatingWater = new BehaviorSubject<boolean | 'error'>(true);
    this.calculatingOverview = new BehaviorSubject<boolean | 'error'>(true);
    this.accountOverviewData = new BehaviorSubject<AccountOverviewData>(undefined);
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
}
