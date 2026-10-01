import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { AccountAnalysisService } from '@v0/data-evaluation/account/account-analysis/account-analysis.service';
import { Subscription } from 'rxjs';
import { MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';

@Component({
    selector: 'app-account-analysis-facilities-summary',
    templateUrl: './account-analysis-facilities-summary.component.html',
    styleUrls: ['./account-analysis-facilities-summary.component.css'],
    standalone: false
})
export class AccountAnalysisFacilitiesSummaryComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  monthlyFacilityAnalysisClassesSub: Subscription;
  calculating: boolean | 'error';
  calculatingSub: Subscription;

  facilitySummaries: Array<{ facility: IdbFacility, analysisItem: IdbAnalysisItem, monthlySummaryData: Array<MonthlyAnalysisSummaryData> }>;
  analysisItem: IdbAccountAnalysisItem;
  constructor(
    private accountAnalysisService: AccountAnalysisService
  ) {

  }

  ngOnInit() {
    this.analysisItem = this.accountWorkspaceStore.selectedAccountAnalysis();

    this.calculatingSub = this.accountAnalysisService.calculating.subscribe(val => {
      this.calculating = val;
    })
    this.monthlyFacilityAnalysisClassesSub = this.accountAnalysisService.facilitySummaries.subscribe(val => {
      this.facilitySummaries = val;
    });
  }

  ngOnDestroy() {
    this.monthlyFacilityAnalysisClassesSub.unsubscribe();
    this.calculatingSub.unsubscribe();
  }
}
