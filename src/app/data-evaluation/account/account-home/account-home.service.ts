import { Injectable } from '@angular/core';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import * as _ from 'lodash';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { BehaviorSubject } from 'rxjs';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

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

  setLatestEnergyAnalysisItem(analysisItemId: string) {
    let analysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    if (analysisItemId) {
      let selectedAnalysisItem: IdbAccountAnalysisItem = analysisItems.find(item => { return item.guid == analysisItemId });
      this.latestEnergyAnalysisItem = selectedAnalysisItem;
    } else {
      let energyAnalysisItems: Array<IdbAccountAnalysisItem> = analysisItems.filter(item => { return item.analysisCategory == 'energy' });
      if (energyAnalysisItems.length > 0) {
        this.latestEnergyAnalysisItem = _.maxBy(energyAnalysisItems, 'reportYear');
      }
      else {
        this.latestEnergyAnalysisItem = undefined;
      }
    }
  }

  setLatestWaterAnalysisItem(analysisItemId: string) {
    let analysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    if (analysisItemId) {
      let selectedAnalysisItem: IdbAccountAnalysisItem = analysisItems.find(item => { return item.guid == analysisItemId });
      this.latestWaterAnalysisItem = selectedAnalysisItem;
    } else {
      let waterAnalysisItems: Array<IdbAccountAnalysisItem> = analysisItems.filter(item => { return item.analysisCategory == 'water' });
      if (waterAnalysisItems.length > 0) {
        this.latestWaterAnalysisItem = _.maxBy(waterAnalysisItems, 'reportYear');
      }
      else {
        this.latestWaterAnalysisItem = undefined;
      }
    }
  }
}
