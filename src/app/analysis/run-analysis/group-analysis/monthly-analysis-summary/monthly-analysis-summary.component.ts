import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/analysis/analysis.service';
import { AnalysisCalculationsHelperService } from 'src/app/analysis/calculations/analysis-calculations-helper.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { MonthlyAnalysisSummary } from 'src/app/models/analysis';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-monthly-analysis-summary',
  templateUrl: './monthly-analysis-summary.component.html',
  styleUrls: ['./monthly-analysis-summary.component.css']
})
export class MonthlyAnalysisSummaryComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  analysisItem: IdbAnalysisItem;
  group: AnalysisGroup;
  monthlyAnalysisSummary: MonthlyAnalysisSummary;
  facility: IdbFacility;
  itemsPerPage: number = 12;
  constructor(private analysisService: AnalysisService, private analysisDbService: AnalysisDbService,
    private analysisCalculationsHelperService: AnalysisCalculationsHelperService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.group = this.analysisService.selectedGroup.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.monthlyAnalysisSummary = this.analysisCalculationsHelperService.getMonthlyAnalysisSummary(this.group, this.analysisItem, this.facility);
  }


  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }

}
