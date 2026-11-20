import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, ElementRef, Injector, afterNextRender, afterRenderEffect, TemplateRef, ViewChild, ViewContainerRef, effect, inject, input, output, untracked, viewChild } from '@angular/core';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { EnergyUseTransferResult } from '@data/account-workspace/handlers/energy-use-command.models';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { EnergyUseTransferController } from './energy-use-transfer.controller';

@Component({ selector: 'app-transfer-energy-use', standalone: false,
  templateUrl: './transfer-energy-use.component.html', styleUrls: ['./transfer-energy-use.component.css'] })
export class TransferEnergyUseComponent {
  readonly items = input<readonly IdbFacilityEnergyUseEquipment[]>([]);
  readonly canAct = input(false);
  readonly ownerKey = input('');
  readonly focusFallback = input<HTMLElement>();
  readonly completed = output<EnergyUseTransferResult>();
  readonly controller = new EnergyUseTransferController(this.items);
  readonly blocked = this.controller.blocked;
  private readonly modal = inject(ModalPortalService);
  private readonly view = inject(ViewContainerRef);
  private readonly destroy = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly stepHeading = viewChild<ElementRef<HTMLElement>>('stepHeading');
  private readonly groupName = viewChild<ElementRef<HTMLInputElement>>('groupName');
  private focusedStep?: string;
  private openedKey?: string;
  private opener?: HTMLElement;
  private portal?: TemplatePortal;
  @ViewChild('transferDrawer') private readonly transferDrawer?: TemplateRef<unknown>;
  constructor() {
    afterRenderEffect(() => {
      const step = this.controller.step(), review = this.controller.review();
      const target = step === 'new-group' ? this.groupName()?.nativeElement : this.stepHeading()?.nativeElement;
      if (review && target && step !== this.focusedStep) { this.focusedStep = step; target.focus(); }
    });
    this.destroy.onDestroy(() => this.hide());
    effect(() => {
      const active = this.modal.activePortal(), key = this.ownerKey();
      if (!this.controller.busy() && !this.controller.committed() && this.portal && (active !== this.portal || key !== this.openedKey)) untracked(() => this.close());
    });
  }
  open(): void {
    if (!this.canAct() || !this.transferDrawer || !this.controller.open()) return;
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    this.openedKey = this.ownerKey(); this.focusedStep = undefined;
    this.portal = new TemplatePortal(this.transferDrawer, this.view);
    this.modal.show(this.portal, { blockWorkspace: true });
  }
  close(): void { if (this.controller.close()) this.hide(); }
  private hide(): void {
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    this.portal = undefined;
    const opener = this.opener; this.opener = undefined;
    if (!this.destroy.destroyed && opener) afterNextRender(() => { const target = opener.isConnected && !opener.matches(':disabled') ? opener : this.focusFallback(); if (target?.isConnected) target.focus(); }, { injector: this.injector });
  }
  async confirm(): Promise<void> { this.finish(await this.controller.confirm()); }
  async recover(): Promise<void> { this.finish(await this.controller.recover()); }
  private finish(result: EnergyUseTransferResult | undefined): void {
    if (!result || this.destroy.destroyed) return;
    this.hide(); this.completed.emit(result);
  }
}
