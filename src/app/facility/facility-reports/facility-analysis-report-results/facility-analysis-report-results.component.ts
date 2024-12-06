import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { AnalysisService } from '../../analysis/analysis.service';

@Component({
  selector: 'app-facility-analysis-report-results',
  templateUrl: './facility-analysis-report-results.component.html',
  styleUrl: './facility-analysis-report-results.component.css'
})
export class FacilityAnalysisReportResultsComponent {

  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;

  analysisItem: IdbAnalysisItem;
  constructor(private facilityReportsDbService: FacilityReportsDbService,
    private analysisDbService: AnalysisDbService,
    private analysisService: AnalysisService
  ) {

  }

  ngOnInit() {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
      this.analysisItem = this.analysisDbService.getByGuid(this.facilityReport.analysisItemId);
      this.analysisService.analysisTableColumns.next(this.facilityReport.analysisReportSettings.analysisTableColumns);
    });
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
  }
}
