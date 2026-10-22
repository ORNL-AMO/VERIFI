import { Component, computed, effect, inject, output, signal } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { MeterDraft } from '@app/v1/facility/data/meters/models';
import { MetersDashboardActionsService } from '@app/v1/facility/data/meters/meters-dashboard/meters-dashboard-actions.service';

@Component({
  selector: 'app-create-portfolio-meter-drawer',
  templateUrl: './create-meter-drawer.component.html',
  styleUrls: ['./create-meter-drawer.component.css'],
  standalone: false,
  providers: [MetersDashboardActionsService]
})
export class CreateMeterDrawerComponent {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly actions = inject(MetersDashboardActionsService);
  private readonly accountGuid = this.workspace.account()?.guid;
  readonly closed = output<void>();
  readonly created = output<IdbUtilityMeter>();
  readonly saving = signal(false);
  readonly error = signal('');
  readonly facilities = computed(() => this.workspace.facilities()
    .filter(facility => facility.accountId === this.accountGuid)
    .slice().sort((a, b) => a.name.localeCompare(b.name) || a.guid.localeCompare(b.guid)));
  readonly facilityControl = new FormControl(
    this.facilities().length === 1 ? this.facilities()[0].guid : '',
    { nonNullable: true, validators: [Validators.required] }
  );
  readonly facilityGuid = toSignal(this.facilityControl.valueChanges, { initialValue: this.facilityControl.value });
  readonly selectedFacility = computed(() => this.facilities().find(facility => facility.guid === this.facilityGuid()));
  readonly groups = computed(() => this.workspace.meterGroups().filter(group =>
    !!this.selectedFacility() && group.facilityId === this.facilityGuid() && group.accountId === this.accountGuid
  ));
  readonly canCreate = computed(() => !!this.selectedFacility()
    && this.workspace.account()?.guid === this.accountGuid
    && this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());

  constructor() {
    effect(() => {
      if (this.saving() || !this.workspace.canWrite() || this.workspace.hasPending()) {
        this.facilityControl.disable({ emitEvent: false });
      } else {
        this.facilityControl.enable({ emitEvent: false });
      }
    });
  }

  async createMeter(draft: MeterDraft): Promise<void> {
    if (!this.canCreate()) { return; }
    this.error.set('');
    this.saving.set(true);
    try {
      const meter = await this.actions.createMeter(draft, this.facilityGuid());
      this.created.emit(meter);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'The meter could not be added. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }
}
