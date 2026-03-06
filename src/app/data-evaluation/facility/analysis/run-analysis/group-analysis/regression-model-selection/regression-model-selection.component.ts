import { Component, ElementRef, HostListener, OnInit, Output, ViewChild } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnalysisGroup, JStatRegressionModel } from 'src/app/models/analysis';
import { AnalysisService } from '../../../analysis.service';
import { AnalysisValidationService } from 'src/app/shared/helper-services/analysis-validation.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { NavigationStart, Router } from '@angular/router';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { getEarliestMeterData, getLatestMeterData } from 'src/app/shared/dateHelperFunctions';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
@Component({
  selector: 'app-regression-model-selection',
  templateUrl: './regression-model-selection.component.html',
  styleUrls: ['./regression-model-selection.component.css'],
  standalone: false
})
export class RegressionModelSelectionComponent implements OnInit {

  selectedGroup: AnalysisGroup;
  showInvalid: boolean;
  showFailedValidationModel: boolean = true;
  orderDataField: string = 'adjust_R2';
  orderByDirection: 'asc' | 'desc' = 'desc';
  selectedGroupSub: Subscription;
  selectedFacility: IdbFacility;
  selectedInspectModel: JStatRegressionModel;
  showInUseMessage: boolean;
  generateUserDefinedModel: boolean;
  showView: boolean = true;
  generatedModels: Array<JStatRegressionModel>;
  generatedModelsPerGroupSub: Subscription;
  routerSub: Subscription;
  includedYears: Array<number> = [];
  isYearSelectionChanged: boolean = false;
  dropdownOpen: boolean = false;
  yearOptions: Array<number> = [];
  dropdownOptions: Array<number> = [];
  selectedOptions: Array<number> = [];
  facilityMeterData: Array<IdbUtilityMeterData>;
  facilityPredictorData: Array<IdbPredictorData>;
  analysisItem: IdbAnalysisItem;
  noValidModels: boolean;
  noDataValidationModels: boolean;
  selectedModel: JStatRegressionModel;

  @ViewChild('dropdown') dropdownRef: ElementRef;

  constructor(private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService, private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private analysisValidationService: AnalysisValidationService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private predictorDataDbService: PredictorDataDbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private router: Router) { }

  ngOnInit(): void {
    this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.facilityMeterData = this.utilityMeterDataDbService.facilityMeterData.getValue();
    this.facilityPredictorData = this.predictorDataDbService.facilityPredictorData.getValue();
    this.setYears();
    this.selectedGroupSub = this.analysisService.selectedGroup.subscribe(group => {
      this.selectedGroup = group;
      this.setDropdownOptions();
      this.generatedModels = this.analysisDbService.getGeneratedModelsForGroup(this.selectedGroup.idbGroupId);

      if (!this.generatedModels?.length && this.selectedGroup?.models?.length) {
        this.analysisDbService.setGeneratedModelsForGroup(this.selectedGroup.idbGroupId, this.selectedGroup.models);
        this.generatedModels = this.selectedGroup.models;
      }
      this.checkHasValidModels();
      this.checkFailedValidationModels();
    });

    this.generatedModelsPerGroupSub = this.analysisDbService.generatedModelsPerGroup.subscribe(generatedModelsPerGroup => {
      if (this.selectedGroup && this.selectedGroup.idbGroupId) {
        this.generatedModels = generatedModelsPerGroup[this.selectedGroup.idbGroupId] || [];
      }
      else {
        this.generatedModels = [];
      }
      this.checkHasValidModels();
      this.checkFailedValidationModels();
    });

    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        if (!event.url.includes('/analysis/run-analysis/group-analysis')) {
          this.analysisDbService.clearGeneratedModels();
        }
      }
    });
    this.setShowInUseMessage();
  }

  ngOnDestroy() {
    this.selectedGroupSub.unsubscribe();
    this.generatedModelsPerGroupSub.unsubscribe();
    this.routerSub.unsubscribe();
  }

  selectModel() {
    let selectedModel: JStatRegressionModel = this.generatedModels.find(model => { return model.modelId == this.selectedGroup.selectedModelId });
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
    this.selectedGroup.models = [selectedModel];
    this.saveItem();
    this.analysisDbService.setGeneratedModelsForGroup(this.selectedGroup.idbGroupId, this.generatedModels);
  }

  async saveItem() {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let groupIndex: number = analysisItem.groups.findIndex(group => { return group.idbGroupId == this.selectedGroup.idbGroupId });
    this.selectedGroup.groupErrors = this.analysisValidationService.getGroupErrors(this.selectedGroup, analysisItem);
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

  onUserDefinedModelClicked(isClicked: boolean) {
    this.generateUserDefinedModel = isClicked;
  }

  onFormChanged(isFormChanged: boolean) {
    this.showView = isFormChanged;
  }

  checkHasValidModels() {
    this.noValidModels = this.generatedModels?.find(model => { return model.isValid == true }) == undefined;
    if (!this.showInvalid && this.noValidModels) {
      this.showInvalid = true;
    }
  }

  checkFailedValidationModels() {
    this.noDataValidationModels = this.generatedModels?.find(model => {
      if (model.SEPValidation) {
        return model.SEPValidation.every(SEPValidation => SEPValidation.isValid) == true
      } else {
        return undefined;
      }
    }) == undefined;
    if (!this.showFailedValidationModel && this.noDataValidationModels) {
      this.showFailedValidationModel = true;
    }
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  isOptionSelected(option: number): boolean {
    return this.selectedOptions.includes(option);
  }

  toggleOption(option: number) {
    if (this.isOptionSelected(option)) {
      this.selectedOptions = this.selectedOptions.filter(selected => selected !== option);
    }
    else {
      this.selectedOptions = [...this.selectedOptions, option];
    }
    this.includedYears = this.selectedOptions;
    this.isYearSelectionChanged = true;
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (this.dropdownRef && this.dropdownRef.nativeElement && !this.dropdownRef.nativeElement.contains(event.target)) {
      this.dropdownOpen = false;
    }
  }

  setYears() {
    let firstReading: IdbUtilityMeterData = getEarliestMeterData(this.facilityMeterData);
    let lastReading: IdbUtilityMeterData = getLatestMeterData(this.facilityMeterData);
    if (firstReading && lastReading) {
      let start: number = firstReading.year;
      let end: number = lastReading.year;
      this.yearOptions = [];
      for (let x = start; x <= end; x++) {
        this.yearOptions.push(x);
      }
    }
  }

  setDropdownOptions() {
    this.dropdownOptions = [];
    this.dropdownOptions = [...this.yearOptions];
    this.dropdownOptions = this.dropdownOptions.filter(year => year >= this.analysisItem.baselineYear);
    this.dropdownOptions = this.dropdownOptions.filter(year => year <= new Date().getFullYear());
    this.checkCompleteYearDataPresent();
    if (this.selectedGroup) {
      this.selectedModel = this.selectedGroup.selectedModelId ? this.selectedGroup.models.find(model => model.modelId == this.selectedGroup.selectedModelId) : undefined;
    }
    this.selectedOptions = [...this.dropdownOptions];
  }

  checkCompleteYearDataPresent() {
    for (let year of this.dropdownOptions) {
      let meterDataForYear = this.facilityMeterData.filter(meterData => meterData.year == year);
      let predictorDataForYear = this.facilityPredictorData.filter(predictorData => predictorData.year == year);
      for (let monthNum = 1; monthNum <= 12; monthNum++) {
        let monthMeterData = meterDataForYear.filter(meterData => meterData.month == monthNum);
        let monthPredictorData = predictorDataForYear.filter(predictorData => predictorData.month == monthNum);
        if (monthMeterData.length == 0 || monthPredictorData.length == 0) {
          this.dropdownOptions = this.dropdownOptions.filter(option => option != year);
        }
      }
    }
  }
}
