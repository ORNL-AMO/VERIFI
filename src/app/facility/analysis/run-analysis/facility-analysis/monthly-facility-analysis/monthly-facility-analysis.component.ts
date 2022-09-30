import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { FacilityAnalysisCalculationsService } from 'src/app/shared/shared-analysis/calculations/facility-analysis-calculations.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from 'src/app/models/idb';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';

@Component({
  selector: 'app-monthly-facility-analysis',
  templateUrl: './monthly-facility-analysis.component.html',
  styleUrls: ['./monthly-facility-analysis.component.css']
})
export class MonthlyFacilityAnalysisComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  monthlyFacilityAnalysisData: Array<MonthlyAnalysisSummaryData>;
  analysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  itemsPerPage: number = 12;
  worker: Worker;
  calculating: boolean;
  constructor(private analysisService: AnalysisService, private facilityAnalysisCalculationsService: FacilityAnalysisCalculationsService,
    private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = this.analysisService.calanderizedMeters;
    // this.monthlyFacilityAnalysisData = this.facilityAnalysisCalculationsService.calculateMonthlyFacilityAnalysis(this.analysisItem, this.facility, calanderizedMeters);
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/monthly-facility-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.monthlyFacilityAnalysisData = data;
        this.calculating = false;
      };
      this.calculating = true;
      this.worker.postMessage({
        analysisItem: this.analysisItem,
        facility: this.facility,
        calanderizedMeters: calanderizedMeters,
        accountPredictorEntries: accountPredictorEntries
      });
    } else {
      console.log('nopee')

      // Web Workers are not supported in this environment.
      // You should add a fallback so that your program still executes correctly.
    }

  }

  ngOnDestroy(){
    if(this.worker){
      this.worker.terminate();
    }
  }
  
  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}
