import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MonthlyFacilityAnalysisClass } from 'src/app/calculations/analysis-calculations/monthlyFacilityAnalysisClass';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Injectable({
  providedIn: 'root'
})
export class AccountAnalysisService {

  selectedFacility: BehaviorSubject<IdbFacility>;
  calculating: BehaviorSubject<boolean | 'error'>;
  annualAnalysisSummary: BehaviorSubject<Array<AnnualAnalysisSummary>>;
  monthlyAccountAnalysisData: BehaviorSubject<Array<MonthlyAnalysisSummaryData>>;
  facilitySummaries: BehaviorSubject<Array<{ facility: IdbFacility, analysisItem: IdbAnalysisItem, monthlySummaryData: Array<MonthlyAnalysisSummaryData> }>>;

  hideInUseMessage: boolean = false;
  constructor() {
    this.selectedFacility = new BehaviorSubject<IdbFacility>(undefined);
    this.calculating = new BehaviorSubject<boolean>(true);
    this.annualAnalysisSummary = new BehaviorSubject([]);
    this.monthlyAccountAnalysisData = new BehaviorSubject([]);
    this.facilitySummaries = new BehaviorSubject([]);
  }
}
