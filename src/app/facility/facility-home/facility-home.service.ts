import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idb';
import * as _ from 'lodash';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilityOverviewData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Injectable({
  providedIn: 'root'
})
export class FacilityHomeService {


  latestEnergyAnalysisItem: IdbAnalysisItem;
  annualEnergyAnalysisSummary: BehaviorSubject<Array<AnnualAnalysisSummary>>;
  monthlyFacilityEnergyAnalysisData: BehaviorSubject<Array<MonthlyAnalysisSummaryData>>;
  latestWaterAnalysisItem: IdbAnalysisItem;
  annualWaterAnalysisSummary: BehaviorSubject<Array<AnnualAnalysisSummary>>;
  monthlyFacilityWaterAnalysisData: BehaviorSubject<Array<MonthlyAnalysisSummaryData>>;
  calculatingEnergy: BehaviorSubject<boolean | 'error'>;
  calculatingWater: BehaviorSubject<boolean | 'error'>;
  calculatingOverview: BehaviorSubject<boolean | 'error'>;
  facilityOverviewData: BehaviorSubject<FacilityOverviewData>;
  constructor(private analysisDbService: AnalysisDbService) {
    this.annualEnergyAnalysisSummary = new BehaviorSubject<Array<AnnualAnalysisSummary>>(undefined);
    this.monthlyFacilityEnergyAnalysisData = new BehaviorSubject<Array<MonthlyAnalysisSummaryData>>(undefined);

    this.annualWaterAnalysisSummary = new BehaviorSubject<Array<AnnualAnalysisSummary>>(undefined);
    this.monthlyFacilityWaterAnalysisData = new BehaviorSubject<Array<MonthlyAnalysisSummaryData>>(undefined);

    this.calculatingEnergy = new BehaviorSubject<boolean>(true);
    this.calculatingWater = new BehaviorSubject<boolean>(true);
    this.calculatingOverview = new BehaviorSubject<boolean | 'error'>(true);
    this.facilityOverviewData = new BehaviorSubject<FacilityOverviewData>(undefined);
  }

  setLatestEnergyAnalysisItem(selectedFacility: IdbFacility) {
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let facilityAnalysisItems: Array<IdbAnalysisItem> = accountAnalysisItems.filter(item => { return item.facilityId == selectedFacility.guid && item.analysisCategory == 'energy' });
    if (facilityAnalysisItems.length > 0) {
      let selectedAnalysisItems: Array<IdbAnalysisItem> = facilityAnalysisItems.filter(item => { return item.selectedYearAnalysis == true });
      if (selectedAnalysisItems.length != 0) {
        this.latestEnergyAnalysisItem = _.maxBy(selectedAnalysisItems, 'reportYear');
      } else {
        this.latestEnergyAnalysisItem = _.maxBy(facilityAnalysisItems, 'reportYear');
      }
    } else {
      this.latestEnergyAnalysisItem = undefined;
    }
  }

  setLatestWaterAnalysisItem(selectedFacility: IdbFacility) {
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let facilityAnalysisItems: Array<IdbAnalysisItem> = accountAnalysisItems.filter(item => { return item.facilityId == selectedFacility.guid && item.analysisCategory == 'water' });
    if (facilityAnalysisItems.length > 0) {
      let selectedAnalysisItems: Array<IdbAnalysisItem> = facilityAnalysisItems.filter(item => { return item.selectedYearAnalysis == true });
      if (selectedAnalysisItems.length != 0) {
        this.latestWaterAnalysisItem = _.maxBy(selectedAnalysisItems, 'reportYear');
      } else {
        this.latestWaterAnalysisItem = _.maxBy(facilityAnalysisItems, 'reportYear');
      }
    } else {
      this.latestWaterAnalysisItem = undefined;
    }
  }
}
