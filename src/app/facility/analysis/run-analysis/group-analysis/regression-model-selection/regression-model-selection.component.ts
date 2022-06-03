import { Component, OnInit } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { JStatRegressionModel } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { AnalysisGroup, IdbAccount, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { RegressionModelsService } from 'src/app/shared/shared-analysis/calculations/regression-models.service';
import { AnalysisService } from '../../../analysis.service';
@Component({
  selector: 'app-regression-model-selection',
  templateUrl: './regression-model-selection.component.html',
  styleUrls: ['./regression-model-selection.component.css']
})
export class RegressionModelSelectionComponent implements OnInit {

  selectedGroup: AnalysisGroup;
  // models: Array<JStatRegressionModel>;
  showInvalid: boolean = false;
  constructor(private regressionsModelsService: RegressionModelsService, private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService, private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    // this.regressionsModelsService.testCombos();
    this.selectedGroup = this.analysisService.selectedGroup.getValue();
  }


  generateModels() {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = this.analysisService.calanderizedMeters;
    this.selectedGroup.models = this.regressionsModelsService.getModels(this.selectedGroup, calanderizedMeters, facility, analysisItem);
    console.log(this.selectedGroup.models);
    this.saveItem();
  }


  selectModel() {
    let selectedModel: JStatRegressionModel = this.selectedGroup.models.find(model => { return model.modelId == this.selectedGroup.selectedModelId });
    this.selectedGroup.regressionConstant = selectedModel.coef[0];
    this.selectedGroup.regressionModelYear = selectedModel.modelYear;
    this.selectedGroup.predictorVariables.forEach(variable => {
      let coefIndex: number = selectedModel.predictorVariables.findIndex(pVariable => { return pVariable.id == variable.id });
      variable.regressionCoefficient = selectedModel.coef[coefIndex + 1];
      console.log(variable.name);
      console.log(variable.regressionCoefficient);
    });
    this.saveItem();
  }

  async saveItem() {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let groupIndex: number = analysisItem.groups.findIndex(group => { return group.idbGroupId == this.selectedGroup.idbGroupId });
    this.selectedGroup.groupHasError = this.analysisService.checkGroupHasError(this.selectedGroup);
    analysisItem.groups[groupIndex] = this.selectedGroup;
    await this.analysisDbService.updateWithObservable(analysisItem).toPromise();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.dbChangesService.setAnalysisItems(selectedAccount, selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(analysisItem);
  }
}
