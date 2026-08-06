import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from 'src/app/account-workspace/handlers/analysis-command-handler.service';
import { AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { Router } from '@angular/router';
import { AnalysisGroup } from 'src/app/models/analysis';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { getLatestCompleteAnalysisYear } from 'src/app/calculations/shared-calculations/calculationsHelpers';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { GroupAnalysisErrors } from 'src/app/models/validation';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';

@Component({
  selector: 'app-group-analysis-options',
  templateUrl: './group-analysis-options.component.html',
  styleUrls: ['./group-analysis-options.component.css'],
  standalone: false
})
export class GroupAnalysisOptionsComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
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
  async saveItem() {
    let analysisItem: IdbAnalysisItem = this.accountWorkspaceStore.selectedFacilityAnalysis();
    analysisItem.isAnalysisVisited = false;
    const _group = this.group();
    let groupIndex: number = analysisItem.groups.findIndex(group => { return group.idbGroupId == _group.idbGroupId });
    analysisItem.groups[groupIndex] = _group;
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    await this.commandBoundary.execute(
      { entityKind: 'facilityAnalysis', changeKind: 'update', entityGuid: analysisItem.guid, label: 'Save Facility Analysis' },
      () => this.analysisHandler.updateFacilityAnalysis(analysisItem, activeAccountGuid)
    );
    this.accountWorkspaceService.selectFacilityAnalysis((analysisItem)?.guid);
    this.analysisService.selectedGroup.next({ ..._group });
  }

  setAnalysisType() {
    if (this.group().analysisType != 'regression') {
      this.group().predictorVariables.forEach(variable => {
        if (!variable.production) {
          variable.productionInAnalysis = false;
        }
      });
    }
    this.changeModelType();
  }

  setExcludeGroup(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.group().analysisType = checked ? 'skip' : 'regression';
    this.setAnalysisType();
  }

  changeModelType() {
    this.group().models = undefined;
    this.group().selectedModelId = undefined;
    this.group().dateModelsGenerated = undefined;
    this.saveItem();
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
    this.analysisItem().groups.forEach(group => {
      group.models = [];
      group.selectedModelId = undefined;
      group.regressionConstant = undefined;
      group.regressionModelYear = undefined;
      group.regressionConstant = undefined;
      group.predictorVariables.forEach(variable => {
        variable.regressionCoefficient = undefined;
      })
    });
    await this.saveItem();
    this.cancelEnableForm();
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
    this.dataAdjustmentYearOptions().forEach(yearOption => {
      if (yearOption.selected) {
        this.group().dataAdjustments.push({ year: yearOption.value, amount: 0 });
      }
    });
    this.group().dataAdjustments.sort((a, b) => a.year - b.year);
    await this.saveItem();
    this.closeDataAdjustmentModal();
  }

  //REMOVE DATA ADJUSTMENT
  deleteDataAdjustmentYear: number;
  openRemoveDataAdjustment(year: number) {
    this.deleteDataAdjustmentYear = year;
  }

  async closeRemoveDataAdjustment(removeAdjustment: boolean) {
    if (removeAdjustment) {
      this.group().dataAdjustments = this.group().dataAdjustments.filter(adjustment => adjustment.year != this.deleteDataAdjustmentYear);
      await this.saveItem();
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
    this.baselineAdjustmentYearOptions().forEach(yearOption => {
      if (yearOption.selected) {
        this.group().baselineAdjustmentsV2.push({ year: yearOption.value, amount: 0 });
      }
    });
    this.group().baselineAdjustmentsV2.sort((a, b) => a.year - b.year);
    await this.saveItem();
    this.closeBaselineAdjustmentModal();
  }

  //REMOVE BASELINE ADJUSTMENT
  deleteBaselineAdjustmentYear: number;
  openRemoveBaselineAdjustment(year: number) {
    this.deleteBaselineAdjustmentYear = year;
  }

  async closeRemoveBaselineAdjustment(removeAdjustment: boolean) {
    if (removeAdjustment) {
      this.group().baselineAdjustmentsV2 = this.group().baselineAdjustmentsV2.filter(adjustment => adjustment.year != this.deleteBaselineAdjustmentYear);
      await this.saveItem();
    }
    this.deleteBaselineAdjustmentYear = undefined;
  }

  toggleAdjustmentOption(yearOption: { value: number, selected: boolean }) {
    yearOption.selected = !yearOption.selected;
  }
}
