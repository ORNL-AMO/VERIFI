import { Component, OnInit } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnalysisGroup, JStatRegressionModel } from 'src/app/models/analysis';
import { IdbAccount, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { AnalysisService } from '../../../analysis.service';
import { AnalysisValidationService } from 'src/app/shared/helper-services/analysis-validation.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
@Component({
  selector: 'app-regression-model-selection',
  templateUrl: './regression-model-selection.component.html',
  styleUrls: ['./regression-model-selection.component.css']
})
export class RegressionModelSelectionComponent implements OnInit {

  selectedGroup: AnalysisGroup;
  showInvalid: boolean;
  showInvalidSub: Subscription;
  orderDataField: string = 'adjust_R2';
  orderByDirection: 'asc' | 'desc' = 'desc';
  selectedGroupSub: Subscription;
  selectedFacility: IdbFacility;
  selectedInspectModel: JStatRegressionModel;
  showInUseMessage: boolean;
  constructor(private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService, private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private analysisValidationService: AnalysisValidationService,
    private accountAnalysisDbService: AccountAnalysisDbService) { }

  ngOnInit(): void {
    this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
    this.selectedGroupSub = this.analysisService.selectedGroup.subscribe(group => {
      this.selectedGroup = group;
    });

    this.showInvalidSub = this.analysisService.showInvalidModels.subscribe(val => {
      this.showInvalid = val;
    });
    this.setShowInUseMessage();

  }
  ngOnDestroy() {
    this.selectedGroupSub.unsubscribe();
    this.showInvalidSub.unsubscribe();
  }

  selectModel() {
    let selectedModel: JStatRegressionModel = this.selectedGroup.models.find(model => { return model.modelId == this.selectedGroup.selectedModelId });
    this.selectedGroup.regressionConstant = selectedModel.coef[0];
    this.selectedGroup.regressionModelYear = selectedModel.modelYear;
    this.selectedGroup.predictorVariables.forEach(variable => {
      let coefIndex: number = selectedModel.predictorVariables.findIndex(pVariable => { return pVariable.id == variable.id });
      if (coefIndex != -1) {
        variable.regressionCoefficient = selectedModel.coef[coefIndex + 1];
      } else {
        variable.regressionCoefficient = 0;
      }
    });
    this.saveItem();
  }

  async saveItem() {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let groupIndex: number = analysisItem.groups.findIndex(group => { return group.idbGroupId == this.selectedGroup.idbGroupId });
    this.selectedGroup.groupErrors = this.analysisValidationService.getGroupErrors(this.selectedGroup);
    analysisItem.groups[groupIndex] = this.selectedGroup;
    analysisItem.setupErrors = this.analysisValidationService.getAnalysisItemErrors(analysisItem);
    await firstValueFrom(this.analysisDbService.updateWithObservable(analysisItem));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.dbChangesService.setAnalysisItems(selectedAccount, false, this.selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(analysisItem);
    this.analysisService.selectedGroup.next(this.selectedGroup)
  }

  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }

  inspectModel(model: JStatRegressionModel) {
    this.selectedInspectModel = model;
  }

  cancelInspectModel() {
    this.selectedInspectModel = undefined;
  }

  async selectFromInspection() {
    this.selectedGroup.selectedModelId = this.selectedInspectModel.modelId;
    await this.selectModel();
    this.cancelInspectModel();
  }

  setShowInUseMessage() {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let accountAnalysisItems = this.accountAnalysisDbService.getCorrespondingAccountAnalysisItems(analysisItem.guid);
    if (accountAnalysisItems.length != 0 && this.analysisService.hideInUseMessage == false) {
      this.showInUseMessage = true;
    }
  }

  hideInUseMessage() {
    this.showInUseMessage = false;
    this.analysisService.hideInUseMessage = true;
  }
}
