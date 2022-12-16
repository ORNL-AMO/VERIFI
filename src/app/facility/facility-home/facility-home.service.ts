import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizationOptions, CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAnalysisItem, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import * as _ from 'lodash';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { ConvertMeterDataService } from 'src/app/shared/helper-services/convert-meter-data.service';

@Injectable({
  providedIn: 'root'
})
export class FacilityHomeService {


  calanderizedMeters: Array<CalanderizedMeter>;
  latestAnalysisItem: IdbAnalysisItem;
  annualAnalysisSummary: BehaviorSubject<Array<AnnualAnalysisSummary>>;
  monthlyFacilityAnalysisData: BehaviorSubject<Array<MonthlyAnalysisSummaryData>>;
  calculating: BehaviorSubject<boolean>;
  constructor(private analysisDbService: AnalysisDbService, private utilityMeterDbService: UtilityMeterdbService,
    private calendarizationService: CalanderizationService,
    private convertMeterDataService: ConvertMeterDataService) {
    this.annualAnalysisSummary = new BehaviorSubject<Array<AnnualAnalysisSummary>>(undefined);
    this.monthlyFacilityAnalysisData = new BehaviorSubject<Array<MonthlyAnalysisSummaryData>>(undefined);
    this.calculating = new BehaviorSubject<boolean>(true);
  }


  setCalanderizedMeters(selectedFacility: IdbFacility) {
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let facilityAnalysisItems: Array<IdbAnalysisItem> = accountAnalysisItems.filter(item => { return item.facilityId == selectedFacility.guid });
    let selectedAnalysisItems: Array<IdbAnalysisItem> = facilityAnalysisItems.filter(item => { return item.selectedYearAnalysis == true });
    if (selectedAnalysisItems.length != 0) {
      this.latestAnalysisItem = _.maxBy(selectedAnalysisItems, 'reportYear');
    } else {
      this.latestAnalysisItem = _.maxBy(facilityAnalysisItems, 'reportYear');
    }
    if (this.latestAnalysisItem) {
      let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
      let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == selectedFacility.guid });
      let calanderizationOptions: CalanderizationOptions = {
        energyIsSource: this.latestAnalysisItem.energyIsSource
      }
      let calanderizedMeterData: Array<CalanderizedMeter> = this.calendarizationService.getCalanderizedMeterData(facilityMeters, true, false, calanderizationOptions);
      calanderizedMeterData.forEach(calanderizedMeter => {
        calanderizedMeter.monthlyData = this.convertMeterDataService.convertMeterDataToAnalysis(this.latestAnalysisItem, calanderizedMeter.monthlyData, selectedFacility, calanderizedMeter.meter);
      });
      this.calanderizedMeters = calanderizedMeterData;
    } else {
      this.calanderizedMeters = undefined;
    }
  }
}
