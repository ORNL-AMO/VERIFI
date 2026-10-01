import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { CalanderizedMeter } from '@data/models/calanderization';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';

@Injectable({
  providedIn: 'root'
})
export class AccountAnalysisService {

  calculating: BehaviorSubject<boolean | 'error'>;
  annualAnalysisSummary: BehaviorSubject<Array<AnnualAnalysisSummary>>;
  monthlyAccountAnalysisData: BehaviorSubject<Array<MonthlyAnalysisSummaryData>>;
  facilitySummaries: BehaviorSubject<Array<{ facility: IdbFacility, analysisItem: IdbAnalysisItem, monthlySummaryData: Array<MonthlyAnalysisSummaryData> }>>;

  hideInUseMessage: BehaviorSubject<boolean>;

  calanderizedMeters: BehaviorSubject<Array<CalanderizedMeter>>;
  constructor() {
    this.calculating = new BehaviorSubject<boolean>(true);
    this.annualAnalysisSummary = new BehaviorSubject([]);
    this.monthlyAccountAnalysisData = new BehaviorSubject([]);
    this.facilitySummaries = new BehaviorSubject([]);
    this.hideInUseMessage = new BehaviorSubject<boolean>(false);
    this.calanderizedMeters = new BehaviorSubject([]);
  }
}
