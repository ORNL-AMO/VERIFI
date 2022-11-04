import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { FacilityAnalysisCalculationsService } from 'src/app/shared/shared-analysis/calculations/facility-analysis-calculations.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-annual-facility-analysis',
  templateUrl: './annual-facility-analysis.component.html',
  styleUrls: ['./annual-facility-analysis.component.css']
})
export class AnnualFacilityAnalysisComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  analysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  calculating: boolean;
  annualAnalysisSummary: Array<AnnualAnalysisSummary>;
  calculatingSub: Subscription;
  annualAnalysisSummarySub: Subscription;
  constructor(private analysisService: AnalysisService, private facilityAnalysisCalculationsService: FacilityAnalysisCalculationsService,
    private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.calculatingSub = this.analysisService.calculating.subscribe(val => {
      this.calculating = val;
    });
    this.annualAnalysisSummarySub = this.analysisService.annualAnalysisSummary.subscribe(val => {
      this.annualAnalysisSummary = val;
    });
  }


  ngOnDestroy(){
    this.calculatingSub.unsubscribe();
    this.annualAnalysisSummarySub.unsubscribe();
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}
