import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AnalysisCalculationsService } from 'src/app/shared/shared-analysis/calculations/analysis-calculations.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { MonthlyAnalysisSummary } from 'src/app/models/analysis';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from 'src/app/models/idb';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { MonthlyGroupAnalysisWASM } from 'src/app/web-workers/classes/wasm-api/monthlyGroupAnalysisWASM';
declare var Module: any;

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
  worker: Worker;
  calculating: boolean = true;
  constructor(private analysisService: AnalysisService, private analysisDbService: AnalysisDbService,
    private analysisCalculationsService: AnalysisCalculationsService, private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService) { }

  ngOnInit(): void {
    console.log(Module);
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.group = this.analysisService.selectedGroup.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    // let calanderizedMeters: Array<CalanderizedMeter> = this.analysisService.calanderizedMeters;
    // let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    // if (typeof Worker !== 'undefined') {
    //   this.worker = new Worker(new URL('src/app/web-workers/monthly-group-analysis.worker', import.meta.url), {type: 'module'});
    //   this.worker.onmessage = ({ data }) => {
    //     // this.monthlyAnalysisSummary = data;
    //     // this.calculating = false;
    //     this.worker.terminate();
    //   };
    //   this.calculating = true;




    //   this.worker.postMessage({
    //     selectedGroup: this.group,
    //     analysisItem: this.analysisItem,
    //     facility: this.facility,
    //     calanderizedMeters: calanderizedMeters,
    //     accountPredictorEntries: accountPredictorEntries,
    //     // analysisDate: Module.AnalysisGroup
    //     // Module: Module
    //   });
    // } else {
    //   console.log('nopee')

    //   // Web Workers are not supported in this environment.
    //   // You should add a fallback so that your program still executes correctly.
    // }
    this.calculate();

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


  calculate() {
    let calanderizedMeters: Array<CalanderizedMeter> = this.analysisService.calanderizedMeters;
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    try {
      let test = new MonthlyGroupAnalysisWASM(Module, this.group, this.analysisItem, this.facility, calanderizedMeters, accountPredictorEntries);
      this.monthlyAnalysisSummary = {
        predictorVariables: this.group.predictorVariables,
        modelYear: undefined,
        monthlyAnalysisSummaryData: test.monthlyAnalysisSummaryData
      }
      this.calculating = false;
    } catch (err) {
      console.log(err)
    }
  }

}
