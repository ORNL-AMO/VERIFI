import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from 'src/app/models/idb';
import { AccountHomeService } from './account-home.service';
import * as _ from 'lodash';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { AnnualAccountAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualAccountAnalysisSummaryClass';
import { AnnualFacilityAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualFacilityAnalysisSummaryClass';

@Component({
  selector: 'app-account-home',
  templateUrl: './account-home.component.html',
  styleUrls: ['./account-home.component.css']
})
export class AccountHomeComponent implements OnInit {

  accountFacilities: Array<IdbFacility>;
  selectedAccountSub: Subscription;
  accountWorker: Worker;
  facilityWorker: Worker;
  account: IdbAccount;
  constructor(private facilityDbService: FacilitydbService, private accountDbService: AccountdbService,
    private accountHomeService: AccountHomeService,
    private predictorDbService: PredictordbService,
    private analysisDbService: AnalysisDbService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.account = val
      this.accountHomeService.setCalanderizedMeters();
      this.accountFacilities = this.facilityDbService.accountFacilities.getValue();
      if (this.accountFacilities.length != 0) {
        this.setFacilityAnalysisSummary(0);
      }
      if (this.accountHomeService.latestAnalysisItem) {
        this.setAnnualAnalysisSummary();
      } else {
        this.accountHomeService.monthlyAccountAnalysisData.next(undefined);
        this.accountHomeService.annualAnalysisSummary.next(undefined);
      }
    })
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    if (this.accountWorker) {
      this.accountWorker.terminate();
    }
    if (this.facilityWorker) {
      this.facilityWorker.terminate();
    }
    this.accountHomeService.monthlyAccountAnalysisData.next(undefined);
    this.accountHomeService.annualAnalysisSummary.next(undefined);
    this.accountHomeService.facilityAnalysisSummaries.next([])
  }

  setAnnualAnalysisSummary() {
    let calanderizedMeters: Array<CalanderizedMeter> = this.accountHomeService.calanderizedMeters;
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    if (typeof Worker !== 'undefined') {
      this.accountWorker = new Worker(new URL('src/app/web-workers/annual-account-analysis.worker', import.meta.url));
      this.accountWorker.onmessage = ({ data }) => {
        this.accountWorker.terminate();
        this.accountHomeService.annualAnalysisSummary.next(data.annualAnalysisSummaries);
        this.accountHomeService.monthlyAccountAnalysisData.next(data.monthlyAnalysisSummaryData);
        this.accountHomeService.calculating.next(false);
      };
      this.accountHomeService.calculating.next(true);
      this.accountWorker.postMessage({
        accountAnalysisItem: this.accountHomeService.latestAnalysisItem,
        account: this.account,
        calanderizedMeters: calanderizedMeters,
        accountFacilities: accountFacilities,
        accountPredictorEntries: accountPredictorEntries,
        allAccountAnalysisItems: accountAnalysisItems,
        calculateAllMonthlyData: true
      });
    } else {
      // Web Workers are not supported in this environment.
      let annualAnalysisSummaryClass: AnnualAccountAnalysisSummaryClass = new AnnualAccountAnalysisSummaryClass(this.accountHomeService.latestAnalysisItem, this.account, calanderizedMeters, accountFacilities, accountPredictorEntries, accountAnalysisItems, true);
      let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
      this.accountHomeService.annualAnalysisSummary.next(annualAnalysisSummaries);
      this.accountHomeService.monthlyAccountAnalysisData.next(monthlyAnalysisSummaryData);
    }
  }


  setFacilityAnalysisSummary(facilityIndex: number) {
    let facility: IdbFacility = this.accountFacilities[facilityIndex];
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let facilityAnalysisItems: Array<IdbAnalysisItem> = accountAnalysisItems.filter(item => { return item.facilityId == facility.guid });
    let latestAnalysisItem: IdbAnalysisItem = _.maxBy(facilityAnalysisItems, 'reportYear');

    if (latestAnalysisItem) {
      let calanderizedMeters: Array<CalanderizedMeter> = this.accountHomeService.calanderizedMeters;
      let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
      if (typeof Worker !== 'undefined') {
        this.facilityWorker = new Worker(new URL('src/app/web-workers/annual-facility-analysis.worker', import.meta.url));
        this.facilityWorker.onmessage = ({ data }) => {
          this.facilityWorker.terminate();
          let facilitySummary: {
            facilityId: string,
            annualAnalysisSummary: Array<AnnualAnalysisSummary>,
            monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
          } = {
            facilityId: facility.guid,
            annualAnalysisSummary: data.annualAnalysisSummaries,
            monthlyAnalysisSummaryData: data.monthlyAnalysisSummaryData
          }
          let allSummaries: Array<{
            facilityId: string,
            annualAnalysisSummary: Array<AnnualAnalysisSummary>,
            monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
          }> = this.accountHomeService.facilityAnalysisSummaries.getValue();
          allSummaries.push(facilitySummary);
          this.accountHomeService.facilityAnalysisSummaries.next(allSummaries);
          if (facilityIndex != this.accountFacilities.length - 1) {
            this.setFacilityAnalysisSummary(facilityIndex + 1);
          }
        };
        this.facilityWorker.postMessage({
          analysisItem: latestAnalysisItem,
          facility: facility,
          calanderizedMeters: calanderizedMeters,
          accountPredictorEntries: accountPredictorEntries,
          calculateAllMonthlyData: true
        });
      } else {
        // Web Workers are not supported in this environment.
        let annualAnalysisSummaryClass: AnnualFacilityAnalysisSummaryClass = new AnnualFacilityAnalysisSummaryClass(latestAnalysisItem, facility, calanderizedMeters, accountPredictorEntries, true);
        let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
        let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
        let facilitySummary: {
          facilityId: string,
          annualAnalysisSummary: Array<AnnualAnalysisSummary>,
          monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
        } = {
          facilityId: facility.guid,
          annualAnalysisSummary: annualAnalysisSummaries,
          monthlyAnalysisSummaryData: monthlyAnalysisSummaryData
        }
        let allSummaries: Array<{
          facilityId: string,
          annualAnalysisSummary: Array<AnnualAnalysisSummary>,
          monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
        }> = this.accountHomeService.facilityAnalysisSummaries.getValue();
        allSummaries.push(facilitySummary);
        this.accountHomeService.facilityAnalysisSummaries.next(allSummaries);
        if (facilityIndex != this.accountFacilities.length - 1) {
          this.setFacilityAnalysisSummary(facilityIndex + 1);
        }
      }
    }
  }



}
