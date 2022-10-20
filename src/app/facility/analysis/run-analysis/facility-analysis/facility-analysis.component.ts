import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from 'src/app/models/idb';
import { WebWorkerService, WorkerRequest } from 'src/app/web-workers/web-worker.service';
import { AnalysisService } from '../../analysis.service';
@Component({
  selector: 'app-facility-analysis',
  templateUrl: './facility-analysis.component.html',
  styleUrls: ['./facility-analysis.component.css']
})
export class FacilityAnalysisComponent implements OnInit {


  worker: Worker;
  resultsSub: Subscription;
  constructor(
    private analysisDbService: AnalysisDbService,
    private facilityDbService: FacilitydbService,
    private analysisService: AnalysisService,
    private predictorDbService: PredictordbService,
    private webWorkerService: WebWorkerService
  ) { }

  ngOnInit(): void {
    let calanderizedMeters: Array<CalanderizedMeter> = this.analysisService.calanderizedMeters;
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let workerAnnualRequest: WorkerRequest = {
      type: 'annualFacilityAnalysis',
      id: this.webWorkerService.getID(),
      results: undefined,
      input: {
        analysisItem: analysisItem,
        facility: facility,
        calanderizedMeters: calanderizedMeters,
        accountPredictorEntries: accountPredictorEntries
      }
    }

    this.resultsSub = this.webWorkerService.workerResults.subscribe(val => {
      if (val && val.id == workerAnnualRequest.id) {
        this.analysisService.annualAnalysisSummary.next(val.results.annualAnalysisSummary);
        this.analysisService.monthlyAccountAnalysisData.next(val.results.monthlyAnalysisSummaryData);
        this.analysisService.calculating.next(false);
      }
    });

    this.analysisService.calculating.next(true);
    this.webWorkerService.addRequest(workerAnnualRequest);

  }

  ngOnDestroy() {
    this.resultsSub.unsubscribe();
  }
}
