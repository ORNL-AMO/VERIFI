import { AnalysisAutosave } from '../../analysis-autosave';
import { RouterGuardService } from '@shared/shared-router-guard-modal/router-guard-service';
import { RegressionModelMenuComponent } from './regression-model-menu/regression-model-menu.component';
import { getAnalysisGroupChanges } from '../../analysis-edits';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { DestroyRef, Component, computed, effect, ElementRef, HostListener, inject, signal, Signal, untracked, ViewChild, WritableSignal } from '@angular/core';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { CalanderizedMeter } from '@data/models/calanderization';
import { getYearsWithFullData } from '@domain/calculations/shared-calculations/calculationsHelpers';
import { CalanderizationService } from '@shared/helper-services/calanderization.service';
import { toSignal } from '@angular/core/rxjs-interop';
import * as _ from 'lodash';
import { GroupAnalysisErrors } from '@data/models/validation';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { emptyGroupAnalysisErrors } from '@domain/calculations/status-check-calculations/validation/groupAnalysisValidation';
import { FacilityStatusCheck } from '@domain/calculations/status-check-calculations/facilityStatusCheck';
import { RegressionModelStateService } from '@data/account-workspace/regression-model-state.service';

interface ModelSelectionDraft {
  accountGuid: string;
  analysisGuid: string;
  group: AnalysisGroup;
}

type OrderDataBy = 'adjust_R2' | 'modelYear' | 'R2' | 'modelPValue';

@Component({
  selector: 'app-regression-model-selection',
  templateUrl: './regression-model-selection.component.html',
  styleUrls: ['./regression-model-selection.component.css'],
  standalone: false
})
export class RegressionModelSelectionComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly routerGuardService = inject(RouterGuardService);
  readonly selectionAutosave = new AnalysisAutosave<ModelSelectionDraft>((draft, baseline) => this.persistSelection(draft, baseline));
  readonly modelSelectionError = this.selectionAutosave.error;
  private selectionOwnerKey: string;
  private analysisService: AnalysisService = inject(AnalysisService);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly analysisHandler = inject(AnalysisCommandHandler);
  private calanderizationService: CalanderizationService = inject(CalanderizationService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);
  private regressionModelState = inject(RegressionModelStateService);

  selectedFacility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  analysisItem: Signal<IdbAnalysisItem> = this.accountWorkspaceStore.selectedFacilityAnalysis;
  selectedGroup: Signal<AnalysisGroup> = toSignal(this.analysisService.selectedGroup);
  calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters, { initialValue: [] });
  generatedModelsPerGroup = this.regressionModelState.modelsByGroup;
  facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);
  hideInUseMessage: Signal<boolean> = toSignal(this.analysisService.hideInUseMessage, { initialValue: false });

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
    if (analysisItem && this.hideInUseMessage() == false) {
      const accountAnalysisItems = this.accountWorkspaceQuery.getAccountAnalysesForFacilityAnalysis(analysisItem.guid);
      if (accountAnalysisItems.length != 0) {
        return true;
      }
    }
    return false;
  });

  selectedInspectModel: JStatRegressionModel;
  private inspectionOwner: { accountGuid: string; analysisGuid: string; groupGuid: string };
  dropdownOpen: boolean = false;

  showInvalid: WritableSignal<boolean> = signal(false);
  showFailedValidationModel: WritableSignal<boolean> = signal(false);
  yearOptionSelections: WritableSignal<Array<{ year: number, isChecked: boolean }>> = signal([]);

  groupErrors: Signal<GroupAnalysisErrors> = computed(() => {
    const selectedGroup = this.selectedGroup();
    const facilityStatusCheck = this.facilityStatusCheck();
    const analysisItem = this.analysisItem();
    if (selectedGroup && analysisItem && facilityStatusCheck) {
      const groupError = facilityStatusCheck.getGroupStatusChecksByGroupId(selectedGroup.idbGroupId, analysisItem.guid)?.groupAnalysisErrors;
      if (groupError) {
        return groupError;
      } else {
        return emptyGroupAnalysisErrors();
      }
    }
    return emptyGroupAnalysisErrors();
  });

  @ViewChild('dropdown') dropdownRef: ElementRef;
  @ViewChild(RegressionModelMenuComponent) private modelMenu: RegressionModelMenuComponent;

  selectedGroupId: string;
  constructor() {
    effect(() => {
      const group = this.selectedGroup();
      const analysisGuid = this.analysisItem()?.guid;
      const accountGuid = this.accountWorkspaceStore.account()?.guid;
      if (!group || !analysisGuid) { return; }
      untracked(() => {
        const ownerKey = accountGuid + ':' + analysisGuid + ':' + group.idbGroupId;
        if (this.selectionOwnerKey !== ownerKey || !this.selectionAutosave.hasPending) {
          this.selectionOwnerKey = ownerKey;
          this.selectionAutosave.hydrate({ accountGuid, analysisGuid, group }, true);
        }
      });
    });
    this.destroyRef.onDestroy(() => this.selectionAutosave.destroy());

    effect(() => {
      const selectedGroup = this.selectedGroup();
      const calanderizedMeters = this.calanderizedMeters();
      const facility = this.selectedFacility();
      if (selectedGroup && calanderizedMeters && calanderizedMeters.length > 0 && facility) {
        if (selectedGroup.idbGroupId != this.selectedGroupId) {
          this.selectedGroupId = selectedGroup.idbGroupId;
          const groupMeters = calanderizedMeters.filter(cMeter => cMeter.meter.groupId == selectedGroup.idbGroupId);
          const yearsWithFullData = getYearsWithFullData(groupMeters, facility);
          this.yearOptionSelections.set(yearsWithFullData.map(year => ({ year, isChecked: year >= this.analysisItem().baselineYear })));
        }
      }
    });

    effect(() => {
      const selectedGroup = this.selectedGroup();
      const generatedModelsPerGroup = this.generatedModelsPerGroup();
      if (selectedGroup && selectedGroup.models && generatedModelsPerGroup && !generatedModelsPerGroup[selectedGroup.idbGroupId]) {
        this.regressionModelState.setForGroup(selectedGroup.idbGroupId, selectedGroup.models);
      }
    });

    effect(() => {
      //need to toggle on showInvalid and showFailedValidationModel if selected model is invalid or failed validation so that it shows in the list and user can select it to see details
      const generatedModels = this.generatedModels();
      const selectedGroup = this.selectedGroup();
      if (generatedModels && selectedGroup) {
        const selectedModel = generatedModels.find(model => model.modelId === selectedGroup.selectedModelId);
        if (selectedModel) {
          if (!selectedModel.isValid && !this.showInvalid()) {
            this.showInvalid.set(true);
          }
          if (selectedModel.SEPValidation && !selectedModel.SEPValidation.every(SEPValidation => SEPValidation.isValid) && !this.showFailedValidationModel()) {
            this.showFailedValidationModel.set(true);
          }
          const yearOption = untracked(() => this.yearOptionSelections()).find(option => option.year === selectedModel.modelYear);
          if (yearOption && !yearOption.isChecked) {
            this.yearOptionSelections.update(selections => selections.map(s => s.year === selectedModel.modelYear ? { ...s, isChecked: true } : s));
          }
        }
      }
      // const selectedModel = this.generatedModels().find(model => model.modelId === this.selectedGroup()?.selectedModelId);
      // const groupErrors = this.groupErrors();
    })
  }

  async selectModel(modelId?: string): Promise<boolean> {
    const currentGroup: AnalysisGroup = this.selectedGroup();
    const selectedModelId = modelId ?? currentGroup.selectedModelId;
    const generatedModels: Array<JStatRegressionModel> = this.generatedModels();
    const selectedModel: JStatRegressionModel = generatedModels.find(model => model.modelId === selectedModelId);
    if (!selectedModel) { return false; }
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
    const analysisGuid = this.analysisItem()?.guid;
    const accountGuid = this.accountWorkspaceStore.account()?.guid;
    if (this.modelMenu) {
      if (!await this.modelMenu.saveModelSelection(updatedGroup)) { return false; }
    } else if (!await this.saveItem(updatedGroup)) { return false; }
    if (this.isCurrentOwner(accountGuid, analysisGuid, updatedGroup.idbGroupId)) {
      this.regressionModelState.setForGroup(updatedGroup.idbGroupId, generatedModels);
    }
    return true;
  }

  saveItem(selectedGroup?: AnalysisGroup): Promise<boolean> {
    return this.selectionAutosave.capture({
      accountGuid: this.accountWorkspaceStore.account()?.guid, analysisGuid: this.analysisItem()?.guid,
      group: selectedGroup ?? this.selectedGroup()
    }, true, true);
  }

  private async persistSelection(draft: ModelSelectionDraft, baseline: ModelSelectionDraft): Promise<void> {
    const changes = getAnalysisGroupChanges(baseline.group, draft.group);
    if (!Object.keys(changes).length) { return; }
    await this.commandBoundary.execute(
      { entityKind: 'facilityAnalysis', changeKind: 'update', entityGuid: draft.analysisGuid, label: 'Save Facility Analysis',
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'facilityAnalyses', upsert: [value] }] }) } },
      () => this.analysisHandler.updateFacilityAnalysisGroup(draft.analysisGuid, draft.group.idbGroupId, changes, draft.accountGuid)
    );
  }

  retryModelSelection(): Promise<boolean> { return this.selectionAutosave.flush(); }

  private isCurrentOwner(accountGuid: string, analysisGuid: string, groupGuid: string): boolean {
    return !this.destroyRef.destroyed && this.accountWorkspaceStore.account()?.guid === accountGuid
      && this.analysisItem()?.guid === analysisGuid && this.selectedGroup()?.idbGroupId === groupGuid;
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

  async inspectModel(model: JStatRegressionModel) {
    const accountGuid = this.accountWorkspaceStore.account()?.guid;
    const analysisGuid = this.analysisItem()?.guid;
    const groupGuid = this.selectedGroup()?.idbGroupId;
    if (!await this.flushChanges() || !this.isCurrentOwner(accountGuid, analysisGuid, groupGuid)) { return; }
    this.selectedInspectModel = model;
    this.inspectionOwner = {
      accountGuid: this.accountWorkspaceStore.account()?.guid,
      analysisGuid: this.analysisItem()?.guid,
      groupGuid: this.selectedGroup()?.idbGroupId
    };
  }

  async flushChanges(): Promise<boolean> {
    if (!await this.selectionAutosave.flush()) { return false; }
    return this.modelMenu?.flushChanges() ?? true;
  }

  async canDeactivate(): Promise<boolean> {
    if (!await this.selectionAutosave.canDeactivate(this.routerGuardService, () => undefined)) { return false; }
    return this.modelMenu?.canDeactivate() ?? true;
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.selectionAutosave.hasPending) { event.preventDefault(); event.returnValue = ''; }
  }

  cancelInspectModel() {
    this.selectedInspectModel = undefined;
    this.inspectionOwner = undefined;
  }

  async selectFromInspection() {
    const model = this.selectedInspectModel;
    const owner = this.inspectionOwner;
    if (!owner || !this.isCurrentOwner(owner.accountGuid, owner.analysisGuid, owner.groupGuid)) { return; }
    const { accountGuid, analysisGuid, groupGuid } = owner;
    if (!await this.selectModel(model.modelId)) { return; }
    if (this.isCurrentOwner(accountGuid, analysisGuid, groupGuid) && this.selectedInspectModel === model) {
      this.cancelInspectModel();
    }
  }

  toggleHideInUseMessage() {
    this.analysisService.hideInUseMessage.next(true);
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
