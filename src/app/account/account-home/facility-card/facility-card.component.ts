import { Component, Input, OnInit } from '@angular/core';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, MeterSource, PredictorData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityColors } from 'src/app/shared/utilityColors';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { OverviewReportService } from '../../overview-report/overview-report.service';
import { AccountHomeService } from '../account-home.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
@Component({
  selector: 'app-facility-card',
  templateUrl: './facility-card.component.html',
  styleUrls: ['./facility-card.component.css']
})
export class FacilityCardComponent implements OnInit {
  @Input()
  facility: IdbFacility;


  lastBill: IdbUtilityMeterData;
  meterDataUpToDate: boolean;
  latestAnalysisItem: IdbAnalysisItem;
  sources: Array<MeterSource>;
  facilityPredictors: Array<PredictorData>;
  latestPredictorEntry: IdbPredictorEntry;
  noMeterData: boolean;
  naics: string;
  calculating: boolean = true;
  // annualAnalysisSummary: Array<AnnualAnalysisSummary>;
  monthlyFacilityAnalysisData: Array<MonthlyAnalysisSummaryData>;

  latestAnalysisDate: Date;
  percentSavings: number = 0;
  percentGoal: number;
  percentTowardsGoal: number = 0;
  goalYear: number;
  baselineYear: number;

  showContent: boolean = true;
  facilityAnalysisSummariesSub: Subscription;
  constructor(private analysisDbService: AnalysisDbService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService, private predictorDbService: PredictordbService,
    private overviewReportService: OverviewReportService, private accountHomeService: AccountHomeService,
    private router: Router) { }

  ngOnInit(): void {
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let facilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.filter(meterData => { return meterData.facilityId == this.facility.guid });
    this.noMeterData = facilityMeterData.length == 0;
    if (!this.noMeterData) {
      this.lastBill = _.maxBy(facilityMeterData, (data: IdbUtilityMeterData) => { return new Date(data.readDate) });
      // this.checkMeterDataUpToDate();
      let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
      let facilityAnalysisItems: Array<IdbAnalysisItem> = accountAnalysisItems.filter(item => { return item.facilityId == this.facility.guid });
      this.latestAnalysisItem = _.maxBy(facilityAnalysisItems, 'reportYear');
      this.setSources();
      let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
      let facilityPredictorEntries: Array<IdbPredictorEntry> = accountPredictorEntries.filter(entry => { return entry.facilityId == this.facility.guid });
      this.latestPredictorEntry = _.maxBy(facilityPredictorEntries, (entry) => { return new Date(entry.date) });
      if (this.latestPredictorEntry) {
        this.facilityPredictors = this.latestPredictorEntry.predictors;
      }
    }
    this.setNAICS();
    this.setGoalYears();
    if (this.latestAnalysisItem) {
      this.facilityAnalysisSummariesSub = this.accountHomeService.facilityAnalysisSummaries.subscribe(summaries => {
        let facilitySummary: {
          facilityId: string,
          annualAnalysisSummary: Array<AnnualAnalysisSummary>,
          monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
        } = summaries.find(summary => { return summary.facilityId == this.facility.guid });
        if (facilitySummary) {
          // this.annualAnalysisSummary = facilitySummary.annualAnalysisSummary;
          this.monthlyFacilityAnalysisData = facilitySummary.monthlyAnalysisSummaryData;
          this.setProgressPercentages();
          this.calculating = false;
        }
      })
    }


  }

  ngOnDestroy() {
    if (this.facilityAnalysisSummariesSub) {
      this.facilityAnalysisSummariesSub.unsubscribe();
    }
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


  setSources() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.facility.guid });
    let sources: Array<MeterSource> = facilityMeters.map(meter => { return meter.source });
    this.sources = _.uniq(sources);
  }

  getColor(source: MeterSource): string {
    return UtilityColors[source].color
  }

  setNAICS() {
    this.naics = this.overviewReportService.getNAICS(this.facility);
  }

  setGoalYears() {
    if (this.facility && this.facility.sustainabilityQuestions) {
      this.percentGoal = this.facility.sustainabilityQuestions.energyReductionPercent;
      this.goalYear = this.facility.sustainabilityQuestions.energyReductionTargetYear;
      this.baselineYear = this.facility.sustainabilityQuestions.energyReductionBaselineYear;
    }
  }

  setProgressPercentages() {
    let latestAnalysisSummary: MonthlyAnalysisSummaryData = _.maxBy(this.monthlyFacilityAnalysisData, 'date');
    this.percentSavings = latestAnalysisSummary.rolling12MonthImprovement;
    this.latestAnalysisDate = new Date(latestAnalysisSummary.date);
    this.percentTowardsGoal = (this.percentSavings / this.percentGoal) * 100;
  }

  toggleShowContent() {
    this.showContent = !this.showContent;
  }

  navigateTo(urlStr: string) {
    this.router.navigateByUrl('/facility/' + this.facility.id + '/' + urlStr);
  }
}
