import { Component, Input } from '@angular/core';
import { get } from 'http';
import { AnnualAccountAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualAccountAnalysisSummaryClass';
import { AnnualFacilityAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { AccountReportsService } from '../../account-reports.service';
import { Subscription } from 'rxjs';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';

@Component({
  selector: 'app-annual-savings-summary-table',
  standalone: false,

  templateUrl: './annual-savings-summary-table.component.html',
  styleUrl: './annual-savings-summary-table.component.css'
})
export class AnnualSavingsSummaryTableComponent {

  @Input()
  selectedAnalysisItem: IdbAccountAnalysisItem;
  @Input()
  account: IdbAccount;
  @Input()
  selectedReport: IdbAccountReport;

  printSub: Subscription;
  print: boolean;
  calculating: boolean | 'error';
  annualAnalysisSummary: Array<AnnualAnalysisSummary>;
  accountAnalysisItems: Array<IdbAccountAnalysisItem>;
  worker: Worker;
  monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = [];
  facilitySummaries: Array<{ facility: IdbFacility, analysisItem: IdbAnalysisItem, monthlySummaryData: Array<MonthlyAnalysisSummaryData> }> = [];
  annualFacilityAnalysisSummaries: Array<AnnualAnalysisSummary> = [];
  accountPredictorEntries: Array<IdbPredictorData> = [];
  accountPredictors: Array<IdbPredictor> = [];
  meters: Array<IdbUtilityMeter> = [];
  meterData: Array<IdbUtilityMeterData> = [];
  facilitySummariesWithAnnual: Array<{ facilitySummary: { facility: IdbFacility, analysisItem: IdbAnalysisItem, monthlySummaryData: Array<MonthlyAnalysisSummaryData> }, annualFacilityAnalysisSummaries: Array<AnnualAnalysisSummary> }> = [];
  constructor(
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private analysisDbService: AnalysisDbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private accountReportsService: AccountReportsService,
  ) { }

  ngOnInit(): void {
    this.printSub = this.accountReportsService.print.subscribe(print => {
      this.print = print;
    });

    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    this.accountPredictorEntries = this.predictorDataDbService.accountPredictorData.getValue();
    this.accountPredictors = this.predictorDbService.accountPredictors.getValue();
    let analysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    this.meters = this.utilityMeterDbService.accountMeters.getValue();
    this.meterData = this.utilityMeterDataDbService.accountMeterData.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/annual-account-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.worker.terminate();
        if (!data.error) {
          this.annualAnalysisSummary = data.annualAnalysisSummaries;
          this.monthlyAnalysisSummaryData = data.monthlyAnalysisSummaryData;
          this.facilitySummaries = data.facilitySummaries;
          this.calculating = false;
          console.log('data', data);
          this.getFacilityData();
        } else {
          this.calculating = 'error';
        }
      };
      this.calculating = true;
      this.worker.postMessage({
        accountAnalysisItem: this.selectedAnalysisItem,
        account: this.account,
        accountFacilities: accountFacilities,
        accountPredictorEntries: this.accountPredictorEntries,
        allAccountAnalysisItems: analysisItems,
        calculateAllMonthlyData: false,
        meters: this.meters,
        meterData: this.meterData,
        accountPredictors: this.accountPredictors
      });
    } else {
      // Web Workers are not supported in this environment.
      let annualAnalysisSummaryClass: AnnualAccountAnalysisSummaryClass = new AnnualAccountAnalysisSummaryClass(this.selectedAnalysisItem, this.account, accountFacilities, this.accountPredictorEntries, analysisItems, false, this.meters, this.meterData, this.accountPredictors);
      let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
      this.annualAnalysisSummary = annualAnalysisSummaries;
      this.monthlyAnalysisSummaryData = monthlyAnalysisSummaryData;
      this.facilitySummaries = annualAnalysisSummaryClass.facilitySummaries;
      this.calculating = false;
      this.getFacilityData();
    }


  }

  getFacilityData() {
    this.facilitySummaries.forEach(facilitySummary => {
      let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(facilitySummary.analysisItem.facilityId);
      let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getFacilityMeterDataByFacilityGuid(facilitySummary.analysisItem.facilityId);
      let accountPredictorEntries: Array<IdbPredictorData> = this.predictorDataDbService.getByFacilityId(facilitySummary.analysisItem.facilityId);
      let accountPredictors: Array<IdbPredictor> = this.predictorDbService.getByFacilityId(facilitySummary.analysisItem.facilityId);
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, facilityMeterData, facilitySummary.facility, false, { energyIsSource: facilitySummary.analysisItem.energyIsSource, neededUnits: getNeededUnits(facilitySummary.analysisItem) }, [], [], [facilitySummary.facility], this.account.assessmentReportVersion);
      let annualFacilityAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(facilitySummary.analysisItem, facilitySummary.facility, calanderizedMeters, accountPredictorEntries, false, accountPredictors, undefined, true);
      this.annualFacilityAnalysisSummaries = annualFacilityAnalysisSummaryClass.getAnnualAnalysisSummaries();
      this.facilitySummariesWithAnnual.push({
        facilitySummary,
        annualFacilityAnalysisSummaries: this.annualFacilityAnalysisSummaries
      });
    });
  }

  ngOnDestroy() {
    if (this.worker) {
      this.worker.terminate();
    }
    this.printSub.unsubscribe();
  }
}

