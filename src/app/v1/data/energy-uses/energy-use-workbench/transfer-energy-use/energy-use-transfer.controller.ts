import { Signal, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { EnergyUseTransferRequest, EnergyUseTransferResult } from '@data/account-workspace/handlers/energy-use-command.models';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { IdbFacilityEnergyUseGroup, getNewIdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { IdbEntry, getNewIdbEntry } from '@data/models/idbModels/idbEntry';
import { draftEqual } from '@app/v1/data/editing/draft-reconciliation';
import { registerDataDraft } from '@app/v1/data/editing/register-data-draft';
import { orderFacilities } from '@app/v1/shared/facilities/facility-order';
import { energyUseIcon } from '../../models/energy-use-icons';
import { EnergyUseActionsService } from '../../energy-use-actions.service';

export type EnergyUseTransferStep = 'facility' | 'group' | 'new-group' | 'review';

/** Lives with the host component, independently of the shell portal's view. */
export class EnergyUseTransferController {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly actions = inject(EnergyUseActionsService);
  readonly review = signal<Pick<EnergyUseTransferRequest, 'accountGuid' | 'sources'> | undefined>(undefined);
  readonly destinationFacility = signal<IdbFacility | undefined>(undefined);
  readonly form = new FormGroup({
    facilityGuid: new FormControl('', { nonNullable: true }),
    group: new FormControl<IdbFacilityEnergyUseGroup | null>(null),
    groupKind: new FormControl<'existing' | 'new'>('existing', { nonNullable: true }),
    groupName: new FormControl('', { nonNullable: true }),
    asCopy: new FormControl(false, { nonNullable: true })
  });
  private readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly step = signal<EnergyUseTransferStep>('group');
  readonly facilitySearch = new FormControl('', { nonNullable: true });
  private readonly facilityQuery = toSignal(this.facilitySearch.valueChanges, { initialValue: '' });
  readonly search = new FormControl('', { nonNullable: true });
  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  readonly busy = signal(false);
  readonly committed = signal(false);
  readonly error = signal('');
  readonly result = signal<EnergyUseTransferResult | undefined>(undefined);
  private submitted?: EnergyUseTransferRequest;
  private copyIdentities: readonly IdbEntry[] = [];
  private newGroup?: IdbFacilityEnergyUseGroup;
  readonly blocked = computed(() => this.busy() || this.committed() || !!this.review());
  readonly copying = computed(() => !!this.values().asCopy);
  readonly creatingGroup = computed(() => this.values().groupKind === 'new');
  readonly facilities = computed(() => orderFacilities(this.workspace.facilities().filter(row => row.accountId === this.review()?.accountGuid), this.workspace.account()?.portfolioFacilityOrder));
  readonly facility = computed(() => this.facilities().find(row => row.guid === this.values().facilityGuid));
  readonly groups = computed(() => this.workspace.energyUseGroups().filter(group => group.accountId === this.review()?.accountGuid
    && group.facilityId === this.values().facilityGuid && group.guid !== 'unavailable')
    .slice().sort((a, b) => a.name.localeCompare(b.name) || a.guid.localeCompare(b.guid)));
  readonly matchingFacilities = computed(() => this.facilities().filter(row => row.name.toLocaleLowerCase().includes(this.facilityQuery().trim().toLocaleLowerCase())));
  readonly selectedItems = computed(() => this.review()?.sources.map(({ item, facility }) => ({ guid: item.guid, name: item.name || 'Untitled energy use', icon: energyUseIcon(item.equipmentType), category: item.equipmentType, facility: facility.name })) ?? []);
  readonly matchingGroups = computed(() => this.groups().filter(group => group.name.toLocaleLowerCase().includes(this.query().trim().toLocaleLowerCase())));
  readonly crossFacility = computed(() => this.review()?.sources.some(row => row.item.facilityId !== this.values().facilityGuid) ?? false);
  readonly calendarChanged = computed(() => {
    const target = this.destinationFacility();
    const calendar = (f: IdbFacility) => f.fiscalYear === 'calendarYear' ? ['calendarYear'] : [f.fiscalYear, f.fiscalYearMonth, f.fiscalYearCalendarEnd];
    return !!target && (this.review()?.sources.some(row => !draftEqual(calendar(row.facility), calendar(target))) ?? false);
  });
  readonly stale = computed(() => {
    const review = this.review(), target = this.values().group;
    return !!review && (this.workspace.account()?.guid !== review.accountGuid
      || review.sources.some(row => !draftEqual(row.item, this.workspace.energyUseEquipment().find(item => item.guid === row.item.guid))
        || !draftEqual(row.facility, this.workspace.facilities().find(f => f.guid === row.facility.guid)))
      || !draftEqual(this.destinationFacility(), this.facility())
      || (!this.creatingGroup() && !!target && !draftEqual(target, this.groups().find(group => group.guid === target.guid))));
  });
  readonly canEdit = computed(() => !!this.review() && this.workspace.canWrite() && !this.workspace.hasPending() && !this.busy() && !this.committed());
  readonly canReview = computed(() => this.canEdit() && !!this.facility() && !this.stale()
    && (this.creatingGroup() ? !!this.values().groupName?.trim() : !!this.values().group));
  readonly sameGroupMove = computed(() => !this.copying() && !this.creatingGroup() && this.review()?.sources.some(row =>
    row.item.facilityId === this.values().facilityGuid && row.item.energyUseGroupId === this.values().group?.guid));
  readonly canConfirm = computed(() => this.step() === 'review' && this.canReview() && !this.sameGroupMove());
  readonly destinationName = computed(() => this.creatingGroup() ? this.values().groupName?.trim() : this.values().group?.name);
  readonly confirmLabel = computed(() => `${this.copying() ? 'Copy' : 'Transfer'} ${this.review()?.sources.length === 1 ? 'energy use' : `${this.review()?.sources.length ?? 0} energy uses`}`);

  constructor(private readonly items: Signal<readonly IdbFacilityEnergyUseEquipment[]>) {
    registerDataDraft(signal(false), () => {}, this.blocked);
  }
  open(): boolean {
    const items = this.items(), accountGuid = this.workspace.account()?.guid;
    if (this.blocked() || !items.length || !accountGuid || !this.workspace.canWrite() || this.workspace.hasPending()) return false;
    const sources = items.map(item => ({ item, facility: this.workspace.facilities().find(row => row.guid === item.facilityId && row.accountId === accountGuid) }));
    if (sources.some(row => !row.facility || row.item.accountId !== accountGuid)) return false;
    this.review.set(structuredClone({ accountGuid, sources: sources as EnergyUseTransferRequest['sources'] }));
    this.destinationFacility.set(structuredClone(sources[0].facility!));
    this.form.reset({ facilityGuid: items[0].facilityId, group: null, groupKind: 'existing', groupName: '', asCopy: false });
    this.step.set('group'); this.facilitySearch.reset('');
    this.search.reset(''); this.error.set(''); this.result.set(undefined); this.submitted = undefined;
    this.copyIdentities = items.map(() => getNewIdbEntry()); this.newGroup = undefined;
    return true;
  }
  chooseFacility(guid: string): void {
    if (!this.canEdit()) return;
    const facility = this.facilities().find(row => row.guid === guid);
    if (!facility) return;
    if (guid !== this.form.controls.facilityGuid.value) {
      this.form.patchValue({ facilityGuid: guid, group: null, groupKind: 'existing', groupName: '' });
      this.newGroup = undefined;
    }
    this.destinationFacility.set(structuredClone(facility)); this.search.reset(''); this.step.set('group');
  }
  chooseGroup(group: IdbFacilityEnergyUseGroup): void {
    if (!this.canEdit() || this.stale() || !this.groups().some(row => draftEqual(row, group))) return;
    this.form.patchValue({ group: structuredClone(group), groupKind: 'existing' }); this.step.set('review');
  }
  chooseNewGroup(): void {
    if (!this.canEdit() || !this.facility() || this.stale()) return;
    this.form.patchValue({ group: null, groupKind: 'new' }); this.step.set('new-group');
  }
  reviewDestination(): void {
    this.form.controls.groupName.markAsTouched();
    if (this.canReview()) this.step.set('review');
  }
  editSelection(step: 'facility' | 'group'): void {
    if (this.canEdit()) this.step.set(step);
  }
  back(): void {
    if (!this.canEdit()) return;
    this.step.set(this.step() === 'review' ? this.creatingGroup() ? 'new-group' : 'group' : this.step() === 'new-group' ? 'group' : 'facility');
  }
  close(): boolean {
    if (this.busy() || this.committed()) return false;
    this.review.set(undefined); this.error.set(''); return true;
  }
  async confirm(): Promise<EnergyUseTransferResult | undefined> {
    if (!this.canConfirm()) return;
    const value = this.form.getRawValue(), review = this.review()!;
    if (value.groupKind === 'new') {
      this.newGroup ??= getNewIdbFacilityEnergyUseGroup(review.accountGuid, value.facilityGuid);
      this.newGroup = { ...this.newGroup, name: value.groupName.trim() };
    }
    this.submitted = structuredClone({ ...review, mode: value.asCopy ? 'copy' : 'move', destinationFacility: this.destinationFacility()!,
      destinationGroup: { kind: value.groupKind, group: value.groupKind === 'new' ? this.newGroup! : value.group! }, copyIdentities: value.asCopy ? this.copyIdentities : [] });
    this.busy.set(true); this.error.set('');
    try {
      const result = await this.actions.transferItems(this.submitted);
      this.result.set(result); this.review.set(undefined); return result;
    } catch (error) {
      this.committed.set(error instanceof WorkspaceWriteError && error.persistenceCommitted);
      this.error.set(this.committed() ? 'Changes were saved, but the workspace could not refresh. Refresh saved changes to continue.'
        : error instanceof Error ? error.message : 'The operation failed. No records were changed.');
    } finally { this.busy.set(false); }
  }
  async recover(): Promise<EnergyUseTransferResult | undefined> {
    const request = this.submitted;
    if (!request || !this.committed() || this.busy()) return;
    this.busy.set(true); this.error.set('');
    try {
      await this.actions.recoverPublication(request.accountGuid);
      const group = this.workspace.energyUseGroups().find(row => row.guid === request.destinationGroup.group.guid && row.accountId === request.accountGuid && row.facilityId === request.destinationFacility.guid);
      const ids = request.mode === 'copy' ? request.copyIdentities.map(row => row.guid) : request.sources.map(row => row.item.guid);
      const items = ids.map(guid => this.workspace.energyUseEquipment().find(row => row.guid === guid && row.accountId === request.accountGuid
        && row.facilityId === request.destinationFacility.guid && row.energyUseGroupId === group?.guid));
      if (!group || items.some(row => !row)) throw new Error('Saved destination items could not be found. The operation will not be repeated.');
      const result: EnergyUseTransferResult = { mode: request.mode, group, items: items as IdbFacilityEnergyUseEquipment[] };
      this.result.set(result); this.committed.set(false); this.review.set(undefined); return result;
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Refresh failed. The operation will not be repeated.'); }
    finally { this.busy.set(false); }
  }
}
