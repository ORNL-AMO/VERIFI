import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/analysis/analysis.service';
import { RegressionAnalysisService } from 'src/app/analysis/calculations/regression-analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { MonthlyRegressionSummary } from 'src/app/models/analysis';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-monthly-regression-analysis',
  templateUrl: './monthly-regression-analysis.component.html',
  styleUrls: ['./monthly-regression-analysis.component.css']
})
export class MonthlyRegressionAnalysisComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  groupHasError: boolean = false;
  analysisItem: IdbAnalysisItem;
  group: AnalysisGroup;
  monthlyRegressionSummary: MonthlyRegressionSummary;
  facility: IdbFacility;
  itemsPerPage: number = 12;
  constructor(private analysisService: AnalysisService, private analysisDbService: AnalysisDbService,
    private regressionAnalysisService: RegressionAnalysisService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.group = this.analysisService.selectedGroup.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.monthlyRegressionSummary = this.regressionAnalysisService.getMonthlyRegressionSummary(this.group, this.analysisItem, this.facility);
  }


  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }

}
