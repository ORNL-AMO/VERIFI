import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { RegressionAnalysisService, RegressionTableRow } from '../regression-analysis.service';

@Component({
  selector: 'app-regression-data-table',
  templateUrl: './regression-data-table.component.html',
  styleUrls: ['./regression-data-table.component.css']
})
export class RegressionDataTableComponent implements OnInit {

  facilityMeterDataSub: Subscription;
  facilityPredictorEntriesSub: Subscription;
  regressionTableRows: Array<RegressionTableRow>;
  constructor(private predictorDbService: PredictordbService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private regressionAnalysisService: RegressionAnalysisService) { }

  ngOnInit(): void {
    this.facilityMeterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(val => {
      if (val && val.length != 0) {
        this.setTableRows();
      }
    });

    this.facilityPredictorEntriesSub = this.predictorDbService.facilityPredictorEntries.subscribe(val => {
      if (val && val.length != 0) {
        this.setTableRows();
      }
    });
  }

  ngOnDestroy() {
    this.facilityMeterDataSub.unsubscribe();
    this.facilityPredictorEntriesSub.unsubscribe();
  }


  setTableRows() {
    this.regressionTableRows = this.regressionAnalysisService.getRegressionTableData();
    console.log(this.regressionTableRows);
  }

}
