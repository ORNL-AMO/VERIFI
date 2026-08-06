import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { AccountAnalysisService } from '../../account-analysis.service';
import { Subscription } from 'rxjs';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

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
