import { Component, OnInit } from '@angular/core';
import { AnnualFacilityAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { AnalysisService } from '../../analysis.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';

@Component({
  selector: 'app-facility-analysis',
  templateUrl: './facility-analysis.component.html',
  styleUrls: ['./facility-analysis.component.css']
})
export class FacilityAnalysisComponent implements OnInit {


  worker: Worker;
  constructor(
    private analysisDbService: AnalysisDbService,
    private facilityDbService: FacilitydbService,
    private analysisService: AnalysisService,
    private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService
  ) { }

  ngOnInit(): void {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    let accountPredictorEntries: Array<IdbPredictorData> = this.predictorDataDbService.accountPredictorData.getValue();
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/annual-facility-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.worker.terminate();
        if (!data.error) {
          this.analysisService.annualAnalysisSummary.next(data.annualAnalysisSummaries);
          this.analysisService.monthlyAccountAnalysisData.next(data.monthlyAnalysisSummaryData);
          this.analysisService.calculating.next(false);
        } else {
          this.analysisService.annualAnalysisSummary.next(undefined);
          this.analysisService.monthlyAccountAnalysisData.next(undefined);
          this.analysisService.calculating.next('error');
        }
      };
      this.analysisService.calculating.next(true)
      this.worker.postMessage({
        analysisItem: analysisItem,
        facility: facility,
        meters: facilityMeters,
        meterData: facilityMeterData,
        accountPredictorEntries: accountPredictorEntries,
        calculateAllMonthlyData: false,
        accountPredictors: accountPredictors,
        accountAnalysisItems: accountAnalysisItems
      });
    } else {
      // Web Workers are not supported in this environment.     
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, facilityMeterData, facility, false, { energyIsSource: analysisItem.energyIsSource, neededUnits: getNeededUnits(analysisItem) }, [], [], [facility]);
      let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(analysisItem, facility, calanderizedMeters, accountPredictorEntries, false, accountPredictors, accountAnalysisItems, false);
      let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
      this.analysisService.annualAnalysisSummary.next(annualAnalysisSummaries);
      this.analysisService.monthlyAccountAnalysisData.next(monthlyAnalysisSummaryData);
    }
  }

  ngOnDestroy() {
    if (this.worker) {
      this.worker.terminate();
    }
  }
}
