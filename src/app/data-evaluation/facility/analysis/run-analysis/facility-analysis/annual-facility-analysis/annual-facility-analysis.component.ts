import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';

@Component({
  selector: 'app-annual-facility-analysis',
  templateUrl: './annual-facility-analysis.component.html',
  styleUrls: ['./annual-facility-analysis.component.css'],
  standalone: false
})
export class AnnualFacilityAnalysisComponent implements OnInit {

  analysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  calculating: boolean | 'error';
  annualAnalysisSummary: Array<AnnualAnalysisSummary>;
  calculatingSub: Subscription;
  annualAnalysisSummarySub: Subscription;
  worker: Worker;
  groupSummaries: Array<{
    group: AnalysisGroup,
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
    annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
  }>;
  groupSummariesSub: Subscription;
  analysisDisplay: 'table' | 'graph';
  key: string;

  constructor(private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.key = 'annual-' + this.facility?.id;
    this.analysisDisplay = this.analysisService.getDisplaySubject(this.key, 'table').getValue();

    this.calculatingSub = this.analysisService.calculating.subscribe(val => {
      this.calculating = val;
    });
    this.annualAnalysisSummarySub = this.analysisService.annualAnalysisSummary.subscribe(val => {
      this.annualAnalysisSummary = val;
    });

    this.groupSummariesSub = this.analysisService.groupSummaries.subscribe(val => {
      this.groupSummaries = val;
    });
  }

  ngOnDestroy() {
    this.calculatingSub.unsubscribe();
    this.annualAnalysisSummarySub.unsubscribe();
    this.groupSummariesSub.unsubscribe();
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.analysisDisplay = display;
    this.analysisService.getDisplaySubject(this.key, 'table').next(display);
  }
}
