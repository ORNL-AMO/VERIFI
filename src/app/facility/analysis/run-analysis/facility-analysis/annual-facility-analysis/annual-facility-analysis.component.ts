import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
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

  dataDisplay: 'table' | 'graph';
  analysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  calculating: boolean | 'error';
  annualAnalysisSummary: Array<AnnualAnalysisSummary>;
  calculatingSub: Subscription;
  annualAnalysisSummarySub: Subscription;
  constructor(private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService) { }

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
