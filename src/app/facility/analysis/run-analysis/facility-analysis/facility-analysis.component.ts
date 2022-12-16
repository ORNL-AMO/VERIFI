import { Component, OnInit } from '@angular/core';
import { AnnualFacilityAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from 'src/app/models/idb';
import { AnalysisService } from '../../analysis.service';

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
    private predictorDbService: PredictordbService
  ) { }

  ngOnInit(): void {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = this.analysisService.calanderizedMeters;
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/annual-facility-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.worker.terminate();
        this.analysisService.annualAnalysisSummary.next(data.annualAnalysisSummaries);
        this.analysisService.monthlyAccountAnalysisData.next(data.monthlyAnalysisSummaryData);
        this.analysisService.calculating.next(false);
      };
      this.analysisService.calculating.next(true)
      this.worker.postMessage({
        analysisItem: analysisItem,
        facility: facility,
        calanderizedMeters: calanderizedMeters,
        accountPredictorEntries: accountPredictorEntries,
        calculateAllMonthlyData: false
      });
    } else {
      // Web Workers are not supported in this environment.
      let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(analysisItem, facility, calanderizedMeters, accountPredictorEntries, false); let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
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
