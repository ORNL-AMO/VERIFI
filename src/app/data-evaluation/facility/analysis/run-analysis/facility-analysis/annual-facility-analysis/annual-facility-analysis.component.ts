import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { AnnualFacilityAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';

@Component({
  selector: 'app-annual-facility-analysis',
  templateUrl: './annual-facility-analysis.component.html',
  styleUrls: ['./annual-facility-analysis.component.css'],
  standalone: false
})
export class AnnualFacilityAnalysisComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  analysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  calculating: boolean | 'error';
  annualAnalysisSummary: Array<AnnualAnalysisSummary>;
  calculatingSub: Subscription;
  annualAnalysisSummarySub: Subscription;
  worker: Worker;
  groupSummaries: Array<{
    group: AnalysisGroup,
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
    annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
  }>;
  calculatingGroupSummaries: boolean | 'error';

  constructor(private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService, 
    private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService, 
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorDbService: PredictorDbService, 
    private predictorDataDbService: PredictorDataDbService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(this.analysisItem.facilityId);
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getFacilityMeterDataByFacilityGuid(this.analysisItem.facilityId);
    let accountPredictorEntries: Array<IdbPredictorData> = this.predictorDataDbService.getByFacilityId(this.analysisItem.facilityId);
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.getByFacilityId(this.analysisItem.facilityId);
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();

    this.calculatingSub = this.analysisService.calculating.subscribe(val => {
      this.calculating = val;
    });
    this.annualAnalysisSummarySub = this.analysisService.annualAnalysisSummary.subscribe(val => {
      this.annualAnalysisSummary = val;
    });

    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/annual-facility-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.worker.terminate();
        if (!data.error) {
          this.groupSummaries = data.groupSummaries;
          this.calculatingGroupSummaries = false;
        } else {
          this.calculatingGroupSummaries = 'error';
        }
      };
      this.calculatingGroupSummaries = true;
      this.worker.postMessage({
        analysisItem: this.analysisItem,
        facility: this.facility,
        meters: facilityMeters,
        meterData: facilityMeterData,
        accountPredictorEntries: accountPredictorEntries,
        calculateAllMonthlyData: false,
        accountPredictors: accountPredictors,
        accountAnalysisItems: accountAnalysisItems,
        includeGroupSummaries: true,
        assessmentReportVersion: account.assessmentReportVersion,
      });
    } else {
      // Web Workers are not supported in this environment.     
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, facilityMeterData, this.facility, false, { energyIsSource: this.analysisItem.energyIsSource, neededUnits: getNeededUnits(this.analysisItem) }, [], [], [this.facility], account.assessmentReportVersion);
      let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(this.analysisItem, this.facility, calanderizedMeters, accountPredictorEntries, false, accountPredictors, undefined, true);
      this.groupSummaries = annualAnalysisSummaryClass.groupSummaries;
    }
  }

  ngOnDestroy() {
    this.calculatingSub.unsubscribe();
    this.annualAnalysisSummarySub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}
