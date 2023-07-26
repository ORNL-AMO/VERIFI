import { Component } from '@angular/core';
import { AccountAnalysisService } from '../../account-analysis.service';
import { MonthlyFacilityAnalysisClass } from 'src/app/calculations/analysis-calculations/monthlyFacilityAnalysisClass';
import { Subscription } from 'rxjs';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';

@Component({
  selector: 'app-account-analysis-facilities-summary',
  templateUrl: './account-analysis-facilities-summary.component.html',
  styleUrls: ['./account-analysis-facilities-summary.component.css']
})
export class AccountAnalysisFacilitiesSummaryComponent {

  monthlyFacilityAnalysisClassesSub: Subscription;
  calculating: boolean | 'error';
  calculatingSub: Subscription;

  facilitySummaries: Array<{ facility: IdbFacility, analysisItem: IdbAnalysisItem, monthlySummaryData: Array<MonthlyAnalysisSummaryData> }>
  constructor(private accountAnalysisService: AccountAnalysisService) {

  }

  ngOnInit() {
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
