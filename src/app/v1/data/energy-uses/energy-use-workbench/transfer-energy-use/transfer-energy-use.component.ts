import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, Injector, afterNextRender, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { draftEqual } from '@app/v1/data/editing/draft-reconciliation';
import { registerDataDraft } from '@app/v1/data/editing/register-data-draft';
import { EnergyUseActionsService } from '../../energy-use-actions.service';

@Component({ selector: 'app-transfer-energy-use', standalone: false,
  templateUrl: './transfer-energy-use.component.html', styleUrls: ['./transfer-energy-use.component.css'] })
export class TransferEnergyUseComponent {
  readonly item = input<IdbFacilityEnergyUseEquipment>();
  readonly canAct = input(false);
  readonly transferred = output<IdbFacilityEnergyUseEquipment>();
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly actions = inject(EnergyUseActionsService);
  private readonly modal = inject(ModalPortalService);
  private readonly view = inject(ViewContainerRef);
  private readonly destroy = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private opener?: HTMLElement;
  private portal?: TemplatePortal;
  private submittedTarget?: IdbFacilityEnergyUseGroup;
  @ViewChild('transferDrawer') private readonly transferDrawer?: TemplateRef<unknown>;
  readonly review = signal<IdbFacilityEnergyUseEquipment | undefined>(undefined);
  readonly target = new FormControl<IdbFacilityEnergyUseGroup | null>(null);
  private readonly selection = toSignal(this.target.valueChanges, { initialValue: null });
  readonly search = new FormControl('', { nonNullable: true });
  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  readonly busy = signal(false);
  readonly committed = signal(false);
  readonly error = signal('');
  readonly blocked = computed(() => this.busy() || this.committed() || !!this.review());
  readonly facility = computed(() => this.workspace.facilities().find(facility => facility.guid === this.review()?.facilityId && facility.accountId === this.review()?.accountId));
  readonly groups = computed(() => {
    const item = this.review();
    return this.workspace.energyUseGroups().filter(group => item && group.accountId === item.accountId && group.facilityId === item.facilityId
      && group.guid !== item.energyUseGroupId && group.guid !== 'unavailable')
      .slice().sort((a, b) => a.name.localeCompare(b.name) || a.guid.localeCompare(b.guid));
  });
  readonly matchingGroups = computed(() => this.groups().filter(group => (group.name || '').toLowerCase().includes(this.query().trim().toLowerCase())));
  readonly stale = computed(() => {
    const review = this.review(), target = this.selection();
    return !!review && (!draftEqual(review, this.item()) || !this.facility() || this.workspace.account()?.guid !== review.accountId
      || (!!target && !draftEqual(target, this.groups().find(group => group.guid === target.guid))));
  });
  // Opening requires settled Setup; the host then disables its form while this review is active.
  readonly canConfirm = computed(() => !!this.review() && !!this.selection() && !this.stale()
    && this.workspace.canWrite() && !this.workspace.hasPending() && !this.busy() && !this.committed());

  constructor() {
    registerDataDraft(signal(false), () => {}, this.blocked);
    this.destroy.onDestroy(() => this.hide());
    effect(() => {
      const active = this.modal.activePortal(), item = this.item(), review = this.review();
      if (!this.busy() && !this.committed() && this.portal && (active !== this.portal || (item && review && item.guid !== review.guid))) untracked(() => this.hide());
    });
  }
  open(): void {
    const item = this.item();
    if (!item || !this.canAct() || this.blocked() || !this.transferDrawer) return;
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    this.review.set(structuredClone(item)); this.target.reset(null); this.search.reset(''); this.error.set(''); this.submittedTarget = undefined;
    this.portal = new TemplatePortal(this.transferDrawer, this.view);
    this.modal.show(this.portal, { blockWorkspace: true });
  }
  chooseGroup(group: IdbFacilityEnergyUseGroup): void {
    if (this.busy() || this.committed() || !this.groups().some(row => row.guid === group.guid)) return;
    this.target.setValue(structuredClone(group));
  }
  close(): void { if (!this.busy() && !this.committed()) this.hide(); }
  private hide(): void {
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    this.portal = undefined; this.review.set(undefined);
    const opener = this.opener;
    this.opener = undefined;
    if (!this.destroy.destroyed && opener) afterNextRender(() => { if (opener.isConnected) opener.focus(); }, { injector: this.injector });
  }
  async confirm(): Promise<void> {
    const item = this.review(), target = this.selection();
    if (!item || !target || !this.canConfirm()) return;
    this.busy.set(true); this.error.set(''); this.submittedTarget = structuredClone(target);
    try {
      const saved = await this.actions.transfer({ accountGuid: item.accountId, facilityGuid: item.facilityId, energyUseGuid: item.guid }, item, target);
      if (!this.destroy.destroyed) this.finish(saved);
    } catch (error) {
      if (!this.destroy.destroyed) {
        this.committed.set(error instanceof WorkspaceWriteError && error.persistenceCommitted);
        this.error.set(this.committed() ? 'The energy use was transferred, but the workspace could not refresh. Refresh saved changes to continue.'
          : error instanceof Error ? error.message : 'The energy use could not be transferred.');
      }
    } finally { if (!this.destroy.destroyed) this.busy.set(false); }
  }
  async recover(): Promise<void> {
    const review = this.review();
    if (!review || !this.committed() || this.busy()) return;
    this.busy.set(true); this.error.set('');
    try {
      await this.actions.recoverPublication(review.accountId);
      const saved = this.workspace.energyUseEquipment().find(item => item.guid === review.guid && item.accountId === review.accountId
        && item.facilityId === review.facilityId && item.energyUseGroupId === this.submittedTarget?.guid);
      if (!saved) throw new Error('The transferred energy use could not be found after refresh. The transfer will not be repeated.');
      if (!this.destroy.destroyed) this.finish(saved);
    } catch (error) { if (!this.destroy.destroyed) this.error.set(error instanceof Error ? error.message : 'Refresh failed. The transfer will not be repeated.'); }
    finally { if (!this.destroy.destroyed) this.busy.set(false); }
  }
  private finish(saved: IdbFacilityEnergyUseEquipment): void {
    this.committed.set(false); this.busy.set(false); this.hide(); this.transferred.emit(saved);
  }
}
