import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnnualFacilityAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { FacilityHomeService } from './facility-home.service';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CalanderizeMetersClass } from 'src/app/calculations/calanderization/calanderizeMeters';

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
  overviewWorker: Worker;

  latestEnergyAnalysisItem: IdbAnalysisItem;
  latestWaterAnalysisItem: IdbAnalysisItem;
  constructor(private facilityDbService: FacilitydbService,
    private facilityHomeService: FacilityHomeService, private utilityMeterDbService: UtilityMeterdbService,
    private router: Router, private predictorDbService: PredictordbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.facilityMeterDataSub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facility = val;
      this.facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
      this.facilityHomeService.setLatestEnergyAnalysisItem(this.facility);
      this.facilityHomeService.setLatestWaterAnalysisItem(this.facility);

      if (this.facilityHomeService.latestEnergyAnalysisItem) {
        this.latestEnergyAnalysisItem = this.facilityHomeService.latestEnergyAnalysisItem;
        this.setAnnualEnergyAnalysisSummary();
      } else {
        this.latestEnergyAnalysisItem = undefined;
        this.facilityHomeService.monthlyFacilityEnergyAnalysisData.next(undefined);
        this.facilityHomeService.annualEnergyAnalysisSummary.next(undefined);
      }

      if (this.facilityHomeService.latestWaterAnalysisItem) {
        this.latestWaterAnalysisItem = this.facilityHomeService.latestWaterAnalysisItem;
        this.setAnnualWaterAnalysisSummary();
      } else {
        this.latestWaterAnalysisItem = undefined;
        this.facilityHomeService.monthlyFacilityWaterAnalysisData.next(undefined);
        this.facilityHomeService.annualWaterAnalysisSummary.next(undefined);
      }
      this.setFacilityOverview();
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
    if (this.overviewWorker) {
      this.overviewWorker.terminate();
    }
    this.facilityHomeService.monthlyFacilityEnergyAnalysisData.next(undefined);
    this.facilityHomeService.annualEnergyAnalysisSummary.next(undefined);
    this.facilityHomeService.monthlyFacilityWaterAnalysisData.next(undefined);
    this.facilityHomeService.annualWaterAnalysisSummary.next(undefined);
    this.facilityHomeService.calculatingEnergy.next(true);
    this.facilityHomeService.calculatingOverview.next(true);
    this.facilityHomeService.calculatingWater.next(true);
  }


  navigateToMeters() {
    this.router.navigateByUrl('facility/' + this.facility.id + '/utility');
  }

  setAnnualEnergyAnalysisSummary() {
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    if (typeof Worker !== 'undefined') {
      this.annualEnergyAnalysisWorker = new Worker(new URL('src/app/web-workers/annual-facility-analysis.worker', import.meta.url));
      this.annualEnergyAnalysisWorker.onmessage = ({ data }) => {
        if (!data.error) {
          this.facilityHomeService.annualEnergyAnalysisSummary.next(data.annualAnalysisSummaries);
          this.facilityHomeService.monthlyFacilityEnergyAnalysisData.next(data.monthlyAnalysisSummaryData);
          this.facilityHomeService.calculatingEnergy.next(false);
        } else {
          this.facilityHomeService.annualEnergyAnalysisSummary.next(undefined);
          this.facilityHomeService.monthlyFacilityEnergyAnalysisData.next(undefined);
          this.facilityHomeService.calculatingEnergy.next('error');
        }
        this.annualEnergyAnalysisWorker.terminate();
      };
      this.facilityHomeService.calculatingEnergy.next(true);
      this.annualEnergyAnalysisWorker.postMessage({
        analysisItem: this.facilityHomeService.latestEnergyAnalysisItem,
        facility: this.facility,
        meters: facilityMeters,
        accountPredictorEntries: accountPredictorEntries,
        calculateAllMonthlyData: true,
        meterData: facilityMeterData
      });
    } else {

      // Web Workers are not supported in this environment.
      let calanderizedMeters: Array<CalanderizedMeter> = new CalanderizeMetersClass(facilityMeters, facilityMeterData, this.facility, false, { energyIsSource: this.facilityHomeService.latestEnergyAnalysisItem.energyIsSource }).calanderizedMeterData;
      let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(this.facilityHomeService.latestEnergyAnalysisItem, this.facility, calanderizedMeters, accountPredictorEntries, true);
      let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
      this.facilityHomeService.annualEnergyAnalysisSummary.next(annualAnalysisSummaries);
      this.facilityHomeService.monthlyFacilityEnergyAnalysisData.next(monthlyAnalysisSummaryData);
    }
  }

  setAnnualWaterAnalysisSummary() {
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();

    if (typeof Worker !== 'undefined') {
      this.annualWaterAnalysisWorker = new Worker(new URL('src/app/web-workers/annual-facility-analysis.worker', import.meta.url));
      this.annualWaterAnalysisWorker.onmessage = ({ data }) => {
        if (!data.error) {
          this.facilityHomeService.annualWaterAnalysisSummary.next(data.annualAnalysisSummaries);
          this.facilityHomeService.monthlyFacilityWaterAnalysisData.next(data.monthlyAnalysisSummaryData);
          this.facilityHomeService.calculatingWater.next(false);
        } else {
          this.facilityHomeService.annualWaterAnalysisSummary.next(undefined);
          this.facilityHomeService.monthlyFacilityWaterAnalysisData.next(undefined);
          this.facilityHomeService.calculatingWater.next('error');
        }
        this.annualWaterAnalysisWorker.terminate();
      };
      this.facilityHomeService.calculatingWater.next(true);
      this.annualWaterAnalysisWorker.postMessage({
        analysisItem: this.facilityHomeService.latestWaterAnalysisItem,
        facility: this.facility,
        accountPredictorEntries: accountPredictorEntries,
        calculateAllMonthlyData: true
      });
    } else {
      // Web Workers are not supported in this environment.
      let calanderizedMeters: Array<CalanderizedMeter> = new CalanderizeMetersClass(facilityMeters, facilityMeterData, this.facility, false, { energyIsSource: this.facilityHomeService.latestWaterAnalysisItem.energyIsSource }).calanderizedMeterData;
      let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(this.facilityHomeService.latestWaterAnalysisItem, this.facility, calanderizedMeters, accountPredictorEntries, true);
      let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
      this.facilityHomeService.annualWaterAnalysisSummary.next(annualAnalysisSummaries);
      this.facilityHomeService.monthlyFacilityWaterAnalysisData.next(monthlyAnalysisSummaryData);
    }
  }

  setFacilityOverview() {
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    if (typeof Worker !== 'undefined') {
      this.overviewWorker = new Worker(new URL('src/app/web-workers/facility-overview.worker', import.meta.url));
      this.overviewWorker.onmessage = ({ data }) => {
        if (!data.error) {
          this.facilityHomeService.facilityOverviewData.next(data.facilityOverviewData);
          // this.facilityHomeService.utilityUseAndCost.next(data.utilityUseAndCost);
          this.facilityHomeService.calculatingOverview.next(false);
        } else {
          this.facilityHomeService.facilityOverviewData.next(undefined);
          // this.facilityHomeService.utilityUseAndCost.next(undefined);
          this.facilityHomeService.calculatingOverview.next("error");
        }
        this.overviewWorker.terminate();

      };
      this.facilityHomeService.calculatingOverview.next(true)
      this.overviewWorker.postMessage({
        type: 'overview',
        dateRange: undefined,
        facility: this.facility,
        inOverview: false,
        energyIsSource: this.facility.energyIsSource,
        meterData: meterData,
        meters: meters
      });
    } else {
      // Web Workers are not supported in this environment.

      // let facilityOverviewData: FacilityOverviewData = new FacilityOverviewData(calanderizedMeters, dateRange, this.facility);
      // this.facilityHomeService.facilityOverviewData.next(facilityOverviewData);
      // this.facilityHomeService.calculatingOverview.next(false);
    }
  }
}
