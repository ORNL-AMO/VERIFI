import { Component } from '@angular/core';
import { AccountAnalysisService } from '../../account-analysis.service';
import { Subscription } from 'rxjs';
import { IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';

@Component({
  selector: 'app-account-analysis-facilities-summary',
  templateUrl: './account-analysis-facilities-summary.component.html',
  styleUrls: ['./account-analysis-facilities-summary.component.css']
})
export class AccountAnalysisFacilitiesSummaryComponent {

  monthlyFacilityAnalysisClassesSub: Subscription;
  calculating: boolean | 'error';
  calculatingSub: Subscription;

  facilitySummaries: Array<{ facility: IdbFacility, analysisItem: IdbAnalysisItem, monthlySummaryData: Array<MonthlyAnalysisSummaryData> }>;
  analysisItem: IdbAccountAnalysisItem;
  constructor(private accountAnalysisService: AccountAnalysisService,
    private accountAnalysisDbService: AccountAnalysisDbService) {

  }

  ngOnInit() {
    this.analysisItem = this.accountAnalysisDbService.selectedAnalysisItem.getValue();
    
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
