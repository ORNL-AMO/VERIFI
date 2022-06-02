import { Component, OnInit } from '@angular/core';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { JStatRegressionModel } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { RegressionModelsService } from 'src/app/shared/shared-analysis/calculations/regression-models.service';
import { AnalysisService } from '../../../analysis.service';
@Component({
  selector: 'app-regression-model-selection',
  templateUrl: './regression-model-selection.component.html',
  styleUrls: ['./regression-model-selection.component.css']
})
export class RegressionModelSelectionComponent implements OnInit {

  selectedGroup: AnalysisGroup;
  models: Array<JStatRegressionModel>;
  constructor(private regressionsModelsService: RegressionModelsService, private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    // this.regressionsModelsService.test();
    this.selectedGroup = this.analysisService.selectedGroup.getValue();
  }


  generateModels() {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = this.analysisService.calanderizedMeters;
    this.models = this.regressionsModelsService.getModels(this.selectedGroup, calanderizedMeters, facility, analysisItem);
    console.log(this.models);
  }

}
