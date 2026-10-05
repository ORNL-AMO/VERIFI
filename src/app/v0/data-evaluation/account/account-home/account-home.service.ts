import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Injectable, inject } from '@angular/core';
import * as _ from 'lodash';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { BehaviorSubject } from 'rxjs';
import { AccountOverviewData } from '@domain/calculations/dashboard-calculations/accountOverviewClass';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';

export type CalculationStatus = boolean | 'error';
export type CombinedCalculationState = 'loading' | 'ready' | 'error';

export function getCombinedCalculationState(primary: CalculationStatus, overview: CalculationStatus): CombinedCalculationState {
  if (primary === true || overview === true) return 'loading';
  if (primary === 'error' || overview === 'error') return 'error';
  return 'ready';
}

@Injectable({
  providedIn: 'root'
})
export class AccountHomeService {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  latestEnergyAnalysisItem: BehaviorSubject<IdbAccountAnalysisItem>;
  latestWaterAnalysisItem: BehaviorSubject<IdbAccountAnalysisItem>;
  annualEnergyAnalysisSummary: BehaviorSubject<Array<AnnualAnalysisSummary>>;
  monthlyEnergyAnalysisData: BehaviorSubject<Array<MonthlyAnalysisSummaryData>>;
  annualWaterAnalysisSummary: BehaviorSubject<Array<AnnualAnalysisSummary>>;
  monthlyWaterAnalysisData: BehaviorSubject<Array<MonthlyAnalysisSummaryData>>;
  calculatingEnergy: BehaviorSubject<CalculationStatus>;
  calculatingWater: BehaviorSubject<CalculationStatus>;
  calculatingOverview: BehaviorSubject<CalculationStatus>;
  accountOverviewData: BehaviorSubject<AccountOverviewData>;

  constructor() {
    this.annualEnergyAnalysisSummary = new BehaviorSubject<Array<AnnualAnalysisSummary>>(undefined);
    this.monthlyEnergyAnalysisData = new BehaviorSubject<Array<MonthlyAnalysisSummaryData>>(undefined);
    this.annualWaterAnalysisSummary = new BehaviorSubject<Array<AnnualAnalysisSummary>>(undefined);
    this.monthlyWaterAnalysisData = new BehaviorSubject<Array<MonthlyAnalysisSummaryData>>(undefined);
    this.calculatingEnergy = new BehaviorSubject<CalculationStatus>(true);
    this.calculatingWater = new BehaviorSubject<CalculationStatus>(true);
    this.calculatingOverview = new BehaviorSubject<CalculationStatus>(true);
    this.accountOverviewData = new BehaviorSubject<AccountOverviewData>(undefined);
    this.latestEnergyAnalysisItem = new BehaviorSubject<IdbAccountAnalysisItem>(undefined);
    this.latestWaterAnalysisItem = new BehaviorSubject<IdbAccountAnalysisItem>(undefined);
  }

  setLatestEnergyAnalysisItem(analysisItemId: string, workspaceAnalysisItems?: readonly IdbAccountAnalysisItem[]): IdbAccountAnalysisItem | undefined {
    let analysisItems: Array<IdbAccountAnalysisItem> = [...(workspaceAnalysisItems ?? this.accountWorkspaceStore.accountAnalyses())];
    let selectedAnalysisItem: IdbAccountAnalysisItem;
    if (analysisItemId) {
      selectedAnalysisItem = analysisItems.find(item => { return item.guid == analysisItemId });
      this.latestEnergyAnalysisItem.next(selectedAnalysisItem);
    } else {
      let energyAnalysisItems: Array<IdbAccountAnalysisItem> = analysisItems.filter(item => { return item.analysisCategory == 'energy' });
      if (energyAnalysisItems.length > 0) {
        selectedAnalysisItem = _.maxBy(energyAnalysisItems, 'modifiedDate');
        this.latestEnergyAnalysisItem.next(selectedAnalysisItem);
      }
      else {
        this.latestEnergyAnalysisItem.next(undefined);
      }
    }
    return selectedAnalysisItem;
  }

  setLatestWaterAnalysisItem(analysisItemId: string, workspaceAnalysisItems?: readonly IdbAccountAnalysisItem[]): IdbAccountAnalysisItem | undefined {
    let analysisItems: Array<IdbAccountAnalysisItem> = [...(workspaceAnalysisItems ?? this.accountWorkspaceStore.accountAnalyses())];
    let selectedAnalysisItem: IdbAccountAnalysisItem;
    if (analysisItemId) {
      selectedAnalysisItem = analysisItems.find(item => { return item.guid == analysisItemId });
      this.latestWaterAnalysisItem.next(selectedAnalysisItem);
    } else {
      let waterAnalysisItems: Array<IdbAccountAnalysisItem> = analysisItems.filter(item => { return item.analysisCategory == 'water' });
      if (waterAnalysisItems.length > 0) {
        selectedAnalysisItem = _.maxBy(waterAnalysisItems, 'modifiedDate');
        this.latestWaterAnalysisItem.next(selectedAnalysisItem);
      }
      else {
        this.latestWaterAnalysisItem.next(undefined);
      }
    }
    return selectedAnalysisItem;
  }
}
