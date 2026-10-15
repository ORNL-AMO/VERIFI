import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { FacilityReportType } from '@data/models/idbModels/facilityReport';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ResourceBrowseCardAction } from '@app/v1/shared/resource-browse-card/resource-browse-card.models';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { FacilityReportActionsService } from '../facility-report-actions.service';
import { FACILITY_REPORT_TYPES, FacilityReportCard, ReportFilters, buildFacilityReportCard, filterFacilityReportCards } from '../facility-report.models';
import { ReportDraftForm } from '../report-draft-slideout/report-draft-slideout.component';
import { reportTypeAvailable } from '@app/v1/shared/reports/report-availability';

type Editor = { readonly name: string; readonly type: FacilityReportType };

@Component({
  selector: 'app-facility-reports-dashboard', standalone: false,
  templateUrl: './facility-reports-dashboard.component.html',
  styleUrls: ['./facility-reports-dashboard.component.css']
})
export class FacilityReportsDashboardComponent implements OnDestroy {
  @ViewChild('deleteConfirmation', { static: true }) private deleteConfirmation!: TemplateRef<unknown>;
  @ViewChild('discardConfirmation', { static: true }) private discardConfirmation!: TemplateRef<unknown>;
  readonly workspace = inject(AccountWorkspaceStore);
  readonly status = inject(WorkspaceStatusService);
  readonly navigation = inject(WorkspaceNavigationService);
  private readonly router = inject(Router);
  private readonly actions = inject(FacilityReportActionsService);
  private readonly modal = inject(ModalPortalService);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly unsaved = inject(UnsavedChangesService);
  private ownPortal?: TemplatePortal;
  readonly reportTypes = computed(() => FACILITY_REPORT_TYPES.filter(option => reportTypeAvailable(option.value, this.workspace.account()?.displayEmissions)));
  readonly facility = computed(() => {
    const facility = this.workspace.selectedFacility();
    return facility?.guid === this.navigation.routeState().facilityGuid
      && facility.accountId === this.workspace.account()?.guid ? facility : undefined;
  });
  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    type: new FormControl<ReportFilters['type']>('all', { nonNullable: true }),
    status: new FormControl<ReportFilters['status']>('all', { nonNullable: true }),
    sort: new FormControl<ReportFilters['sort']>('attention', { nonNullable: true })
  });
  private readonly filters = toSignal(this.filtersForm.valueChanges, { initialValue: this.filtersForm.getRawValue() });
  readonly cards = computed(() => this.workspace.facilityReports()
    .filter(report => report.facilityId === this.facility()?.guid && report.accountId === this.workspace.account()?.guid
      && reportTypeAvailable(report.facilityReportType, this.workspace.account()?.displayEmissions))
    .map(report => buildFacilityReportCard(report, this.workspace.selectedFacilityAnalyses(), this.status.items(), this.status.state())));
  readonly visibleCards = computed(() => filterFacilityReportCards(this.cards(), this.filters() as ReportFilters));
  readonly saving = signal(false);
  readonly actionError = signal<string | undefined>(undefined);
  readonly editor = signal<Editor | undefined>(undefined);
  readonly deleteCandidate = signal<FacilityReportCard | undefined>(undefined);
  readonly editorForm: ReportDraftForm = new FormGroup({
    name: new FormControl('New Report', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    type: new FormControl<FacilityReportType>('analysis', { nonNullable: true })
  });
  private readonly draft = toSignal(this.editorForm.valueChanges, { initialValue: this.editorForm.getRawValue() });
  readonly draftChanged = computed(() => {
    const editor = this.editor();
    const draft = this.draft();
    return !!editor && (draft.name !== editor.name || draft.type !== editor.type);
  });
  readonly canAct = computed(() => !!this.facility() && this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly editorAvailabilityError = computed(() => this.editor() && !reportTypeAvailable(this.draft().type!, this.workspace.account()?.displayEmissions)
    ? 'Enable Other Impacts in Account Goals to access this report type.' : undefined);
  readonly canSave = computed(() => this.canAct() && !!this.draft().name?.trim() && !this.editorAvailabilityError());
  readonly cardActions = computed<readonly ResourceBrowseCardAction[]>(() => [
    { id: 'copy', label: 'Copy report', icon: 'copy', disabled: !this.canAct() },
    { id: 'delete', label: 'Delete report', icon: 'delete', tone: 'danger', disabled: !this.canAct() }
  ]);

  constructor() {
    const unregister = this.unsaved.register(() => this.hasUnsavedChanges(), () => this.cancelEditor(), () => this.isNavigationBlocked());
    this.destroyRef.onDestroy(unregister);
    let previousContext: string | undefined;
    effect(() => {
      const context = `${this.workspace.account()?.guid}:${this.navigation.routeState().facilityGuid}`;
      const availableTypes = this.reportTypes();
      untracked(() => {
        const filterType = this.filtersForm.controls.type.value;
        if (filterType !== 'all' && !availableTypes.some(option => option.value === filterType)) this.filtersForm.controls.type.setValue('all');
        if (previousContext !== undefined && context !== previousContext) {
          this.editor.set(undefined);
          this.actionError.set(undefined);
          this.cancelConfirmation();
        }
        previousContext = context;
      });
    });
  }

  hasUnsavedChanges(): boolean { return this.draftChanged(); }
  readonly navigationBlocked = computed(() => this.saving() || this.draftChanged());
  isNavigationBlocked(): boolean { return this.navigationBlocked(); }

  open(guid: string): void {
    const facility = this.facility();
    if (facility && !this.isNavigationBlocked()) void this.router.navigate(this.navigation.facilityReportWorkbenchRoute(facility.guid, guid));
  }

  openCreate(): void {
    if (this.canAct()) this.startEditor({ name: 'New Report', type: 'analysis' });
  }

  action(card: FacilityReportCard, action: string): void {
    if (!this.canAct()) return;
    if (action === 'copy') void this.runAction(async facilityGuid => {
      const report = await this.actions.copy(facilityGuid, card.report.guid);
      return report.guid;
    });
    if (action === 'delete') {
      this.actionError.set(undefined);
      this.deleteCandidate.set(card);
      this.showModal(this.deleteConfirmation);
    }
  }

  async submitEditor(): Promise<void> {
    const editor = this.editor();
    if (!editor || !this.canSave()) return;
    const draft = this.editorForm.getRawValue();
    await this.runAction(async facilityGuid => {
      const report = await this.actions.create(facilityGuid, draft.name, draft.type);
      this.editor.set(undefined);
      return report.guid;
    });
  }

  async confirmDelete(): Promise<void> {
    const candidate = this.deleteCandidate();
    if (!candidate) return;
    await this.runAction(async facilityGuid => {
      await this.actions.delete(facilityGuid, candidate.report.guid);
      this.cancelConfirmation();
      return undefined;
    });
  }

  cancelEditor(): void { if (!this.saving()) { this.editor.set(undefined); this.actionError.set(undefined); } }
  requestCloseEditor(): void {
    if (this.saving()) return;
    if (this.draftChanged()) this.showModal(this.discardConfirmation);
    else this.cancelEditor();
  }
  discardEditor(): void { this.cancelEditor(); this.cancelConfirmation(); }
  cancelConfirmation(): void {
    // Also called after a successful delete while the action is finishing.
    this.deleteCandidate.set(undefined);
    if (this.modal.activePortal() === this.ownPortal) this.modal.hide();
    this.ownPortal = undefined;
  }
  ngOnDestroy(): void { this.cancelConfirmation(); }

  private startEditor(editor: Editor): void {
    this.actionError.set(undefined);
    this.editorForm.reset({ name: editor.name, type: editor.type });
    this.editor.set(editor);
  }
  private showModal(template: TemplateRef<unknown>): void {
    this.ownPortal = new TemplatePortal(template, this.viewContainer);
    this.modal.show(this.ownPortal);
  }
  private async runAction(action: (facilityGuid: string) => Promise<string | undefined>): Promise<void> {
    if (!this.canAct()) return;
    const facilityGuid = this.facility()!.guid;
    const accountGuid = this.workspace.account()!.guid;
    this.saving.set(true);
    this.actionError.set(undefined);
    try {
      const openGuid = await action(facilityGuid);
      if (this.destroyRef.destroyed || this.facility()?.guid !== facilityGuid || this.workspace.account()?.guid !== accountGuid) return;
      this.saving.set(false);
      if (openGuid) void this.router.navigate(this.navigation.facilityReportWorkbenchRoute(facilityGuid, openGuid));
    } catch (error) {
      if (!this.destroyRef.destroyed && this.facility()?.guid === facilityGuid && this.workspace.account()?.guid === accountGuid) {
        this.actionError.set(error instanceof Error ? error.message : 'The report could not be saved. Try again.');
      }
    } finally {
      this.saving.set(false);
    }
  }
}
