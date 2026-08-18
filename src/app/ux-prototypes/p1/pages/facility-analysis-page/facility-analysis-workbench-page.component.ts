import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { upsertWorkspaceRecords } from 'src/app/account-workspace/account-workspace-patches';
import { AnalysisCommandHandler } from 'src/app/account-workspace/handlers/analysis-command-handler.service';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { getYearsWithFullDataAnalysis } from 'src/app/calculations/shared-calculations/calculationsHelpers';
import { EnergyUnitOptions, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { AnalysisGroup } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import {
  P1FacilityAnalysisStep,
  P1FacilityAnalysisStepId,
  buildP1AnalysisSteps,
  buildP1FacilityAnalysisRows,
  getP1GroupName,
  getP1StepIndex
} from './facility-analysis-workbench.helpers';

@Component({
  selector: 'app-p1-facility-analysis-workbench-page',
  templateUrl: './facility-analysis-workbench-page.component.html',
  styleUrls: ['./facility-analysis-page.component.css'],
  standalone: false
})
export class P1FacilityAnalysisWorkbenchPageComponent {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly workspaceService = inject(AccountWorkspaceService);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly analysisHandler = inject(AnalysisCommandHandler);
  private readonly statusCheckService = inject(AccountStatusCheckService);
  private readonly calendarizationService = inject(CalanderizationService);
  private readonly toast = inject(ToastNotificationsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly queryParamMap = toSignal(this.route.queryParamMap);
  private readonly calanderizedMeters = toSignal(this.calendarizationService.calanderizedMeters);

  readonly energyUnitOptions = EnergyUnitOptions;
  readonly waterUnitOptions = VolumeLiquidOptions;

  readonly account = this.workspace.account;
  readonly facility = this.workspace.selectedFacility;
  readonly canWrite = this.workspace.canWrite;
  readonly hasPending = this.workspace.hasPending;
  readonly analyses = computed(() => [...this.workspace.selectedFacilityAnalyses()]);
  readonly meterGroups = computed(() => [...this.workspace.facilityMeterGroups()]);
  readonly accountAnalyses = computed(() => [...this.workspace.accountAnalyses()]);
  readonly reports = computed(() => [...this.workspace.selectedFacilityReports()]);
  readonly facilityStatusCheck = toSignal(this.statusCheckService.selectedFacilityStatusCheck$);

  readonly selectedAnalysisGuid = computed(() => this.queryParamMap()?.get('analysis') || undefined);
  readonly selectedStepId = computed<P1FacilityAnalysisStepId>(() => {
    const step = this.queryParamMap()?.get('step');
    switch (step) {
      case 'group-setup':
      case 'regression':
      case 'group-annual':
      case 'group-monthly':
      case 'facility-annual':
      case 'facility-monthly':
      case 'references':
        return step;
      case 'account-analysis':
      case 'reports':
        return 'references';
      default:
        return 'setup';
    }
  });
  readonly selectedGroupId = computed(() => this.queryParamMap()?.get('group') || undefined);

  readonly selectedAnalysis = computed(() => {
    const guid = this.selectedAnalysisGuid();
    const analyses = this.analyses();
    return analyses.find(item => item.guid === guid) || analyses[0];
  });
  readonly selectedStatus = computed(() => {
    const analysis = this.selectedAnalysis();
    return analysis ? this.facilityStatusCheck()?.getAnalysisStatusById(analysis.guid) : undefined;
  });
  readonly rows = computed(() => buildP1FacilityAnalysisRows(
    this.analyses(),
    this.facilityStatusCheck()?.analysisStatusChecks ?? [],
    this.accountAnalyses(),
    this.reports(),
    this.facility()
  ));
  readonly selectedRow = computed(() => this.rows().find(row => row.analysis.guid === this.selectedAnalysis()?.guid));
  readonly linkedAccountAnalyses = computed(() => this.selectedRow()?.linkedAccountAnalyses ?? []);
  readonly linkedReports = computed(() => this.selectedRow()?.linkedReports ?? []);
  readonly bankingOptions = computed(() => {
    const selected = this.selectedAnalysis();
    return this.analyses().filter(item =>
      selected && item.guid !== selected.guid && item.analysisCategory === selected.analysisCategory && item.energyIsSource === selected.energyIsSource
    );
  });
  readonly steps = computed(() => buildP1AnalysisSteps(
    this.selectedAnalysis(),
    this.selectedStatus(),
    groupId => getP1GroupName(groupId, this.meterGroups())
  ));
  readonly currentStepIndex = computed(() => getP1StepIndex(this.steps(), this.selectedStepId(), this.selectedGroupId()));
  readonly currentStep = computed(() => this.steps()[this.currentStepIndex()] || this.steps()[0]);
  readonly selectedGroup = computed(() => {
    const analysis = this.selectedAnalysis();
    const groupId = this.currentStep()?.groupId || this.selectedGroupId();
    return analysis?.groups.find(group => group.idbGroupId === groupId);
  });
  readonly selectedGroupStatus = computed(() => {
    const group = this.selectedGroup();
    const analysis = this.selectedAnalysis();
    return group && analysis ? this.facilityStatusCheck()?.getGroupStatusChecksByGroupId(group.idbGroupId, analysis.guid) : undefined;
  });
  readonly selectedGroupName = computed(() => getP1GroupName(this.selectedGroup()?.idbGroupId, this.meterGroups()));
  readonly isGroupStep = computed(() => !!this.currentStep()?.groupId);
  readonly isFacilityResultStep = computed(() => this.selectedStepId() === 'facility-annual' || this.selectedStepId() === 'facility-monthly');
  readonly groupTabSteps = computed(() => {
    const group = this.selectedGroup();
    if (!group) {
      return [];
    }
    return this.steps().filter(step => step.groupId === group.idbGroupId);
  });
  readonly facilityResultTabSteps = computed(() => this.steps().filter(step => step.id === 'facility-annual' || step.id === 'facility-monthly'));
  readonly baselineYears = computed(() => {
    const analysis = this.selectedAnalysis();
    const facility = this.facility();
    const meters = this.calanderizedMeters();
    if (!analysis || !facility || !meters) {
      return [];
    }
    return getYearsWithFullDataAnalysis(meters, analysis, facility);
  });
  readonly previousStep = computed(() => this.steps()[this.currentStepIndex() - 1]);
  readonly nextStep = computed(() => this.steps()[this.currentStepIndex() + 1]);

  constructor() {
    effect(() => {
      const analysis = this.selectedAnalysis();
      this.workspaceService.selectFacilityAnalysis(analysis?.guid);
    });
  }

  goToDashboard(): void {
    const facility = this.facility();
    if (facility) {
      void this.router.navigate(['/p1', 'workspace', 'facility', facility.guid, 'analysis', 'dashboard', 'help']);
    }
  }

  goToStep(step: P1FacilityAnalysisStep | undefined): void {
    const facility = this.facility();
    const analysis = this.selectedAnalysis();
    if (!facility || !analysis || !step) {
      return;
    }
    void this.router.navigate(['/p1', 'workspace', 'facility', facility.guid, 'analysis', 'workbench', 'help'], {
      queryParams: { analysis: analysis.guid, step: step.id, group: step.groupId }
    });
  }

  goPrevious(): void {
    this.goToStep(this.previousStep());
  }

  goNext(): void {
    this.goToStep(this.nextStep());
  }

  getLocalStepLabel(step: P1FacilityAnalysisStep): string {
    switch (step.id) {
      case 'group-setup':
        return 'Setup';
      case 'regression':
        return 'Regression';
      case 'group-annual':
      case 'facility-annual':
        return 'Annual';
      case 'group-monthly':
      case 'facility-monthly':
        return 'Monthly';
      default:
        return step.label;
    }
  }

  async saveAnalysis(analysis: IdbAnalysisItem): Promise<void> {
    const account = this.account();
    if (!account || !this.canWrite()) {
      return;
    }
    const updated: IdbAnalysisItem = {
      ...analysis,
      modifiedDate: new Date()
    };
    await this.commandBoundary.execute(
      {
        entityKind: 'facilityAnalysis',
        changeKind: 'update',
        entityGuid: updated.guid,
        label: 'Save Facility Analysis',
        publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('facilityAnalyses', [value]) }
      },
      () => this.analysisHandler.updateFacilityAnalysis(updated, account.guid)
    );
    this.toast.showToast('Analysis Saved', undefined, undefined, false, 'alert-success');
  }
}
