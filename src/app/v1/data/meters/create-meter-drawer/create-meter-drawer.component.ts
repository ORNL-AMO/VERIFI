import { orderFacilities } from '@app/v1/shared/facilities/facility-order';
import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { MeterDraft } from '../models';
import { MeterActionsService } from '../meter-actions.service';

@Component({
  selector: 'app-create-portfolio-meter-drawer',
  templateUrl: './create-meter-drawer.component.html',
  styleUrls: ['./create-meter-drawer.component.css'],
  standalone: false,
  providers: [MeterActionsService]
})
export class CreateMeterDrawerComponent {
  readonly singleFacility = input(false);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly actions = inject(MeterActionsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly accountGuid = this.workspace.account()?.guid;
  readonly initialFacilityGuid = input<string>();
  readonly closed = output<void>();
  readonly created = output<IdbUtilityMeter>();
  readonly saving = signal(false);
  readonly error = signal('');
  readonly facilities = computed(() => orderFacilities(this.workspace.facilities().filter(item => item.accountId === this.accountGuid), this.workspace.account()?.portfolioFacilityOrder));
  readonly facilityControl = new FormControl(
    '',
    { nonNullable: true, validators: [Validators.required] }
  );
  readonly facilityGuid = signal(this.facilityControl.value);
  readonly selectedFacility = computed(() => this.facilities().find(facility => facility.guid === this.facilityGuid()));
  readonly groups = computed(() => this.workspace.meterGroups().filter(group =>
    !!this.selectedFacility() && group.facilityId === this.facilityGuid() && group.accountId === this.accountGuid
  ));
  readonly canCreate = computed(() => !!this.selectedFacility()
    && this.workspace.account()?.guid === this.accountGuid
    && this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());

  constructor() {
    const facilitySubscription = this.facilityControl.valueChanges.subscribe(value => this.facilityGuid.set(value));
    inject(DestroyRef).onDestroy(() => facilitySubscription.unsubscribe());
    let initialized = false;
    effect(() => {
      const guid = this.initialFacilityGuid();
      if (!initialized && guid && this.facilities().some(f => f.guid === guid)) {
        initialized = true;
        this.facilityControl.setValue(guid, { emitEvent: false });
        this.facilityGuid.set(guid);
      }
    });
    effect(() => {
      if (this.saving() || !this.workspace.canWrite() || this.workspace.hasPending()) {
        this.facilityControl.disable({ emitEvent: false });
      } else {
        this.facilityControl.enable({ emitEvent: false });
      }
    });
  }

  async createMeter(draft: MeterDraft): Promise<void> {
    if (this.destroyRef.destroyed || !this.canCreate()) { return; }
    const facilityGuid = this.facilityGuid();
    const isCurrent = () => !this.destroyRef.destroyed && this.workspace.account()?.guid === this.accountGuid
      && facilityGuid === this.selectedFacility()?.guid;
    this.error.set('');
    this.saving.set(true);
    try {
      const meter = await this.actions.createMeter(draft, facilityGuid);
      if (isCurrent() && meter.accountId === this.accountGuid && meter.facilityId === facilityGuid) this.created.emit(meter);
    } catch (error) {
      if (isCurrent()) this.error.set(error instanceof Error ? error.message : 'The meter could not be added. Please try again.');
    } finally {
      if (!this.destroyRef.destroyed) this.saving.set(false);
    }
  }
}
