import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { SEPReport } from 'src/app/calculations/facility-reports/sepReport';
import { getNeededUnits } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { FacilityReportsService } from '../facility-reports.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';

@Component({
  selector: 'app-facility-sep-report-results',
  templateUrl: './facility-sep-report-results.component.html',
  styleUrl: './facility-sep-report-results.component.css',
  standalone: false
})
export class FacilitySepReportResultsComponent {

  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;

  analysisItem: IdbAnalysisItem;
  worker: Worker;
  sepReport: SEPReport;
  calculating: boolean | 'error' = true;
  print: boolean;
  printSub: Subscription;
  facility: IdbFacility;
  account: IdbAccount;
  constructor(private facilityReportsDbService: FacilityReportsDbService,
    private analysisDbService: AnalysisDbService,
    private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorDataDbService: PredictorDataDbService,
    private predictorDbService: PredictorDbService,
    private facilityReportService: FacilityReportsService,
    private accountDbService: AccountdbService
  ) {

  }

  ngOnInit() {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facility = this.facilityDbService.getFacilityById(report.facilityId);
      this.account = this.accountDbService.selectedAccount.getValue();
      this.facilityReport = report;
      this.analysisItem = this.analysisDbService.getByGuid(this.facilityReport.analysisItemId);
      this.setReport();
    });

    this.printSub = this.facilityReportService.print.subscribe(print => {
      this.print = print;
    })
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
    if (this.worker) {
      this.worker.terminate();
    }
    this.printSub.unsubscribe();
  }

  setReport() {
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    let accountPredictorEntries: Array<IdbPredictorData> = this.predictorDataDbService.accountPredictorData.getValue();
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/sep-report.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.worker.terminate();
        this.sepReport = data.sepReport;
        this.calculating = false;
      };

      this.worker.postMessage({
        analysisItem: this.analysisItem,
        facility: this.facility,
        meters: facilityMeters,
        meterData: facilityMeterData,
        accountPredictorEntries: accountPredictorEntries,
        calculateAllMonthlyData: false,
        accountPredictors: accountPredictors,
        accountAnalysisItems: accountAnalysisItems
      });
    } else {
      // Web Workers are not supported in this environment.     
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, facilityMeterData, this.facility, false, { energyIsSource: this.analysisItem.energyIsSource, neededUnits: getNeededUnits(this.analysisItem) }, [], [], [this.facility]);
      this.sepReport = new SEPReport(this.analysisItem, this.facility, calanderizedMeters, accountPredictorEntries, false, accountPredictors, accountAnalysisItems);
      this.calculating = false;
    }
  }

}
