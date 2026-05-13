import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import * as _ from 'lodash';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilityOverviewData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';

@Injectable({
  providedIn: 'root'
})
export class FacilityHomeService {


  latestEnergyAnalysisItem: BehaviorSubject<IdbAnalysisItem>;
  annualEnergyAnalysisSummary: BehaviorSubject<Array<AnnualAnalysisSummary>>;
  monthlyFacilityEnergyAnalysisData: BehaviorSubject<Array<MonthlyAnalysisSummaryData>>;
  latestWaterAnalysisItem: BehaviorSubject<IdbAnalysisItem>;
  annualWaterAnalysisSummary: BehaviorSubject<Array<AnnualAnalysisSummary>>;
  monthlyFacilityWaterAnalysisData: BehaviorSubject<Array<MonthlyAnalysisSummaryData>>;
  calculatingEnergy: BehaviorSubject<boolean | 'error'>;
  calculatingWater: BehaviorSubject<boolean | 'error'>;
  calculatingOverview: BehaviorSubject<boolean | 'error'>;
  facilityOverviewData: BehaviorSubject<FacilityOverviewData>;
  facilityStatusCheck: BehaviorSubject<FacilityStatusCheck>;
  constructor(private analysisDbService: AnalysisDbService) {
    this.annualEnergyAnalysisSummary = new BehaviorSubject<Array<AnnualAnalysisSummary>>(undefined);
    this.monthlyFacilityEnergyAnalysisData = new BehaviorSubject<Array<MonthlyAnalysisSummaryData>>(undefined);

    this.annualWaterAnalysisSummary = new BehaviorSubject<Array<AnnualAnalysisSummary>>(undefined);
    this.monthlyFacilityWaterAnalysisData = new BehaviorSubject<Array<MonthlyAnalysisSummaryData>>(undefined);

    this.calculatingEnergy = new BehaviorSubject<boolean>(true);
    this.calculatingWater = new BehaviorSubject<boolean>(true);
    this.calculatingOverview = new BehaviorSubject<boolean | 'error'>(true);
    this.facilityOverviewData = new BehaviorSubject<FacilityOverviewData>(undefined);
    this.latestEnergyAnalysisItem = new BehaviorSubject<IdbAnalysisItem>(undefined);
    this.latestWaterAnalysisItem = new BehaviorSubject<IdbAnalysisItem>(undefined);
    this.facilityStatusCheck = new BehaviorSubject<FacilityStatusCheck>(undefined);
  }

  setLatestEnergyAnalysisItem(selectedFacility: IdbFacility) {
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    if (selectedFacility.selectedEnergyAnalysisId) {
      let selectedAnalysisItem: IdbAnalysisItem = accountAnalysisItems.find(item => { return item.guid == selectedFacility.selectedEnergyAnalysisId });
      this.latestEnergyAnalysisItem.next(selectedAnalysisItem);
    } else {
      let facilityAnalysisItems: Array<IdbAnalysisItem> = accountAnalysisItems.filter(item => { return item.facilityId == selectedFacility.guid && item.analysisCategory == 'energy' });
      if (facilityAnalysisItems.length > 0) {
        this.latestEnergyAnalysisItem.next(_.maxBy(facilityAnalysisItems, 'modifiedDate'));

      } else {
        this.latestEnergyAnalysisItem.next(undefined);
      }
    }
  }

  setLatestWaterAnalysisItem(selectedFacility: IdbFacility) {
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    if (selectedFacility.selectedWaterAnalysisId) {
      let selectedAnalysisItem: IdbAnalysisItem = accountAnalysisItems.find(item => { return item.guid == selectedFacility.selectedWaterAnalysisId });
      this.latestWaterAnalysisItem.next(selectedAnalysisItem);
    } else {
      let facilityAnalysisItems: Array<IdbAnalysisItem> = accountAnalysisItems.filter(item => { return item.facilityId == selectedFacility.guid && item.analysisCategory == 'water' });
      if (facilityAnalysisItems.length > 0) {
        this.latestWaterAnalysisItem.next(_.maxBy(facilityAnalysisItems, 'modifiedDate'));
      } else {
        this.latestWaterAnalysisItem.next(undefined);
      }
    }
  }
}
