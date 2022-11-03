import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbFacility, IdbPredictorEntry, IdbUtilityMeter } from 'src/app/models/idb';
import { FacilityHomeService } from './facility-home.service';

@Component({
  selector: 'app-facility-home',
  templateUrl: './facility-home.component.html',
  styleUrls: ['./facility-home.component.css']
})
export class FacilityHomeComponent implements OnInit {

  facilityMeterDataSub: Subscription;
  facilityMeters: Array<IdbUtilityMeter>;
  facility: IdbFacility;
  annualAnalysisWorker: Worker;
  constructor(private facilityDbService: FacilitydbService,
    private facilityHomeService: FacilityHomeService, private utilityMeterDbService: UtilityMeterdbService,
    private router: Router, private predictorDbService: PredictordbService) { }

  ngOnInit(): void {
    this.facilityMeterDataSub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facility = val;
      this.facilityHomeService.setCalanderizedMeters(this.facility);
      this.facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
      if (this.facilityHomeService.latestAnalysisItem) {
        this.setAnnualAnalysisSummary();
      } else {
        this.facilityHomeService.monthlyFacilityAnalysisData.next(undefined);
        this.facilityHomeService.annualAnalysisSummary.next(undefined);
      }
    })
  }

  ngOnDestroy() {
    this.facilityMeterDataSub.unsubscribe();
    if (this.annualAnalysisWorker) {
      this.annualAnalysisWorker.terminate();
    }
    this.facilityHomeService.monthlyFacilityAnalysisData.next(undefined);
    this.facilityHomeService.annualAnalysisSummary.next(undefined);
  }


  navigateToMeters() {
    this.router.navigateByUrl('facility/' + this.facility.id + '/utility');
  }

  setAnnualAnalysisSummary() {
    let calanderizedMeters: Array<CalanderizedMeter> = this.facilityHomeService.calanderizedMeters;
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    if (typeof Worker !== 'undefined') {
      this.annualAnalysisWorker = new Worker(new URL('src/app/web-workers/annual-facility-analysis.worker', import.meta.url));
      this.annualAnalysisWorker.onmessage = ({ data }) => {
        this.facilityHomeService.annualAnalysisSummary.next(data.annualAnalysisSummaries);
        this.facilityHomeService.monthlyFacilityAnalysisData.next(data.monthlyAnalysisSummaryData);
        this.facilityHomeService.calculating.next(false);
        this.annualAnalysisWorker.terminate();
      };
      this.facilityHomeService.calculating.next(true);
      this.annualAnalysisWorker.postMessage({
        analysisItem: this.facilityHomeService.latestAnalysisItem,
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
}
