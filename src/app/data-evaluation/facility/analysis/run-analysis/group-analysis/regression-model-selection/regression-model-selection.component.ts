import { Component, computed, effect, ElementRef, HostListener, inject, signal, Signal, ViewChild, WritableSignal } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
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
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { getYearsWithFullData } from 'src/app/calculations/shared-calculations/calculationsHelpers';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { toSignal } from '@angular/core/rxjs-interop';
import * as _ from 'lodash';
import { GroupAnalysisErrors } from 'src/app/models/validation';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { emptyGroupAnalysisErrors } from 'src/app/shared/validation/groupAnalysisValidation';

type OrderDataBy = 'adjust_R2' | 'modelYear' | 'R2' | 'modelPValue';

@Component({
  selector: 'app-regression-model-selection',
  templateUrl: './regression-model-selection.component.html',
  styleUrls: ['./regression-model-selection.component.css'],
  standalone: false
})
export class RegressionModelSelectionComponent {
  private analysisService: AnalysisService = inject(AnalysisService);
  private analysisDbService: AnalysisDbService = inject(AnalysisDbService);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private dbChangesService: DbChangesService = inject(DbChangesService);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private accountAnalysisDbService: AccountAnalysisDbService = inject(AccountAnalysisDbService);
  private calanderizationService: CalanderizationService = inject(CalanderizationService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  selectedFacility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility);
  analysisItem: Signal<IdbAnalysisItem> = toSignal(this.analysisDbService.selectedAnalysisItem);
  selectedGroup: Signal<AnalysisGroup> = toSignal(this.analysisService.selectedGroup);
  calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters, { initialValue: [] });
  generatedModelsPerGroup: Signal<{ [groupId: string]: Array<JStatRegressionModel> }> = toSignal(this.analysisDbService.generatedModelsPerGroup, { initialValue: {} });
  allGroupErrors = toSignal(this.accountStatusCheckService.accountStatusCheck.pipe(
    map(check => check?.allGroupErrors ?? [])
  ), { initialValue: [] });


  generatedModels: Signal<Array<JStatRegressionModel>> = computed(() => {
    const group = this.selectedGroup();
    const generatedModelsPerGroup = this.generatedModelsPerGroup();
    if (group && generatedModelsPerGroup && generatedModelsPerGroup[group.idbGroupId]) {
      return generatedModelsPerGroup[group.idbGroupId];
    }
    return [];
  });

  orderDataField: WritableSignal<OrderDataBy> = signal('adjust_R2');
  orderByDirection: WritableSignal<'asc' | 'desc'> = signal('desc');

  orderedModels: Signal<Array<JStatRegressionModel>> = computed(() => {
    const models = this.generatedModels();
    const showInvalid = this.showInvalid();
    const showFailedValidationModel = this.showFailedValidationModel();
    const yearOptionSelections = this.yearOptionSelections();
    const orderDataBy = this.orderDataField();
    let orderByDirection = this.orderByDirection();

    let filteredModels: Array<JStatRegressionModel> = models.map(model => ({ ...model }));
    //filter invalid models
    if (!showInvalid) {
      filteredModels = filteredModels.filter(model => { return model.isValid });
    }
    //filter models that failed validation
    if (!showFailedValidationModel) {
      filteredModels = filteredModels.filter(model => {
        if (model.SEPValidation) {
          return model.SEPValidation.every(SEPValidation => SEPValidation.isValid)
        }
        return false;
      });
    }
    //filter by year
    if (yearOptionSelections.length > 0) {
      let includedYears: Array<number> = yearOptionSelections.filter(option => option.isChecked).map(option => option.year);
      filteredModels = filteredModels.filter(model => includedYears.includes(model.modelYear));
    }
    //order models
    if (!orderByDirection) {
      orderByDirection = 'desc';
    }
    filteredModels = _.orderBy(filteredModels, orderDataBy, orderByDirection);
    return filteredModels;
  });

  showInUseMessage: Signal<boolean> = computed(() => {
    const analysisItem = this.analysisItem();
    if (analysisItem && this.analysisService.hideInUseMessage == false) {
      const accountAnalysisItems = this.accountAnalysisDbService.getCorrespondingAccountAnalysisItems(analysisItem.guid);
      if (accountAnalysisItems.length != 0) {
        return true;
      }
    }
    return false;
  });

  selectedInspectModel: JStatRegressionModel;
  dropdownOpen: boolean = false;

  showInvalid: WritableSignal<boolean> = signal(false);
  showFailedValidationModel: WritableSignal<boolean> = signal(false);
  yearOptionSelections: WritableSignal<Array<{ year: number, isChecked: boolean }>> = signal([]);

  groupErrors: Signal<GroupAnalysisErrors> = computed(() => {
    const selectedGroup = this.selectedGroup();
    const allGroupErrors = this.allGroupErrors();
    const analysisItem = this.analysisItem();
    if (selectedGroup && analysisItem) {
      const groupError = allGroupErrors.find(groupError => {
        return groupError.groupId == selectedGroup.idbGroupId && groupError.analysisId == analysisItem.guid
      });
      if (groupError) {
        return groupError;
      } else {
        return emptyGroupAnalysisErrors();
      }
    }
    return emptyGroupAnalysisErrors();
  });

  @ViewChild('dropdown') dropdownRef: ElementRef;

  selectedGroupId: string;
  constructor() {
    effect(() => {
      const selectedGroup = this.selectedGroup();
      const calanderizedMeters = this.calanderizedMeters();
      const facility = this.selectedFacility();
      if (selectedGroup && calanderizedMeters && calanderizedMeters.length > 0 && facility) {
        if (selectedGroup.idbGroupId != this.selectedGroupId) {
          this.selectedGroupId = selectedGroup.idbGroupId;
          const groupMeters = calanderizedMeters.filter(cMeter => cMeter.meter.groupId == selectedGroup.idbGroupId);
          const yearsWithFullData = getYearsWithFullData(groupMeters, facility);
          this.yearOptionSelections.set(yearsWithFullData.map(year => ({ year, isChecked: true })));
        }
      }
    });

    effect(() => {
      const selectedGroup = this.selectedGroup();
      const generatedModelsPerGroup = this.generatedModelsPerGroup();
      if (selectedGroup && selectedGroup.models && generatedModelsPerGroup && !generatedModelsPerGroup[selectedGroup.idbGroupId]) {
        this.analysisDbService.setGeneratedModelsForGroup(selectedGroup.idbGroupId, selectedGroup.models);
      }
    })
  }

  async selectModel(modelId?: string) {
    const currentGroup: AnalysisGroup = this.selectedGroup();
    const selectedModelId = modelId ?? currentGroup.selectedModelId;
    const generatedModels: Array<JStatRegressionModel> = this.generatedModels();
    const selectedModel: JStatRegressionModel = generatedModels.find(model => model.modelId === selectedModelId);
    const updatedGroup: AnalysisGroup = {
      ...currentGroup,
      selectedModelId,
      regressionConstant: selectedModel.coef[0],
      regressionModelYear: selectedModel.modelYear,
      models: [selectedModel],
      predictorVariables: currentGroup.predictorVariables.map(variable => {
        const coefIndex = selectedModel.predictorVariables.findIndex(pVariable => pVariable.id === variable.id);
        return {
          ...variable,
          regressionCoefficient: coefIndex !== -1 ? selectedModel.coef[coefIndex + 1] : 0,
        };
      }),
    };
    await this.saveItem(updatedGroup);
    this.analysisDbService.setGeneratedModelsForGroup(updatedGroup.idbGroupId, generatedModels);
  }

  async saveItem(selectedGroup?: AnalysisGroup) {
    const _group: AnalysisGroup = selectedGroup ?? this.selectedGroup();
    const _analysisItemCurrent: IdbAnalysisItem = this.analysisItem();
    const selectedFacility: IdbFacility = this.selectedFacility();
    const groupIndex: number = _analysisItemCurrent.groups.findIndex(group => group.idbGroupId === _group.idbGroupId);
    const updatedGroups = [..._analysisItemCurrent.groups];
    updatedGroups[groupIndex] = _group;
    const analysisItem: IdbAnalysisItem = { ..._analysisItemCurrent, isAnalysisVisited: false, groups: updatedGroups };
    await firstValueFrom(this.analysisDbService.updateWithObservable(analysisItem));
    const selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.dbChangesService.setAnalysisItems(selectedAccount, false, selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(analysisItem);
    this.analysisService.selectedGroup.next(_group);
  }

  setOrderDataField(str: OrderDataBy) {
    const currentOrderDataField = this.orderDataField();
    if (str == currentOrderDataField) {
      if (this.orderByDirection() == 'desc') {
        this.orderByDirection.set('asc');
      } else {
        this.orderByDirection.set('desc');
      }
    } else {
      this.orderDataField.set(str);
    }
  }

  inspectModel(model: JStatRegressionModel) {
    this.selectedInspectModel = model;
  }

  cancelInspectModel() {
    this.selectedInspectModel = undefined;
  }

  async selectFromInspection() {
    await this.selectModel(this.selectedInspectModel.modelId);
    this.cancelInspectModel();
  }

  hideInUseMessage() {
    this.analysisService.hideInUseMessage = true;
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  toggleOption(option: number) {
    this.yearOptionSelections.update(selections =>
      selections.map(s => s.year === option ? { ...s, isChecked: !s.isChecked } : s)
    );
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (this.dropdownRef && this.dropdownRef.nativeElement && !this.dropdownRef.nativeElement.contains(event.target)) {
      this.dropdownOpen = false;
    }
  }
}

