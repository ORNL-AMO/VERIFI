import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { MonthlyAnalysisSummary } from 'src/app/models/analysis';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from 'src/app/models/idb';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { Subscription } from 'rxjs';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { MonthlyAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/monthlyAnalysisSummaryClass';

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
  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  worker: Worker;
  calculating: boolean;
  constructor(private analysisService: AnalysisService, private analysisDbService: AnalysisDbService,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService,
    private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });


    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.group = this.analysisService.selectedGroup.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = this.analysisService.calanderizedMeters;
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/monthly-group-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.monthlyAnalysisSummary = data;
        this.calculating = false;
        this.worker.terminate();
      };
      this.calculating = true;
      this.worker.postMessage({
        selectedGroup: this.group,
        analysisItem: this.analysisItem,
        facility: this.facility,
        calanderizedMeters: calanderizedMeters,
        accountPredictorEntries: accountPredictorEntries
      });
    } else {
      // Web Workers are not supported in this environment.
      let monthlyAnalysisSummaryClass: MonthlyAnalysisSummaryClass = new MonthlyAnalysisSummaryClass(this.group, this.analysisItem, this.facility, calanderizedMeters, accountPredictorEntries, false);
      this.monthlyAnalysisSummary = monthlyAnalysisSummaryClass.getResults();
    }
  }

  ngOnDestroy() {
    if (this.worker) {
      this.worker.terminate();
    }
    this.itemsPerPageSub.unsubscribe();
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }

}
