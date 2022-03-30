import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { FacilityAnalysisCalculationsService } from 'src/app/facility/analysis/calculations/facility-analysis-calculations.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityMonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-monthly-facility-analysis',
  templateUrl: './monthly-facility-analysis.component.html',
  styleUrls: ['./monthly-facility-analysis.component.css']
})
export class MonthlyFacilityAnalysisComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  monthlyFacilityAnalysisData: Array<FacilityMonthlyAnalysisSummaryData>;
  analysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  itemsPerPage: number = 12;
  constructor(private analysisService: AnalysisService, private facilityAnalysisCalculationsService: FacilityAnalysisCalculationsService,
    private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.monthlyFacilityAnalysisData = this.facilityAnalysisCalculationsService.calculateMonthlyFacilityAnalysis(this.analysisItem, this.facility);
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}
