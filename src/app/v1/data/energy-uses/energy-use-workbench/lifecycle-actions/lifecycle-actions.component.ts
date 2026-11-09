import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { registerDataDraft } from '@app/v1/data/editing/register-data-draft';
import { draftEqual } from '@app/v1/data/editing/draft-reconciliation';
import { EnergyUseActionsService } from '../../energy-use-actions.service';

@Component({ selector: 'app-energy-use-lifecycle-actions', standalone: false, templateUrl: './lifecycle-actions.component.html', styleUrls: ['./lifecycle-actions.component.css'] })
export class LifecycleActionsComponent {
  readonly item = input<IdbFacilityEnergyUseEquipment>();
  readonly canAct = input(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly committed = signal(false);
  readonly review = signal<IdbFacilityEnergyUseEquipment | undefined>(undefined);
  readonly stale = computed(() => !!this.review() && !draftEqual(this.review(), this.item()));
  readonly year = new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(9999), control => Number.isInteger(control.value) ? null : { integer: true }]);
  private readonly actions = inject(EnergyUseActionsService);
  private readonly modal = inject(ModalPortalService);
  private readonly view = inject(ViewContainerRef);
  private readonly destroy = inject(DestroyRef);
  private portal?: TemplatePortal;
  @ViewChild('confirmation') private readonly confirmation?: TemplateRef<unknown>;
  constructor() {
    registerDataDraft(signal(false), () => {}, computed(() => this.busy() || !!this.review() || this.committed()));
    this.destroy.onDestroy(() => this.hide());
    effect(() => { const active = this.modal.activePortal();
      if (this.portal && active !== this.portal && !this.busy() && !this.committed()) untracked(() => this.hide()); });
  }
  open(): void {
    const item = this.item(); if (!item || !this.canAct() || !this.confirmation) return;
    this.error.set(''); this.review.set(structuredClone(item));
    const years = [...item.operatingConditionsData.map(row => row.year), ...item.utilityData.flatMap(source => source.energyUse.map(row => row.year))].filter(year => Number.isInteger(year) && year >= 1 && year <= 9999);
    this.year.setValue(item.noLongerInUse?.year ?? (years.length ? Math.max(...years) : null));
    this.portal = new TemplatePortal(this.confirmation, this.view); this.modal.show(this.portal);
  }
  close(): void { if (!this.busy() && !this.committed()) this.hide(); }
  private hide(): void { if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide(); this.portal = undefined; this.review.set(undefined); }
  async confirm(): Promise<void> {
    const reviewed = this.review();
    if (!reviewed || !this.canAct() || this.busy() || this.committed() || this.stale()) return;
    if (!reviewed.noLongerInUse?.isNoLongerInUse && this.year.invalid) { this.year.markAsTouched(); return; }
    this.busy.set(true); this.error.set('');
    try {
      await this.actions.setLifecycle({ accountGuid: reviewed.accountId, facilityGuid: reviewed.facilityId, energyUseGuid: reviewed.guid }, reviewed,
        reviewed.noLongerInUse?.isNoLongerInUse ? null : this.year.value);
      if (!this.destroy.destroyed) this.hide();
    } catch (error) { if (!this.destroy.destroyed) { this.committed.set(error instanceof WorkspaceWriteError && error.persistenceCommitted);
      this.error.set(this.committed() ? 'The lifecycle change was saved. Refresh saved changes before continuing.' : error instanceof Error ? error.message : 'The lifecycle change failed.'); } }
    finally { if (!this.destroy.destroyed) this.busy.set(false); }
  }
  async recover(): Promise<void> {
    const item = this.review(); if (!item || !this.committed() || this.busy()) return;
    this.busy.set(true);
    try { await this.actions.recoverPublication(item.accountId); if (!this.destroy.destroyed) { this.committed.set(false); this.error.set(''); this.hide(); } }
    catch (error) { if (!this.destroy.destroyed) this.error.set(error instanceof Error ? error.message : 'Refresh failed. The lifecycle write will not be repeated.'); }
    finally { if (!this.destroy.destroyed) this.busy.set(false); }
  }
}
