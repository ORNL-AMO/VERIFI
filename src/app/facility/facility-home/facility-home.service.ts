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


  // calanderizedMeters: Array<CalanderizedMeter>;
  latestEnergyAnalysisItem: IdbAnalysisItem;
  annualEnergyAnalysisSummary: BehaviorSubject<Array<AnnualAnalysisSummary>>;
  monthlyFacilityEnergyAnalysisData: BehaviorSubject<Array<MonthlyAnalysisSummaryData>>;
  latestWaterAnalysisItem: IdbAnalysisItem;
  annualWaterAnalysisSummary: BehaviorSubject<Array<AnnualAnalysisSummary>>;
  monthlyFacilityWaterAnalysisData: BehaviorSubject<Array<MonthlyAnalysisSummaryData>>;
  calculatingEnergy: BehaviorSubject<boolean | 'error'>;
  calculatingWater: BehaviorSubject<boolean | 'error'>;
  constructor(private analysisDbService: AnalysisDbService, private utilityMeterDbService: UtilityMeterdbService,
    private calendarizationService: CalanderizationService,
    private convertMeterDataService: ConvertMeterDataService) {
    this.annualEnergyAnalysisSummary = new BehaviorSubject<Array<AnnualAnalysisSummary>>(undefined);
    this.monthlyFacilityEnergyAnalysisData = new BehaviorSubject<Array<MonthlyAnalysisSummaryData>>(undefined);
    
    this.annualWaterAnalysisSummary = new BehaviorSubject<Array<AnnualAnalysisSummary>>(undefined);
    this.monthlyFacilityWaterAnalysisData = new BehaviorSubject<Array<MonthlyAnalysisSummaryData>>(undefined);

    this.calculatingEnergy = new BehaviorSubject<boolean>(true);
    this.calculatingWater = new BehaviorSubject<boolean>(true);
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
    }else{
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
    }else{
      this.latestWaterAnalysisItem = undefined;
    }
  }

  // setCalanderizedMeters(selectedFacility: IdbFacility) {
  //   let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
  //   let facilityAnalysisItems: Array<IdbAnalysisItem> = accountAnalysisItems.filter(item => { return item.facilityId == selectedFacility.guid && item.analysisCategory == 'energy' });
  //   let selectedAnalysisItems: Array<IdbAnalysisItem> = facilityAnalysisItems.filter(item => { return item.selectedYearAnalysis == true });
  //   if (selectedAnalysisItems.length != 0) {
  //     this.latestAnalysisItem = _.maxBy(selectedAnalysisItems, 'reportYear');
  //   } else {
  //     this.latestAnalysisItem = _.maxBy(facilityAnalysisItems, 'reportYear');
  //   }
  //   if (this.latestAnalysisItem) {
  //     let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
  //     let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == selectedFacility.guid });
  //     let calanderizationOptions: CalanderizationOptions = {
  //       energyIsSource: this.latestAnalysisItem.energyIsSource
  //     }
  //     let calanderizedMeterData: Array<CalanderizedMeter> = this.calendarizationService.getCalanderizedMeterData(facilityMeters, true, false, calanderizationOptions);
  //     calanderizedMeterData.forEach(calanderizedMeter => {
  //       calanderizedMeter.monthlyData = this.convertMeterDataService.convertMeterDataToAnalysis(this.latestAnalysisItem, calanderizedMeter.monthlyData, selectedFacility, calanderizedMeter.meter);
  //     });
  //     this.calanderizedMeters = calanderizedMeterData;
  //   } else {
  //     this.calanderizedMeters = undefined;
  //   }
  // }
}
