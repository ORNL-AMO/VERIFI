import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnalysisGroup, JStatRegressionModel } from 'src/app/models/analysis';
import { AnalysisService } from '../../../analysis.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { NavigationStart, Router } from '@angular/router';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { getYearsWithFullData } from 'src/app/calculations/shared-calculations/calculationsHelpers';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Component({
  selector: 'app-regression-model-selection',
  templateUrl: './regression-model-selection.component.html',
  styleUrls: ['./regression-model-selection.component.css'],
  standalone: false
})
export class RegressionModelSelectionComponent implements OnInit {

  analysisItem: IdbAnalysisItem;
  selectedGroup: AnalysisGroup;
  orderDataField: string = 'adjust_R2';
  orderByDirection: 'asc' | 'desc' = 'desc';
  selectedGroupSub: Subscription;
  selectedFacility: IdbFacility;
  selectedInspectModel: JStatRegressionModel;
  showInUseMessage: boolean;
  showUserDefinedModelInspection: boolean = false;
  generatedModels: Array<JStatRegressionModel>;
  generatedModelsPerGroupSub: Subscription;
  routerSub: Subscription;
  dropdownOpen: boolean = false;

  modelFilterOptions: {
    yearOptionSelections: Array<{ year: number, isChecked: boolean }>
    showInvalid: boolean;
    showFailedValidationModel: boolean;
  } = {
      yearOptionSelections: [],
      showInvalid: false,
      showFailedValidationModel: true
    }

  @ViewChild('dropdown') dropdownRef: ElementRef;
  constructor(private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService, private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router,
    private calanderizationService: CalanderizationService) { }

  ngOnInit(): void {
    this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.selectedGroupSub = this.analysisService.selectedGroup.subscribe(group => {
      if (!this.selectedGroup || group.idbGroupId != this.selectedGroup.idbGroupId) {
        this.selectedGroup = group;
        //group change
        this.setYears();
      } else {
        this.selectedGroup = group;
      }
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
    this.analysisItem.isAnalysisVisited = false;
    let groupIndex: number = this.analysisItem.groups.findIndex(group => { return group.idbGroupId == this.selectedGroup.idbGroupId });
    this.analysisItem.groups[groupIndex] = this.selectedGroup;
    await firstValueFrom(this.analysisDbService.updateWithObservable(this.analysisItem));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.dbChangesService.setAnalysisItems(selectedAccount, false, this.selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(this.analysisItem);
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
    let accountAnalysisItems = this.accountAnalysisDbService.getCorrespondingAccountAnalysisItems(this.analysisItem.guid);
    if (accountAnalysisItems.length != 0 && this.analysisService.hideInUseMessage == false) {
      this.showInUseMessage = true;
    }
  }

  hideInUseMessage() {
    this.showInUseMessage = false;
    this.analysisService.hideInUseMessage = true;
  }

  setShowUserDefinedModelInspection(showUserDefinedModelInspection: boolean) {
    this.showUserDefinedModelInspection = showUserDefinedModelInspection;
  }

  checkHasValidModels() {
    let noValidModels: boolean = this.generatedModels?.find(model => { return model.isValid == true }) == undefined;
    if (!this.modelFilterOptions.showInvalid && noValidModels) {
      this.modelFilterOptions.showInvalid = true;
    }
  }

  checkFailedValidationModels() {
    let noDataValidationModels: boolean = this.generatedModels?.find(model => {
      if (model.SEPValidation) {
        return model.SEPValidation.every(SEPValidation => SEPValidation.isValid) == true
      } else {
        return undefined;
      }
    }) == undefined;
    if (!this.modelFilterOptions.showFailedValidationModel && noDataValidationModels) {
      this.modelFilterOptions.showFailedValidationModel = true;
    }
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  toggleOption(option: number) {
    const selection = this.modelFilterOptions.yearOptionSelections.find(selection => selection.year == option);
    if (selection) {
      selection.isChecked = !selection.isChecked;
    }
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (this.dropdownRef && this.dropdownRef.nativeElement && !this.dropdownRef.nativeElement.contains(event.target)) {
      this.dropdownOpen = false;
    }
  }

  setYears() {
    if (this.selectedGroup) {
      let filteredCMeters: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizerMetersByGroupId(this.selectedGroup.idbGroupId);
      let fullYearsWithData: Array<number> = getYearsWithFullData(filteredCMeters, this.selectedFacility);
      fullYearsWithData = fullYearsWithData.filter(year => {
        return year >= this.analysisItem.baselineYear;
      })
      this.modelFilterOptions.yearOptionSelections = fullYearsWithData.map(year => { return { year: year, isChecked: true } });
    }
  }
}

