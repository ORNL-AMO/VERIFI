import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, Injector, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, input, signal } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { buildFacilityAnalysesWithoutPredictors } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { predictorDeletionSnapshot, PredictorDeletionPreview } from '@data/account-workspace/handlers/predictor-command-handler.service';
import { isStandardPredictor } from '@data/models/idbModels/predictor';
import { MetersDashboardActionsService } from '@app/v1/facility/data/meters/meters-dashboard/meters-dashboard-actions.service';
import { PredictorWorkspaceActionsService } from '@app/v1/facility/data/predictors/predictor-workspace-actions.service';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { InventoryTileActionRequest, InventoryTileMenuAction } from '@app/v1/shared/inventory/inventory.models';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { PortfolioFacilityService } from '../portfolio-facility.service';

type Resource = 'facilities' | 'meters' | 'predictors';
interface PendingAction { readonly request: InventoryTileActionRequest; readonly accountGuid: string; readonly name: string; readonly snapshot: string; readonly readingCount: number; readonly predictorPreview?: PredictorDeletionPreview; readonly facilityGuid?: string; }

@Component({ selector: 'app-account-inventory-actions', standalone: true, imports: [ConfirmationDialogComponent],
  providers: [MetersDashboardActionsService, PredictorWorkspaceActionsService],
  templateUrl: './account-inventory-actions.component.html' })
export class AccountInventoryActionsComponent {
  readonly resource = input.required<Resource>();
  private readonly destroy = inject(DestroyRef);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly injector = inject(Injector);
  private readonly portal = inject(ModalPortalService);
  private readonly container = inject(ViewContainerRef);
  @ViewChild('confirmation') private confirmation!: TemplateRef<unknown>;
  readonly pending = signal<PendingAction | undefined>(undefined);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly actions = computed<readonly InventoryTileMenuAction[]>(() => [
    ...(this.resource() === 'facilities' ? [] : [{ id: 'copy' as const, label: this.resource() === 'meters' ? 'Copy meter' : 'Copy predictor', icon: 'copy' as const, disabled: !this.canAct() }]),
    { id: 'delete', label: this.resource() === 'facilities' ? 'Delete facility' : this.resource() === 'meters' ? 'Delete meter' : 'Delete predictor', icon: 'delete', disabled: !this.canAct() }
  ]);
  readonly actionsByGuid = computed(() => this.resource() !== 'predictors' ? {} : Object.fromEntries(this.workspace.predictors().map(item => [item.guid, this.actions().filter(action => isStandardPredictor(item) || (item.predictorType === 'Weather' && action.id === 'delete'))])));
  readonly label = computed(() => this.resource() === 'facilities' ? 'facility' : this.resource() === 'meters' ? 'meter' : 'predictor');
  readonly affectedAnalyses = computed(() => {
    const pending = this.pending(); const preview = pending?.predictorPreview;
    if (!preview) return 0;
    const updated = buildFacilityAnalysesWithoutPredictors(preview.facilityAnalyses, new Set(preview.predictors.map(item => item.guid)));
    return preview.facilityAnalyses.filter((analysis, index) => predictorDeletionSnapshot(analysis) !== predictorDeletionSnapshot(updated[index])).length;
  });

  constructor() {
    effect(() => {
      const pending = this.pending();
      if (pending && this.workspace.account()?.guid !== pending.accountGuid) { this.portal.hide(); this.pending.set(undefined); }
    });
  }
  request(request: InventoryTileActionRequest): void {
    if (!this.canAct() || !['copy', 'delete'].includes(request.action)) return;
    this.error.set('');
    try {
      const account = this.workspace.account(); const record = this.record(request.guid);
      if (!account || !record || record.accountId !== account.guid) throw new Error('This item is no longer available in this account.');
      const preview = this.resource() === 'predictors' && request.action === 'delete'
        ? this.injector.get(PredictorWorkspaceActionsService).previewDeletion([record.guid], 'facilityId' in record ? record.facilityId : undefined) : undefined;
      const count = this.resource() === 'meters' ? this.workspace.meterData().filter(item => item.meterId === record.guid).length
        : preview?.predictorData.length ?? 0;
      this.pending.set({ request, name: record.name, accountGuid: account.guid, snapshot: this.snapshot(record.guid), readingCount: count,
        predictorPreview: preview, facilityGuid: 'facilityId' in record ? record.facilityId : undefined });
      this.portal.show(new TemplatePortal(this.confirmation, this.container));
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'The action could not be opened.'); }
  }
  dismiss(): void {
    if (this.saving()) return;
    if (this.pending()) this.portal.hide();
    this.pending.set(undefined);
  }
  async confirm(): Promise<void> {
    const pending = this.pending();
    if (!pending || !this.canAct()) return;
    this.error.set('');
    try {
      if (this.workspace.account()?.guid !== pending.accountGuid || this.snapshot(pending.request.guid) !== pending.snapshot) throw new Error('This item changed. Cancel and review the action again.');
      const record = this.record(pending.request.guid);
      if (!record) throw new Error('This item is no longer available.');
      this.saving.set(true);
      if (this.resource() === 'facilities') {
        const facility = this.workspace.facilities().find(item => item.guid === record.guid);
        if (!facility || pending.request.action !== 'delete') throw new Error('This action is unavailable.');
        await this.injector.get(PortfolioFacilityService).deleteFacility(facility);
      } else if (this.resource() === 'meters') {
        const meter = this.workspace.meters().find(item => item.guid === record.guid)!;
        const actions = this.injector.get(MetersDashboardActionsService);
        if (pending.request.action === 'copy') await actions.copyMeter(meter); else await actions.deleteMeter(meter);
      } else {
        const actions = this.injector.get(PredictorWorkspaceActionsService);
        if (pending.request.action === 'copy') await actions.copyPredictor(this.workspace.predictors().find(item => item.guid === record.guid)!, pending.facilityGuid);
        else if (pending.predictorPreview) await actions.deletePredictors(pending.predictorPreview, pending.facilityGuid);
      }
      if (!this.destroy.destroyed && this.pending() === pending) { this.saving.set(false); this.dismiss(); }
    } catch (error) { if (!this.destroy.destroyed && this.pending() === pending) this.error.set(error instanceof Error ? error.message : 'The action could not be completed.'); }
    finally { if (!this.destroy.destroyed) this.saving.set(false); }
  }
  private record(guid: string) {
    return this.resource() === 'facilities' ? this.workspace.facilities().find(item => item.guid === guid)
      : this.resource() === 'meters' ? this.workspace.meters().find(item => item.guid === guid) : this.workspace.predictors().find(item => item.guid === guid);
  }
  private snapshot(guid: string): string {
    const record = this.record(guid);
    if (this.resource() === 'meters') return JSON.stringify([record, this.workspace.meterData().filter(item => item.meterId === guid)]);
    if (this.resource() === 'predictors') return JSON.stringify([record, this.workspace.predictorData().filter(item => item.predictorId === guid)]);
    return JSON.stringify([record, this.workspace.meters().filter(item => item.facilityId === guid), this.workspace.predictors().filter(item => item.facilityId === guid)]);
  }
  ngOnDestroy(): void { if (this.pending()) this.portal.hide(); }
}
