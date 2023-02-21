import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from 'src/app/models/idb';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { AnnualGroupAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualGroupAnalysisSummaryClass';

@Component({
  selector: 'app-annual-analysis-summary',
  templateUrl: './annual-analysis-summary.component.html',
  styleUrls: ['./annual-analysis-summary.component.css']
})
export class AnnualAnalysisSummaryComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  analysisItem: IdbAnalysisItem;
  group: AnalysisGroup;
  facility: IdbFacility;
  annualAnalysisSummary: Array<AnnualAnalysisSummary>;
  worker: Worker;
  calculating: boolean;
  constructor(private analysisService: AnalysisService, private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService,
     private predictorDbService: PredictordbService) {
  }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.group = this.analysisService.selectedGroup.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = this.analysisService.calanderizedMeters;
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();

    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/annual-group-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.annualAnalysisSummary = data;
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
      let annualAnalysisSummaryClass: AnnualGroupAnalysisSummaryClass = new AnnualGroupAnalysisSummaryClass(this.group, this.analysisItem, this.facility, calanderizedMeters, accountPredictorEntries);
      this.annualAnalysisSummary = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
    }


  }

  ngOnDestroy() {
    if (this.worker) {
      this.worker.terminate();
    }
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}
