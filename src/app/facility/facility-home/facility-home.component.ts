import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnnualFacilityAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizationOptions, CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbFacility, IdbPredictorEntry, IdbUtilityMeter } from 'src/app/models/idb';
import { FacilityHomeService } from './facility-home.service';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { ConvertMeterDataService } from 'src/app/shared/helper-services/convert-meter-data.service';

@Component({
  selector: 'app-facility-home',
  templateUrl: './facility-home.component.html',
  styleUrls: ['./facility-home.component.css']
})
export class FacilityHomeComponent implements OnInit {

  facilityMeterDataSub: Subscription;
  facilityMeters: Array<IdbUtilityMeter>;
  facility: IdbFacility;
  annualEnergyAnalysisWorker: Worker;
  annualWaterAnalysisWorker: Worker;
  constructor(private facilityDbService: FacilitydbService,
    private facilityHomeService: FacilityHomeService, private utilityMeterDbService: UtilityMeterdbService,
    private router: Router, private predictorDbService: PredictordbService,
    private calendarizationService: CalanderizationService,
    private convertMeterDataService: ConvertMeterDataService) { }

  ngOnInit(): void {
    this.facilityMeterDataSub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facility = val;
      this.facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
      this.facilityHomeService.setLatestEnergyAnalysisItem(this.facility);
      this.facilityHomeService.setLatestWaterAnalysisItem(this.facility);

      if (this.facilityHomeService.latestEnergyAnalysisItem) {
        this.setAnnualEnergyAnalysisSummary();
      } else {
        this.facilityHomeService.monthlyFacilityEnergyAnalysisData.next(undefined);
        this.facilityHomeService.annualEnergyAnalysisSummary.next(undefined);
      }

      if (this.facilityHomeService.latestWaterAnalysisItem) {
        this.setAnnualWaterAnalysisSummary();
      } else {
        this.facilityHomeService.monthlyFacilityWaterAnalysisData.next(undefined);
        this.facilityHomeService.annualWaterAnalysisSummary.next(undefined);
      }
    })
  }

  ngOnDestroy() {
    this.facilityMeterDataSub.unsubscribe();
    if (this.annualEnergyAnalysisWorker) {
      this.annualEnergyAnalysisWorker.terminate();
    }
    if (this.annualWaterAnalysisWorker) {
      this.annualWaterAnalysisWorker.terminate();
    }
    this.facilityHomeService.monthlyFacilityEnergyAnalysisData.next(undefined);
    this.facilityHomeService.annualEnergyAnalysisSummary.next(undefined);
    this.facilityHomeService.monthlyFacilityWaterAnalysisData.next(undefined);
    this.facilityHomeService.annualWaterAnalysisSummary.next(undefined);
  }


  navigateToMeters() {
    this.router.navigateByUrl('facility/' + this.facility.id + '/utility');
  }

  setAnnualEnergyAnalysisSummary() {
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.facility.guid });
    let calanderizationOptions: CalanderizationOptions = {
      energyIsSource: this.facilityHomeService.latestEnergyAnalysisItem.energyIsSource
    }
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calendarizationService.getCalanderizedMeterData(facilityMeters, true, false, calanderizationOptions);
    calanderizedMeterData.forEach(calanderizedMeter => {
      calanderizedMeter.monthlyData = this.convertMeterDataService.convertMeterDataToAnalysis(this.facilityHomeService.latestEnergyAnalysisItem, calanderizedMeter.monthlyData, this.facility, calanderizedMeter.meter);
    });
    if (typeof Worker !== 'undefined') {
      this.annualEnergyAnalysisWorker = new Worker(new URL('src/app/web-workers/annual-facility-analysis.worker', import.meta.url));
      this.annualEnergyAnalysisWorker.onmessage = ({ data }) => {
        if (!data.error) {
          this.facilityHomeService.annualEnergyAnalysisSummary.next(data.annualAnalysisSummaries);
          this.facilityHomeService.monthlyFacilityEnergyAnalysisData.next(data.monthlyAnalysisSummaryData);
          this.facilityHomeService.calculating.next(false);
        } else {
          this.facilityHomeService.annualEnergyAnalysisSummary.next(undefined);
          this.facilityHomeService.monthlyFacilityEnergyAnalysisData.next(undefined);
          this.facilityHomeService.calculating.next('error');
        }
        this.annualEnergyAnalysisWorker.terminate();
      };
      this.facilityHomeService.calculating.next(true);
      this.annualEnergyAnalysisWorker.postMessage({
        analysisItem: this.facilityHomeService.latestEnergyAnalysisItem,
        facility: this.facility,
        calanderizedMeters: calanderizedMeterData,
        accountPredictorEntries: accountPredictorEntries,
        calculateAllMonthlyData: true
      });
    } else {
      // Web Workers are not supported in this environment.
      let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(this.facilityHomeService.latestEnergyAnalysisItem, this.facility, calanderizedMeterData, accountPredictorEntries, true);
      let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
      this.facilityHomeService.annualEnergyAnalysisSummary.next(annualAnalysisSummaries);
      this.facilityHomeService.monthlyFacilityEnergyAnalysisData.next(monthlyAnalysisSummaryData);
    }
  }

  setAnnualWaterAnalysisSummary() {
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.facility.guid });
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calendarizationService.getCalanderizedMeterData(facilityMeters, true, false, undefined);
    calanderizedMeterData.forEach(calanderizedMeter => {
      calanderizedMeter.monthlyData = this.convertMeterDataService.convertMeterDataToAnalysis(this.facilityHomeService.latestWaterAnalysisItem, calanderizedMeter.monthlyData, this.facility, calanderizedMeter.meter);
    });
    if (typeof Worker !== 'undefined') {
      this.annualWaterAnalysisWorker = new Worker(new URL('src/app/web-workers/annual-facility-analysis.worker', import.meta.url));
      this.annualWaterAnalysisWorker.onmessage = ({ data }) => {
        if (!data.error) {
          this.facilityHomeService.annualWaterAnalysisSummary.next(data.annualAnalysisSummaries);
          this.facilityHomeService.monthlyFacilityWaterAnalysisData.next(data.monthlyAnalysisSummaryData);
          this.facilityHomeService.calculating.next(false);
        } else {
          this.facilityHomeService.annualWaterAnalysisSummary.next(undefined);
          this.facilityHomeService.monthlyFacilityWaterAnalysisData.next(undefined);
          this.facilityHomeService.calculating.next('error');
        }
        this.annualWaterAnalysisWorker.terminate();
      };
      this.facilityHomeService.calculating.next(true);
      this.annualWaterAnalysisWorker.postMessage({
        analysisItem: this.facilityHomeService.latestWaterAnalysisItem,
        facility: this.facility,
        calanderizedMeters: calanderizedMeterData,
        accountPredictorEntries: accountPredictorEntries,
        calculateAllMonthlyData: true
      });
    } else {
      // Web Workers are not supported in this environment.
      let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(this.facilityHomeService.latestWaterAnalysisItem, this.facility, calanderizedMeterData, accountPredictorEntries, true);
      let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
      this.facilityHomeService.annualWaterAnalysisSummary.next(annualAnalysisSummaries);
      this.facilityHomeService.monthlyFacilityWaterAnalysisData.next(monthlyAnalysisSummaryData);
    }
  }
}
