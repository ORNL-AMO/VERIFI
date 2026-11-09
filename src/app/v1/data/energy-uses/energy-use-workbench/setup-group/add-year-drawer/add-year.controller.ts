import { DestroyRef, Injector, Signal, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { EnergyUseBatchChange } from '@data/account-workspace/handlers/energy-use-command.models';
import { draftEqual } from '@app/v1/data/editing/draft-reconciliation';
import { registerDataDraft } from '@app/v1/data/editing/register-data-draft';
import { EnergyUseWorkbenchContextService } from '../../energy-use-workbench-context.service';
import { EnergyUseActionsService } from '../../../energy-use-actions.service';
import { EnergyUseSetupForm, EnergyUseSetupFormService } from '../../../forms/energy-use-setup-form.service';
import { energyUseIcon } from '../../../models/energy-use-icons';
import { savedEnergyUseYears } from '../../../models/energy-use-projection.models';
import { energyUseSetup } from '../../../models/energy-use-setup.models';
import { energyUseYearChange, nextEnergyUseYear, seedEnergyUseYear } from '../../../models/energy-use-year-draft.models';

export interface EquipmentYearDraft {
  readonly item: IdbFacilityEnergyUseEquipment;
  readonly facility: IdbFacility;
  readonly form?: EnergyUseSetupForm;
  readonly existing: boolean;
  readonly sourceYear?: number;
  readonly icon: ReturnType<typeof energyUseIcon>;
  readonly completed: boolean;
  readonly error: string;
}

/** Lives with the table, not inside its portal; view changes never own the drafts. */
export class AddYearController {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly forms = inject(EnergyUseSetupFormService);
  private readonly injector = inject(Injector);
  private readonly destroy = inject(DestroyRef);
  private readonly subscriptions = new Map<EnergyUseSetupForm, Subscription>();
  private originals: IdbFacilityEnergyUseEquipment[] = [];
  private facility?: IdbFacility;
  private openedKey = '';
  private accountGuid = '';
  readonly opened = signal(false);
  readonly dirty = signal(false);
  readonly busy = signal(false);
  readonly committed = signal(false);
  readonly error = signal('');
  readonly reloadNeeded = signal(false);
  readonly confirmation = signal<'discard' | 'year' | 'reload' | null>(null);
  readonly year = new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(9999), control => Number.isInteger(control.value) ? null : { integer: true }]);
  readonly yearForm = new FormGroup({ year: this.year });
  readonly otherYear = signal(false);
  readonly yearChoices = computed(() => {
    const accountGuid = this.workspace.account()?.guid;
    const years = [...savedEnergyUseYears(this.workspace.energyUseEquipment().filter(item => item.accountId === accountGuid)),
      ...this.workspace.meterData().filter(row => row.accountId === accountGuid).map(row => row.year),
      ...this.workspace.predictorData().filter(row => row.accountId === accountGuid).map(row => row.year)];
    const choices = [...new Set(years.filter(year => Number.isInteger(year) && year >= 1 && year <= 9999))].sort((a, b) => a - b);
    return choices.length ? choices : [new Date().getFullYear()];
  });
  readonly selectedYear = signal<number | undefined>(undefined);
  readonly index = signal(-1);
  readonly drafts = signal<readonly EquipmentYearDraft[]>([]);
  readonly version = signal(0);
  readonly current = computed(() => this.drafts()[this.index()]);
  readonly validationMessage = computed(() => {
    this.version(); const draft = this.current(), form = draft?.form;
    return draft?.error || (form && (form.dirty || form.touched) ? form.errors?.['yearData'] as string || '' : '');
  });
  readonly completed = computed(() => this.drafts().map((draft, index) => ({ ...draft, index })).filter(draft => draft.completed));
  readonly remaining = computed(() => this.drafts().map((draft, index) => ({ ...draft, index })).filter(draft => !draft.completed && draft.index !== this.index()));
  readonly missing = computed(() => {
    this.version();
    return this.opened() && (this.context.key() !== this.openedKey || this.originals.some(item =>
      !this.context.items().some(entry => entry.guid === item.guid && entry.item.accountId === this.accountGuid && entry.item.facilityId === this.facility?.guid)));
  });
  readonly changed = computed(() => {
    this.version();
    return this.originals.filter(item => !draftEqual(item, this.workspace.energyUseEquipment().find(saved => saved.guid === item.guid)));
  });
  readonly stale = computed(() => this.opened() && !this.committed() && (this.missing() || !!this.changed().length
    || !draftEqual(this.facility, this.workspace.facilities().find(owner => owner.guid === this.facility?.guid))));
  readonly canEdit = computed(() => this.opened() && this.canOpen() && this.workspace.canWrite() && !this.workspace.hasPending() && !this.busy() && !this.committed() && !this.missing());
  readonly blocked = computed(() => this.busy() || this.committed());
  readonly allOthersReviewed = computed(() => this.index() >= 0 && this.remaining().length === 0);
  readonly canSave = computed(() => { this.version(); return this.canEdit() && !this.stale() && !this.reloadNeeded() && this.allOthersReviewed()
    && this.drafts().every((draft, index) => !!draft.form && !draft.error && (draft.completed || index === this.index())) && !!this.current()?.form?.valid; });

  constructor(readonly context: EnergyUseWorkbenchContextService, readonly canOpen: Signal<boolean>) {
    registerDataDraft(this.dirty, () => this.discard(), this.blocked);
    this.destroy.onDestroy(() => this.disposeDrafts());
  }
  open(guids: readonly string[]): boolean {
    const selected = this.context.items().filter(entry => guids.includes(entry.guid));
    if (!this.canOpen() || !this.workspace.canWrite() || this.workspace.hasPending() || !selected.length || selected.length !== new Set(guids).size
      || selected.some(entry => entry.item.accountId !== this.workspace.account()?.guid || entry.item.facilityId !== this.context.facilityGuid())) return false;
    this.originals = selected.map(entry => structuredClone(entry.item));
    this.facility = structuredClone(selected[0].facility); this.accountGuid = this.workspace.account()!.guid; this.openedKey = this.context.key();
    this.otherYear.set(false); this.year.reset(nextEnergyUseYear(this.originals, this.facility)); this.selectedYear.set(undefined); this.index.set(-1);
    this.drafts.set([]); this.error.set(''); this.committed.set(false); this.reloadNeeded.set(false); this.dirty.set(false); this.opened.set(true); this.version.update(value => value + 1);
    return true;
  }
  chooseYear(year: number): void {
    if (!this.canEdit() || !this.yearChoices().includes(year)) return;
    this.otherYear.set(false); this.year.setValue(year); this.start();
  }
  chooseOtherYear(): void { if (this.canEdit()) this.otherYear.set(true); }
  cancelYearChange(): void {
    const year = this.selectedYear();
    if (year !== undefined) { this.year.setValue(year); this.otherYear.set(!this.yearChoices().includes(year)); }
    this.confirmation.set(null);
  }
  start(): void {
    this.year.markAsTouched();
    if (!this.canEdit() || this.year.invalid) return;
    if (this.selectedYear() !== undefined && this.year.value !== this.selectedYear()) { this.confirmation.set('year'); return; }
    if (this.selectedYear() === undefined) this.initialize(); else this.index.set(0);
  }
  private initialize(): void {
    this.disposeDrafts();
    this.selectedYear.set(this.year.value!);
    this.drafts.set(this.originals.map(item => this.build(item, this.facility!)));
    this.index.set(0);
    this.dirty.set(true);
    this.confirmation.set(null);
  }
  private build(item: IdbFacilityEnergyUseEquipment, facility: IdbFacility): EquipmentYearDraft {
    const base = { item, facility, icon: energyUseIcon(item.equipmentType), completed: false, error: '', existing: false };
    try {
      const seeded = seedEnergyUseYear(item, facility, this.selectedYear()!);
      const form = this.forms.build(seeded.value);
      this.forms.validate(form, energyUseSetup(item), () => {
        try { energyUseYearChange(item, facility, this.forms.read(form), this.selectedYear()!); return null; }
        catch (error) { return { yearData: error instanceof Error ? error.message : 'Check annual data.' }; }
      });
      this.subscriptions.set(form, form.valueChanges.subscribe(() => {
        this.version.update(value => value + 1);
        this.dirty.set(true);
        this.drafts.update(drafts => drafts.map(draft => draft.form === form ? { ...draft, completed: false, error: '' } : draft));
      }));
      return { ...base, ...seeded, form };
    } catch (error) { return { ...base, error: error instanceof Error ? error.message : 'This item cannot be edited safely.' }; }
  }
  go(index: number): void { if (this.canEdit() && index >= -1 && index < this.drafts().length) this.index.set(index); }
  private validate(index: number): EnergyUseBatchChange | undefined {
    const draft = this.drafts()[index]; if (!draft?.form) return undefined;
    draft.form.markAllAsTouched();
    try { return energyUseYearChange(draft.item, draft.facility, this.forms.read(draft.form), this.selectedYear()!); }
    catch (error) { this.drafts.update(drafts => drafts.map((row, i) => i === index ? { ...row, completed: false, error: error instanceof Error ? error.message : 'Check annual data.' } : row)); return undefined; }
  }
  next(): void {
    if (!this.canEdit() || !this.validate(this.index())) return;
    this.drafts.update(drafts => drafts.map((row, i) => i === this.index() ? { ...row, completed: true, error: '' } : row));
    const drafts = this.drafts(), current = this.index();
    const following = drafts.findIndex((draft, index) => index > current && !draft.completed);
    const next = following >= 0 ? following : drafts.findIndex(draft => !draft.completed);
    if (next >= 0) this.index.set(next);
  }
  requestClose(): boolean {
    if (this.blocked()) return false;
    if (this.dirty()) { this.confirmation.set('discard'); return false; }
    this.discard(); return true;
  }
  discard(): void {
    if (this.blocked()) return;
    this.disposeDrafts();
    this.dirty.set(false);
    this.opened.set(false);
    this.confirmation.set(null);
    this.drafts.set([]);
  }
  confirmReset(): void { if (this.canEdit() && this.confirmation() === 'year') this.initialize(); }
  async reloadChanged(): Promise<void> {
    if (!this.canEdit() || this.missing()) return;
    this.confirmation.set(null);
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.injector.get(AccountWorkspaceService).reloadActiveWorkspace(false);
      if (this.destroy.destroyed || result === 'superseded' || this.context.key() !== this.openedKey) return;
      if (this.missing()) { this.error.set('Equipment was removed or moved. Close this panel and select equipment again.'); return; }
      const facility = this.workspace.facilities().find(owner => owner.guid === this.facility?.guid)!;
      const facilityChanged = !draftEqual(facility, this.facility);
      if (this.selectedYear() === undefined) {
        this.originals = this.originals.map(item => structuredClone(this.workspace.energyUseEquipment().find(saved => saved.guid === item.guid)!));
        this.facility = structuredClone(facility);
        this.version.update(value => value + 1);
        this.reloadNeeded.set(false);
        return;
      }
      const updated = this.drafts().map(draft => {
        const saved = this.workspace.energyUseEquipment().find(item => item.guid === draft.item.guid)!;
        if (!facilityChanged && draftEqual(saved, draft.item)) return draft;
        this.disposeDraft(draft);
        return this.build(structuredClone(saved), structuredClone(facility));
      });
      this.originals = updated.map(draft => draft.item);
      this.facility = structuredClone(facility);
      this.drafts.set(updated);
      this.version.update(value => value + 1);
      this.reloadNeeded.set(false);
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Saved data could not be reloaded. Your drafts remain.'); }
    finally { if (!this.destroy.destroyed) this.busy.set(false); }
  }
  async save(): Promise<boolean> {
    if (!this.canSave()) return false;
    const rows = this.drafts().map((_, index) => this.validate(index)); if (rows.some(row => !row)) return false;
    this.busy.set(true); this.error.set('');
    try {
      await this.injector.get(EnergyUseActionsService).applyBatch(this.accountGuid, rows as EnergyUseBatchChange[]);
      this.dirty.set(false); this.opened.set(false); return true;
    } catch (error) {
      this.committed.set(error instanceof WorkspaceWriteError && error.persistenceCommitted);
      this.reloadNeeded.set(error instanceof WorkspaceWriteError && ['validation-failed', 'stale-workspace'].includes(error.code));
      this.error.set(this.committed() ? 'Year data was saved, but the workspace could not refresh. Refresh saved changes before continuing.' : error instanceof Error ? error.message : 'Saving failed. No equipment was changed.'); return false;
    } finally { if (!this.destroy.destroyed) this.busy.set(false); }
  }
  async recover(): Promise<boolean> {
    if (!this.committed() || this.busy()) return false;
    this.busy.set(true);
    try {
      await this.injector.get(EnergyUseActionsService).recoverPublication(this.accountGuid);
      this.committed.set(false); this.dirty.set(false); this.opened.set(false); return true;
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Refresh failed. The saved batch will not be repeated.'); return false; }
    finally { if (!this.destroy.destroyed) this.busy.set(false); }
  }
  private disposeDraft(draft: EquipmentYearDraft): void {
    if (!draft.form) return;
    this.subscriptions.get(draft.form)?.unsubscribe();
    this.subscriptions.delete(draft.form);
  }
  private disposeDrafts(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    this.subscriptions.clear();
  }
}
