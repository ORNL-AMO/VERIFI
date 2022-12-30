import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { Subscription } from 'rxjs';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-monthly-facility-analysis',
  templateUrl: './monthly-facility-analysis.component.html',
  styleUrls: ['./monthly-facility-analysis.component.css']
})
export class MonthlyFacilityAnalysisComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  monthlyFacilityAnalysisData: Array<MonthlyAnalysisSummaryData>;
  analysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  calculating: boolean;
  calculatingSub: Subscription;
  monthlyFacilityAnalysisDataSub: Subscription;
  constructor(private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService,
    private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.calculatingSub = this.analysisService.calculating.subscribe(val => {
      this.calculating = val;
    });
    this.monthlyFacilityAnalysisDataSub = this.analysisService.monthlyAccountAnalysisData.subscribe(val => {
      this.monthlyFacilityAnalysisData = val;
    });

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    })

  }

  ngOnDestroy() {
    this.calculatingSub.unsubscribe();
    this.monthlyFacilityAnalysisDataSub.unsubscribe();
    this.itemsPerPageSub.unsubscribe();
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}
