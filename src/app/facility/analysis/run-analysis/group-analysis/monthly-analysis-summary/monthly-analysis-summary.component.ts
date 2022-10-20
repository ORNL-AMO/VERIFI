import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { MonthlyAnalysisSummary } from 'src/app/models/analysis';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from 'src/app/models/idb';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { WebWorkerService, WorkerRequest } from 'src/app/web-workers/web-worker.service';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-monthly-analysis-summary',
  templateUrl: './monthly-analysis-summary.component.html',
  styleUrls: ['./monthly-analysis-summary.component.css']
})
export class MonthlyAnalysisSummaryComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  analysisItem: IdbAnalysisItem;
  group: AnalysisGroup;
  monthlyAnalysisSummary: MonthlyAnalysisSummary;
  facility: IdbFacility;
  itemsPerPage: number = 12;
  calculating: boolean = true;
  resultsSub: Subscription;
  constructor(private analysisService: AnalysisService, private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService,
    private webWorkerService: WebWorkerService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.group = this.analysisService.selectedGroup.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = this.analysisService.calanderizedMeters;
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let workerRequest: WorkerRequest = {
      type: 'monthlyGroupAnalysis',
      id: this.webWorkerService.getID(),
      results: undefined,
      input: {
        group: this.group,
        analysisItem: this.analysisItem,
        facility: this.facility,
        calanderizedMeters: calanderizedMeters,
        accountPredictorEntries: accountPredictorEntries
      }
    }


    this.resultsSub = this.webWorkerService.workerResults.subscribe(val => {
      if (val && val.id == workerRequest.id) {
        this.monthlyAnalysisSummary = {
          predictorVariables: this.group.predictorVariables,
          modelYear: undefined,
          monthlyAnalysisSummaryData: val.results
        }
        this.calculating = false;
      }
    });
    this.webWorkerService.addRequest(workerRequest);


  }

  ngOnDestroy() {
    if (this.resultsSub) {
      this.resultsSub.unsubscribe();
    }
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}
