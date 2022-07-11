import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, MeterSource, PredictorData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { FacilityHomeService } from '../facility-home.service';
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { Router } from '@angular/router';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityColors } from 'src/app/shared/utilityColors';

@Component({
  selector: 'app-facility-home-summary',
  templateUrl: './facility-home-summary.component.html',
  styleUrls: ['./facility-home-summary.component.css']
})
export class FacilityHomeSummaryComponent implements OnInit {

  latestAnalysisSummary: AnnualAnalysisSummary;
  latestSummarySub: Subscription;
  percentSavings: number;
  percentGoal: number;
  percentTowardsGoal: number;
  goalYear: number;
  baselineYear: number;
  facilityAnalysisYear: number;


  facility: IdbFacility
  facilitySub: Subscription;
  lastBill: IdbUtilityMeterData;
  meterDataUpToDate: boolean;
  hasCurrentYearAnalysis: IdbAnalysisItem;
  lastYear: number;


  latestAnalysisItem: IdbAnalysisItem;
  sources: Array<MeterSource>;
  facilityPredictors: Array<PredictorData>;
  latestPredictorEntry: IdbPredictorEntry;


  constructor(private analysisDbService: AnalysisDbService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityDbService: FacilitydbService, private facilityHomeService: FacilityHomeService,
    private router: Router, private predictorDbService: PredictordbService, private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.latestSummarySub = this.facilityHomeService.latestAnalysisSummary.subscribe(val => {
      this.facility = this.facilityDbService.selectedFacility.getValue();
      this.latestAnalysisSummary = val;
      if (this.latestAnalysisSummary) {
        this.facilityAnalysisYear = this.latestAnalysisSummary.year;
        this.setProgressPercentages();
      } else {
        this.facilityAnalysisYear = undefined;
      }
      this.setFacilityStatus();
    });
  }

  ngOnDestroy() {
    this.latestSummarySub.unsubscribe();
  }

  checkMeterDataUpToDate() {
    if (this.lastBill) {
      let lastBillDate: Date = new Date(this.lastBill.readDate);
      let todaysDate: Date = new Date();
      //todo enhance check
      if (lastBillDate.getUTCFullYear() == todaysDate.getUTCFullYear() && lastBillDate.getUTCMonth() >= todaysDate.getUTCMonth() - 1) {
        this.meterDataUpToDate = true;
      } else {
        this.meterDataUpToDate = false;
      }
    } else {
      this.meterDataUpToDate = false;
    }
  }


  setProgressPercentages() {
    this.percentSavings = this.latestAnalysisSummary.totalSavingsPercentImprovement;
    this.percentGoal = this.facility.sustainabilityQuestions.energyReductionPercent;
    this.goalYear = this.facility.sustainabilityQuestions.energyReductionTargetYear;
    this.baselineYear = this.facility.sustainabilityQuestions.energyReductionBaselineYear;
    this.percentTowardsGoal = (this.percentSavings / this.percentGoal) * 100;
    if (this.percentTowardsGoal < 0) {
      this.percentTowardsGoal = 0;
    }
  }

  navigateTo(urlStr: string) {
    this.router.navigateByUrl('facility/' + this.facility.id + '/' + urlStr);
  }

  setFacilityStatus() {
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    this.lastBill = _.maxBy(facilityMeterData, (data: IdbUtilityMeterData) => { return new Date(data.readDate) });
    // this.checkMeterDataUpToDate();
    let facilityAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.facilityAnalysisItems.getValue();
    this.latestAnalysisItem = _.maxBy(facilityAnalysisItems, 'reportYear');
    this.setSources();
    let facilityPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
    this.latestPredictorEntry = _.maxBy(facilityPredictorEntries, (entry) => { return new Date(entry.date) });
    if (this.latestPredictorEntry) {
      this.facilityPredictors = this.latestPredictorEntry.predictors;
    }

  }


  setSources() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.facility.guid });
    let sources: Array<MeterSource> = facilityMeters.map(meter => { return meter.source });
    this.sources = _.uniq(sources);
  }

  getColor(source: MeterSource): string {
    return UtilityColors[source].color
  }

}
