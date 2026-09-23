import { TemplatePortal } from '@angular/cdk/portal';
import { Component, Input, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IdbFacility } from '@data/models/idbModels/facility';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ResourceBrowseCardComponent } from '@app/v1/shared/resource-browse-card/resource-browse-card.component';
import { ResourceBrowseCardAction, ResourceBrowseCardView } from '@app/v1/shared/resource-browse-card/resource-browse-card.models';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { PredictorWorkspaceActionsService } from '../../predictor-workspace-actions.service';
import { PredictorCardView, PredictorWorkbenchTabId } from '../../models';
import { ConfirmDeletePredictorModalComponent } from './confirm-delete-predictor-modal/confirm-delete-predictor-modal.component';

@Component({
  selector: 'app-predictor-browse-card', templateUrl: './predictor-browse-card.component.html',
  styleUrls: ['./predictor-browse-card.component.css'], standalone: true,
  imports: [ResourceBrowseCardComponent, ConfirmDeletePredictorModalComponent]
})
export class PredictorBrowseCardComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly workspace = inject(FacilityPredictorsWorkspaceService, { optional: true });
  private readonly actions = inject(PredictorWorkspaceActionsService, { optional: true });
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private deleteModalOpen = false;

  @Input({ required: true }) card!: PredictorCardView;
  @Input() portfolioFacility: IdbFacility | undefined;
  @Input() showFacilityHeader = false;
  @Input() allowMutations = true;
  @ViewChild('deletePredictorConfirmModal') private readonly deletePredictorConfirmModal?: TemplateRef<unknown>;

  readonly saving = signal(false);
  readonly actionError = signal<string | undefined>(undefined);
  readonly deleting = signal(false);
  readonly canAct = computed(() => !!this.actions && this.allowMutations && !!this.workspace?.canWrite()
    && !this.workspace?.hasPending() && !this.saving());

  get resourceView(): ResourceBrowseCardView {
    return {
      title: this.card.predictor.name || 'Untitled predictor',
      openLabel: `Open ${this.card.predictor.name || 'untitled predictor'} settings`,
      icon: this.card.icon,
      statusTone: this.card.statusTone,
      owner: this.showFacilityHeader && this.portfolioFacility ? { label: this.portfolioFacility.name, icon: 'facility' } : undefined,
      chips: [
        { id: 'type', label: this.card.typeLabel, icon: this.card.icon, accentColor: 'var(--v1-facility)' },
        { id: 'classification', label: this.card.classificationLabel, tone: 'neutral' },
        { id: 'status', label: this.card.statusLabel, icon: this.card.statusIcon, tone: this.card.statusTone, loading: this.card.statusTone === 'info' }
      ],
      factSections: [
        { id: 'summary', facts: [
          { id: 'unit', label: 'Unit', valueLabel: this.card.unitLabel },
          { id: 'entries', label: 'Entries', valueLabel: String(this.card.readingCount) },
          { id: 'first-reading', label: 'First reading', valueLabel: this.card.firstReadingLabel },
          { id: 'latest-reading', label: 'Latest', valueLabel: this.card.latestReadingLabel },
          ...(this.card.weatherStationLabel ? [{ id: 'station', label: 'Station', valueLabel: this.card.weatherStationLabel }] : []),
          ...(this.card.baseTemperatureLabel ? [{ id: 'base-temperature', label: 'Weather setup', valueLabel: this.card.baseTemperatureLabel }] : [])
        ] },
        { id: 'statistics', ariaLabel: 'Predictor statistics', emphasis: 'secondary',
          note: this.card.statistics.unitLabel ? `Values shown in ${this.card.statistics.unitLabel}` : undefined,
          facts: this.card.statistics.facts.map(fact => ({ ...fact, metaLabel: fact.periodLabel })) }
      ],
      notes: this.card.statusActionSummaries.map((summary, index) => ({ id: `status-${index}`, label: summary, icon: this.card.statusIcon })),
      footerTag: this.card.weatherTypeLabel ? { label: this.card.weatherTypeLabel, icon: this.card.icon } : undefined,
      errorMessage: this.actionError()
    };
  }

  get resourceActions(): ReadonlyArray<ResourceBrowseCardAction> {
    return [
      { id: 'readings', label: 'Open readings', icon: 'table' },
      ...(this.allowMutations && this.actions ? [
        { id: 'copy', label: 'Copy predictor', icon: 'copy' as const, disabled: !this.canAct(), loading: this.saving() },
        { id: 'delete', label: 'Delete predictor', icon: 'delete' as const, tone: 'danger' as const, disabled: !this.canAct() }
      ] : [])
    ];
  }

  ngOnDestroy(): void { this.hideDeleteModal(); }
  openSettings(): void { this.openTab('settings'); }
  handleAction(actionId: string): void {
    if (actionId === 'readings') this.openTab('readings');
    if (actionId === 'copy') void this.copyPredictor();
    if (actionId === 'delete') this.requestDeletePredictor();
  }
  async copyPredictor(): Promise<void> {
    if (!this.canAct() || !this.actions) return;
    await this.runAction(async () => {
      const copy = await this.actions!.copyPredictor(this.card.predictor);
      this.openTab('settings', copy.guid);
    });
  }
  requestDeletePredictor(): void {
    const template = this.deletePredictorConfirmModal;
    if (!this.canAct() || !template) return;
    this.actionError.set(undefined);
    this.deleting.set(true);
    this.deleteModalOpen = true;
    this.modalPortal.show(new TemplatePortal(template, this.viewContainerRef));
  }
  cancelDeletePredictor(): void {
    if (!this.saving()) { this.deleting.set(false); this.actionError.set(undefined); this.hideDeleteModal(); }
  }
  async confirmDeletePredictor(): Promise<void> {
    if (!this.canAct() || !this.actions) return;
    await this.runAction(async () => {
      await this.actions!.deletePredictor(this.card.predictor);
      this.deleting.set(false);
      this.hideDeleteModal();
    });
  }

  private openTab(tab: PredictorWorkbenchTabId, predictorGuid = this.card.predictor.guid): void {
    const facility = this.portfolioFacility ?? this.workspace?.facility();
    if (facility) void this.router.navigate(this.navigation.facilityPredictorRoute(facility.guid, predictorGuid, tab));
  }
  private async runAction(action: () => Promise<void>): Promise<void> {
    if (!this.canAct()) return;
    this.saving.set(true);
    this.actionError.set(undefined);
    try { await action(); }
    catch (error) { this.actionError.set(error instanceof Error ? error.message : 'The predictor change could not be saved.'); }
    finally { this.saving.set(false); }
  }
  private hideDeleteModal(): void {
    if (this.deleteModalOpen) { this.deleteModalOpen = false; this.modalPortal.hide(); }
  }
}
