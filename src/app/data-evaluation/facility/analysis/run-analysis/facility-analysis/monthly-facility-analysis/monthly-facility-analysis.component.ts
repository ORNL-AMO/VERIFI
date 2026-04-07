import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { Subscription } from 'rxjs';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';

@Component({
  selector: 'app-monthly-facility-analysis',
  templateUrl: './monthly-facility-analysis.component.html',
  styleUrls: ['./monthly-facility-analysis.component.css'],
  standalone: false
})
export class MonthlyFacilityAnalysisComponent implements OnInit {

  monthlyFacilityAnalysisData: Array<MonthlyAnalysisSummaryData>;
  analysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  calculating: boolean | 'error';
  calculatingSub: Subscription;
  monthlyFacilityAnalysisDataSub: Subscription;
  groupSummariesSub: Subscription;
  groupSummaries: Array<{
    group: AnalysisGroup,
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
    annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
  }>;
  analysisDisplay: 'table' | 'graph';
  key: string;
  facilitySub: Subscription;

  constructor(private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService,
    private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();

    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facility = val;
      this.key = 'monthly-' + this.facility?.id;
      this.analysisDisplay = this.analysisService.getDisplaySubject(this.key, 'graph').getValue();
    });

    this.calculatingSub = this.analysisService.calculating.subscribe(val => {
      this.calculating = val;
    });
    this.monthlyFacilityAnalysisDataSub = this.analysisService.monthlyAccountAnalysisData.subscribe(val => {
      this.monthlyFacilityAnalysisData = val;
    });

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });

    this.groupSummariesSub = this.analysisService.groupSummaries.subscribe(summaries => {
      this.groupSummaries = summaries;
    });

  }

  ngOnDestroy() {
    this.calculatingSub.unsubscribe();
    this.monthlyFacilityAnalysisDataSub.unsubscribe();
    this.itemsPerPageSub.unsubscribe();
    this.groupSummariesSub.unsubscribe();
    this.facilitySub.unsubscribe();
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.analysisDisplay = display;
    this.analysisService.getDisplaySubject(this.key, 'graph').next(display);
  }
}
