import { Component, OnInit } from '@angular/core';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from 'src/app/models/idb';
import { AnnualFacilityAnalysisWASM } from 'src/app/web-workers/classes/wasm-api/annualFacilityAnalysisWASM';
import { MonthlyFacilityAnalysisWASM } from 'src/app/web-workers/classes/wasm-api/monthlyFacilityAnalysisWASM';
import { AnalysisService } from '../../analysis.service';
declare var Module: any;
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
    // let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    // let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    // let calanderizedMeters: Array<CalanderizedMeter> = this.analysisService.calanderizedMeters;
    // let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    // if (typeof Worker !== 'undefined') {
    //   this.worker = new Worker(new URL('src/app/web-workers/annual-facility-analysis.worker', import.meta.url));
    //   this.worker.onmessage = ({ data }) => {
    //     this.worker.terminate();
    //     this.analysisService.annualAnalysisSummary.next(data.annualAnalysisSummaries);
    //     this.analysisService.monthlyAccountAnalysisData.next(data.monthlyAnalysisSummaryData);
    //     this.analysisService.calculating.next(false);
    //   };
    //   this.analysisService.calculating.next(true)
    //   this.worker.postMessage({
    //     analysisItem: analysisItem,
    //     facility: facility,
    //     calanderizedMeters: calanderizedMeters,
    //     accountPredictorEntries: accountPredictorEntries
    //   });
    // } else {
    //   console.log('nopee')

    //   // Web Workers are not supported in this environment.
    //   // You should add a fallback so that your program still executes correctly.
    // }
    this.calculate();
  }

  ngOnDestroy(){
    if(this.worker){
      this.worker.terminate();
    }
  }

  

  calculate() {
    this.analysisService.calculating.next(true)
    let calanderizedMeters: Array<CalanderizedMeter> = this.analysisService.calanderizedMeters;
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    try {
      let test = new MonthlyFacilityAnalysisWASM(Module, analysisItem, facility, calanderizedMeters, accountPredictorEntries);
      this.analysisService.monthlyAccountAnalysisData.next(test.monthlyAnalysisSummaryData);
      let test2 = new AnnualFacilityAnalysisWASM(Module, analysisItem, facility, calanderizedMeters, accountPredictorEntries);
      this.analysisService.annualAnalysisSummary.next(test2.annualAnalysisSummary);
      this.analysisService.calculating.next(false);
      // this.monthlyAnalysisSummary = {
      //   predictorVariables: undefined,
      //   modelYear: undefined,
      //   monthlyAnalysisSummaryData: test.monthlyAnalysisSummaryData
      // }
      // this.calculating = false;
    } catch (err) {
      console.log(err)
    }
  }
}
