import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { DestroyRef, Component, computed, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler, AnalysisGroupChanges } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { Router } from '@angular/router';
import { AnalysisGroup } from '@data/models/analysis';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { CalanderizedMeter } from '@data/models/calanderization';
import { getLatestCompleteAnalysisYear } from '@domain/calculations/shared-calculations/calculationsHelpers';
import { CalanderizationService } from '@shared/helper-services/calanderization.service';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { GroupAnalysisErrors } from '@data/models/validation';
import { FacilityStatusCheck } from '@domain/calculations/status-check-calculations/facilityStatusCheck';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { isBankedGroupConfigurationComplete } from '@shared/shared-analysis/banking-configuration';

@Component({
  selector: 'app-group-analysis-options',
  templateUrl: './group-analysis-options.component.html',
  styleUrls: ['./group-analysis-options.component.css'],
  standalone: false
})
export class GroupAnalysisOptionsComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly destroyRef = inject(DestroyRef);
  private analysisService: AnalysisService = inject(AnalysisService);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly analysisHandler = inject(AnalysisCommandHandler);
  private router: Router = inject(Router);
  private calanderizationService: CalanderizationService = inject(CalanderizationService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  group: Signal<AnalysisGroup> = toSignal(this.analysisService.selectedGroup, { initialValue: null });
  analysisItem: Signal<IdbAnalysisItem> = this.accountWorkspaceStore.selectedFacilityAnalysis;
  facility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  allFacilityAnalysisItems: Signal<Array<IdbAnalysisItem>> = computed(() => [...[...this.accountWorkspaceStore.selectedFacilityAnalyses()]]);
  accountAnalysisItems: Signal<Array<IdbAccountAnalysisItem>> = computed(() => [...this.accountWorkspaceStore.accountAnalyses()]);
  calanderizedMeters: Signal<Array<CalanderizedMeter>> = toSignal(this.calanderizationService.calanderizedMeters, { initialValue: [] });
  predictorData: Signal<Array<IdbPredictorData>> = computed(() => [...this.accountWorkspaceStore.predictorData()]);
  facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);
  hideInUseMessage: Signal<boolean> = toSignal(this.analysisService.hideInUseMessage, { initialValue: false });
  //COMPUTED SIGNALS
  showInUseMessage: Signal<boolean> = computed(() => {
    const allAccountAnalysisItems = this.accountAnalysisItems();
    const analysisItem = this.analysisItem();
    const hideInUseMessage = this.hideInUseMessage();
    if (!allAccountAnalysisItems || !analysisItem) {
      return false;
    }
    const facilityAnalysisItemId = analysisItem.guid;
    let facilityItemIds: Array<string> = allAccountAnalysisItems.flatMap(accountItem => {
      return accountItem.facilityAnalysisItems.map(facilityItem => {
        return facilityItem.analysisItemId;
      });
    });
    return facilityItemIds.includes(facilityAnalysisItemId) && !hideInUseMessage;
  });


  dataEndYear: Signal<number> = computed(() => {
    const calanderizedMeters = this.calanderizedMeters();
    const facility = this.facility();
    const group = this.group();
    const predictorData = this.predictorData();
    if (!calanderizedMeters || !facility || !group) {
      return null;
    }
    return getLatestCompleteAnalysisYear([group], calanderizedMeters, predictorData, [facility]);
  })

  baselineYearOptions: Signal<Array<number>> = computed(() => {
    const analysisItem = this.analysisItem();
    const dataEndYear = this.dataEndYear();
    if (!analysisItem || !dataEndYear) {
      return [];
    }
    let options: Array<number> = new Array();
    for (let i = analysisItem.baselineYear; i <= dataEndYear; i++) {
      options.push(i);
    }
    return options;
  });
  bankedAnalysisItem: Signal<IdbAnalysisItem> = computed(() => {
    const analysisItem = this.analysisItem();
    const allFacilityAnalysisItems = this.allFacilityAnalysisItems();
    if (!analysisItem || !analysisItem.hasBanking || !analysisItem.bankedAnalysisItemId) {
      return null;
    }
    return allFacilityAnalysisItems.find(item => item.guid == analysisItem.bankedAnalysisItemId);;
  });

  bankedAnalysisYears: Signal<Array<number>> = computed(() => {
    const bankedAnalysisItem = this.bankedAnalysisItem();
    const dataEndYear = this.dataEndYear();
    if (!bankedAnalysisItem || !dataEndYear) {
      return [];
    }
    let years: Array<number> = [];
    for (let i = bankedAnalysisItem.baselineYear + 1; i <= dataEndYear; i++) {
      years.push(i);
    }
    return years;
  });

  bankedGroup: Signal<AnalysisGroup> = computed(() => {
    const bankedAnalysisItem = this.bankedAnalysisItem();
    const group = this.group();
    if (!bankedAnalysisItem || !group) {
      return null;
    }
    return bankedAnalysisItem.groups.find(bankedGroup => bankedGroup.idbGroupId == group.idbGroupId);
  });

  bankedResultsReady: Signal<boolean> = computed(() => isBankedGroupConfigurationComplete(
    this.analysisItem(),
    this.group(),
    this.bankedAnalysisItem()
  ));

  hasModelsGenerated: Signal<boolean> = computed(() => {
    const group = this.group();
    if (!group) {
      return false;
    }
    return group.models && group.models.length > 0;
  });

  dataAdjustmentYearOptions: Signal<Array<{ value: number, selected: boolean }>> = computed(() => {
    const group = this.group();
    const baselineYearOptions = this.baselineYearOptions();
    if (!group || !baselineYearOptions) {
      return [];
    }
    let yearOptions: Array<{ value: number, selected: boolean }> = baselineYearOptions.map(year => { return { value: year, selected: false } });
    let dataAdjustmentYears: Array<number> = group.dataAdjustments.map(adjustment => adjustment.year);
    return yearOptions.filter(year => {
      if (!dataAdjustmentYears.includes(year.value)) {
        return year;
      }
    });
  });

  baselineAdjustmentYearOptions: Signal<Array<{ value: number, selected: boolean }>> = computed(() => {
    const group = this.group();
    const baselineYearOptions = this.baselineYearOptions();
    if (!group || !baselineYearOptions) {
      return [];
    }
    let yearOptions: Array<{ value: number, selected: boolean }> = baselineYearOptions.map(year => { return { value: year, selected: false } });
    let baselineAdjustmentYears: Array<number> = group.baselineAdjustmentsV2.map(adjustment => adjustment.year);
    return yearOptions.filter(year => {
      if (!baselineAdjustmentYears.includes(year.value)) {
        return year;
      }
    });
  });

  groupErrors: Signal<GroupAnalysisErrors> = computed(() => {
    const facilityStatusCheck = this.facilityStatusCheck();
    const group = this.group();
    const analysisItem = this.analysisItem();
    if (!facilityStatusCheck || !group) {
      return null;
    }
    let groupErrors: GroupAnalysisErrors = facilityStatusCheck.getGroupStatusChecksByGroupId(group.idbGroupId, analysisItem.guid)?.groupAnalysisErrors;
    if (groupErrors) {
      return groupErrors;
    };
    return null;
  });

  //METHODS
  async saveItem(changes: AnalysisGroupChanges | ((group: AnalysisGroup) => AnalysisGroupChanges)): Promise<boolean> {
    const analysisGuid = this.analysisItem()?.guid;
    const groupGuid = this.group()?.idbGroupId;
    const accountGuid = this.accountWorkspaceStore.account()?.guid;
    if (!analysisGuid || !groupGuid) { return false; }
    await this.commandBoundary.execute(
      { entityKind: 'facilityAnalysis', changeKind: 'update', entityGuid: analysisGuid, label: 'Save Facility Analysis',
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'facilityAnalyses', upsert: [value] }] }) } },
      () => {
        const current = this.accountWorkspaceStore.facilityAnalyses().find(item => item.guid === analysisGuid)
          ?.groups.find(group => group.idbGroupId === groupGuid);
        if (!current) { throw new WorkspaceWriteError('validation-failed', 'The analysis group is no longer available.'); }
        return this.analysisHandler.updateFacilityAnalysisGroup(
          analysisGuid, groupGuid, typeof changes === 'function' ? changes(current) : changes, accountGuid
        );
      }
    );
    return this.isCurrentOwner(accountGuid, analysisGuid, groupGuid);
  }

  private isCurrentOwner(accountGuid: string, analysisGuid: string, groupGuid: string): boolean {
    return !this.destroyRef.destroyed && this.accountWorkspaceStore.account()?.guid === accountGuid
      && this.analysisItem()?.guid === analysisGuid && this.group()?.idbGroupId === groupGuid;
  }

  setAnalysisType(analysisType: AnalysisGroup['analysisType']) {
    return this.saveItem(group => ({
      analysisType,
      models: undefined,
      selectedModelId: undefined,
      dateModelsGenerated: undefined,
      ...(analysisType !== 'regression' ? {
        predictorVariables: group.predictorVariables.filter(variable => !variable.production)
          .map(variable => ({ id: variable.id, productionInAnalysis: false }))
      } : {})
    }));
  }

  setExcludeGroup(checked: boolean) {
    return this.setAnalysisType(checked ? 'skip' : 'regression');
  }

  setProductionInAnalysis(id: string, productionInAnalysis: boolean) {
    return this.saveItem({ predictorVariables: [{ id, productionInAnalysis }] });
  }

  setMonthlyPercentBaseload(monthNum: number, percent: number) {
    return this.saveItem(group => ({
      monthlyPercentBaseload: group.monthlyPercentBaseload.map(month => month.monthNum === monthNum ? { ...month, percent } : month)
    }));
  }

  setAdjustment(field: 'dataAdjustments' | 'baselineAdjustmentsV2', year: number, amount: number) {
    return this.saveItem(group => ({
      [field]: group[field].map(adjustment => adjustment.year === year ? { ...adjustment, amount } : adjustment)
    }));
  }

  goToPredictors() {
    this.router.navigateByUrl('/data-evaluation/facility/' + this.facility().guid + '/utility/predictors');
  }

  goToMeterGroups() {
    this.router.navigateByUrl('/data-evaluation/facility/' + this.facility().guid + '/utility/meter-groups');
  }

  toggleHideInUseMessage() {
    this.analysisService.hideInUseMessage.next(true);
  }

  //ENABLE ANALYSIS FORM
  displayEnableForm: boolean = false;
  showEnableForm() {
    this.displayEnableForm = true;
  }

  cancelEnableForm() {
    this.displayEnableForm = false;
  }

  async confirmEnableForm() {
    const analysisGuid = this.analysisItem()?.guid;
    const groupGuid = this.group()?.idbGroupId;
    const accountGuid = this.accountWorkspaceStore.account()?.guid;
    await this.commandBoundary.execute(
      { entityKind: 'facilityAnalysis', changeKind: 'update', entityGuid: analysisGuid, label: 'Clear Facility Analysis Models',
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'facilityAnalyses', upsert: [value] }] }) } },
      () => this.analysisHandler.clearFacilityAnalysisModels(analysisGuid, accountGuid)
    );
    if (this.isCurrentOwner(accountGuid, analysisGuid, groupGuid)) { this.cancelEnableForm(); }
  }

  //DATA ADJUSTMENT
  displayDataAdjustmentModal: boolean = false;
  openDataAdjustmentModal() {
    this.displayDataAdjustmentModal = true;
  }

  closeDataAdjustmentModal() {
    this.displayDataAdjustmentModal = false;
  }

  async addDataAdjustments() {
    const years = this.dataAdjustmentYearOptions().filter(option => option.selected).map(option => option.value);
    const saved = await this.saveItem(group => ({
      dataAdjustments: [...group.dataAdjustments, ...years.filter(year => !group.dataAdjustments.some(item => item.year === year))
        .map(year => ({ year, amount: 0 }))].sort((a, b) => a.year - b.year)
    }));
    if (saved) { this.closeDataAdjustmentModal(); }
  }

  //REMOVE DATA ADJUSTMENT
  deleteDataAdjustmentYear: number;
  openRemoveDataAdjustment(year: number) {
    this.deleteDataAdjustmentYear = year;
  }

  async closeRemoveDataAdjustment(removeAdjustment: boolean) {
    if (removeAdjustment) {
      const year = this.deleteDataAdjustmentYear;
      const saved = await this.saveItem(group => ({ dataAdjustments: group.dataAdjustments.filter(adjustment => adjustment.year !== year) }));
      if (!saved) { return; }
    }
    this.deleteDataAdjustmentYear = undefined;
  }

  //BASELINE ADJUSTMENT
  displayBaselineAdjustmentModal: boolean = false;
  openBaselineAdjustmentModal() {
    this.displayBaselineAdjustmentModal = true;
  }

  closeBaselineAdjustmentModal() {
    this.displayBaselineAdjustmentModal = false;
  }

  async addBaselineAdjustments() {
    const years = this.baselineAdjustmentYearOptions().filter(option => option.selected).map(option => option.value);
    const saved = await this.saveItem(group => ({
      baselineAdjustmentsV2: [...group.baselineAdjustmentsV2, ...years.filter(year => !group.baselineAdjustmentsV2.some(item => item.year === year))
        .map(year => ({ year, amount: 0 }))].sort((a, b) => a.year - b.year)
    }));
    if (saved) { this.closeBaselineAdjustmentModal(); }
  }

  //REMOVE BASELINE ADJUSTMENT
  deleteBaselineAdjustmentYear: number;
  openRemoveBaselineAdjustment(year: number) {
    this.deleteBaselineAdjustmentYear = year;
  }

  async closeRemoveBaselineAdjustment(removeAdjustment: boolean) {
    if (removeAdjustment) {
      const year = this.deleteBaselineAdjustmentYear;
      const saved = await this.saveItem(group => ({ baselineAdjustmentsV2: group.baselineAdjustmentsV2.filter(adjustment => adjustment.year !== year) }));
      if (!saved) { return; }
    }
    this.deleteBaselineAdjustmentYear = undefined;
  }

  toggleAdjustmentOption(yearOption: { value: number, selected: boolean }) {
    yearOption.selected = !yearOption.selected;
  }
}
