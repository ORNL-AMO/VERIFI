import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
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
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
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
  facilityMeterData: Array<IdbUtilityMeterData>;
  analysisItem: IdbAnalysisItem;
  noValidModels: boolean;
  noDataValidationModels: boolean;
  selectedModel: JStatRegressionModel;
  facilityMeters: Array<IdbUtilityMeter>;
  optionSelections: Array<{ year: number, isChecked: boolean }> = [];

  @ViewChild('dropdown') dropdownRef: ElementRef;

  constructor(private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService, private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private analysisValidationService: AnalysisValidationService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private router: Router) { }

  ngOnInit(): void {
    this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
    this.facilityMeterData = this.utilityMeterDataDbService.facilityMeterData.getValue();
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
    analysisItem.isAnalysisVisited = false;
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

  toggleOption(option: number) {
    const selection = this.optionSelections.find(selection => selection.year == option);
    if (selection) {
      selection.isChecked = !selection.isChecked;
    }
    this.includedYears = this.optionSelections.filter(selection => selection.isChecked).map(selection => selection.year);
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
    this.checkYearsIncluded();
    if (this.selectedGroup) {
      this.selectedModel = this.selectedGroup.selectedModelId ? this.selectedGroup.models.find(model => model.modelId == this.selectedGroup.selectedModelId) : undefined;
    }
  }

  checkYearsIncluded() {
    this.optionSelections = [];
    let metersInGroup: Array<IdbUtilityMeter> = this.facilityMeters.filter(meter => { return meter.groupId == this.selectedGroup.idbGroupId });
    for (let year of this.dropdownOptions) {
      let meterDataForYear = this.facilityMeterData.filter(meterData => meterData.year == year);
      let meterDataForYearAndGroup = meterDataForYear.filter(meterData => metersInGroup.some(meter => meter.guid == meterData.meterId));
      let monthsWithData = 0;
      for (let monthNum = 1; monthNum <= 12; monthNum++) {
        let monthMeterData = meterDataForYearAndGroup.filter(meterData => meterData.month == monthNum);
        if (monthMeterData && monthMeterData.length > 0) {
          monthsWithData++;
        }
      }
      if (monthsWithData >= 10) {
        if (monthsWithData < 12) {
          this.optionSelections.push({ year: year, isChecked: false });
        }
        else {
          this.optionSelections.push({ year: year, isChecked: true });
        }
      }
    }
  }
}

