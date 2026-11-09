import { AddYearController } from '../add-year-drawer/add-year.controller';
import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, ElementRef, Injector, TemplateRef, ViewChild, ViewContainerRef, afterNextRender, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormControl, FormRecord } from '@angular/forms';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { EnergyUseWorkbenchContextService } from '../../energy-use-workbench-context.service';
import { EnergyUseSelectionController } from '../energy-use-selection.controller';

/** Owns group member selection and the portal views for reviewed equipment commands. */
@Component({ selector: 'app-energy-use-equipment-table', standalone: false, templateUrl: './equipment-table.component.html', styleUrls: ['./equipment-table.component.css'] })
export class EquipmentTableComponent {
  readonly canOpen = input.required<boolean>();
  readonly canCreate = input(false);
  readonly createRequested = output<void>();
  readonly context = inject(EnergyUseWorkbenchContextService);
  readonly checks = new FormRecord<FormControl<boolean>>({});
  readonly selectAllControl = new FormControl(false, { nonNullable: true });
  readonly rows = computed(() => this.context.items().map(item => ({ ...item, route: this.context.itemRoute(item.guid) })));
  readonly selection = new EnergyUseSelectionController({
    identity: computed(() => ({
      accountGuid: this.context.workspace.account()?.guid,
      facilityGuid: this.context.facilityGuid(),
      energyUseGroupGuid: this.context.energyUseGroupGuid()
    })),
    members: computed(() => this.context.items().map(entry => entry.item))
  });
  readonly yearEditor = new AddYearController(this.context, this.canOpen);
  readonly opened = signal(false);
  readonly someSelected = computed(() => !!this.selection.selected().length && this.selection.selected().length < this.context.items().length);
  readonly canAct = computed(() => this.canOpen() && this.selection.canAct());
  private readonly injector = inject(Injector);
  private readonly destroy = inject(DestroyRef);
  @ViewChild('itemTable', { read: ElementRef }) private readonly itemTable?: ElementRef<HTMLElement>;
  private readonly modal = inject(ModalPortalService);
  private readonly view = inject(ViewContainerRef);
  private portal?: TemplatePortal;
  private opener?: HTMLElement;
  private openedKey?: string;
  @ViewChild('yearDrawer') private readonly yearDrawer?: TemplateRef<unknown>;
  @ViewChild('confirmation') private readonly confirmation?: TemplateRef<unknown>;
  constructor() {
    inject(DestroyRef).onDestroy(() => this.hide(false));
    effect(() => { const active = this.modal.activePortal();
      if (this.opened() && this.portal && active !== this.portal) untracked(() => this.hide(false)); });
    effect(() => { const key = this.context.key(); if (this.opened() && key !== this.openedKey) untracked(() => this.hide(false)); });
    effect(() => {
      const items = this.context.items(), selected = this.selection.selected(), canAct = this.canOpen() && this.selection.canAct(), ids = new Set(items.map(item => item.guid));
      untracked(() => {
        this.selectAllControl.setValue(!!items.length && selected.length === items.length, { emitEvent: false });
        if (canAct && items.length) this.selectAllControl.enable({ emitEvent: false }); else this.selectAllControl.disable({ emitEvent: false });
        for (const guid of Object.keys(this.checks.controls)) if (!ids.has(guid)) this.checks.removeControl(guid, { emitEvent: false });
        for (const item of items) {
          if (!this.checks.controls[item.guid]) this.checks.addControl(item.guid, new FormControl(false, { nonNullable: true }), { emitEvent: false });
          const control = this.checks.controls[item.guid];
          control.setValue(selected.includes(item.guid), { emitEvent: false });
          if (canAct) control.enable({ emitEvent: false }); else control.disable({ emitEvent: false });
        }
      });
    });
    const all = this.selectAllControl.valueChanges.subscribe(selected => {
      if (this.canAct()) selected ? this.selection.selectAll() : this.selection.clear();
    });
    this.destroy.onDestroy(() => all.unsubscribe());
    const checks = this.checks.valueChanges.subscribe(values => {
      for (const [guid, selected] of Object.entries(values)) if (!!selected !== this.selection.selected().includes(guid)) this.selection.select({ guid, selected: !!selected });
    });
    inject(DestroyRef).onDestroy(() => checks.unsubscribe());
  }
  startOperation(kind: 'add' | 'delete'): void {
    if (!this.canAct() || !this.selection.selected().length || !this.confirmation) return;
    if (kind === 'add' && (!this.yearDrawer || !this.yearEditor.open(this.selection.selected()))) return;
    this.selection.cancel();
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    this.openedKey = this.context.key(); this.opened.set(true);
    this.portal = new TemplatePortal(kind === 'add' ? this.yearDrawer! : this.confirmation, this.view); this.modal.show(this.portal, { blockWorkspace: true });
    if (kind === 'delete') this.prepare();
  }
  close(): void {
    if (this.selection.busy() || this.selection.committed()) return;
    this.selection.cancel(); this.hide();
  }
  private hide(restoreFocus = true): void {
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    this.portal = undefined; this.opened.set(false);
    if (!this.yearEditor.blocked()) this.yearEditor.discard();
    if (restoreFocus) afterNextRender(() => {
      if (!this.destroy.destroyed && !this.modal.activePortal()) {
        const target = this.opener?.isConnected && !this.opener.matches(':disabled') ? this.opener : this.itemTable?.nativeElement;
        target?.focus();
      }
    }, { injector: this.injector });
  }
  prepare(): void {
    if (!this.canOpen() || !this.confirmation) return;
    this.selection.prepareDelete();
  }

  async confirm(): Promise<void> {
    if (!this.canOpen()) return;
    if (await this.selection.confirm()) this.finish();
  }
  async recover(): Promise<void> { if (await this.selection.recover()) this.finish(); }
  yearSaved(): void { this.selection.clear(); this.hide(); }
  yearClosed(): void { this.hide(); }
  private finish(): void { this.hide(); }
}
