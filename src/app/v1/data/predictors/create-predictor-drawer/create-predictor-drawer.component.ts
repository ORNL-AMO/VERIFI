import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { PredictorDraft } from '../models';
import { PredictorWorkspaceActionsService } from '../predictor-workspace-actions.service';
import { PredictorDraftSlideoutComponent } from '../predictor-draft-slideout/predictor-draft-slideout.component';

@Component({ selector: 'app-create-portfolio-predictor-drawer', standalone: true, providers: [PredictorWorkspaceActionsService],
  imports: [ReactiveFormsModule, PredictorDraftSlideoutComponent],
  templateUrl: './create-predictor-drawer.component.html', styleUrls: ['./create-predictor-drawer.component.css'] })
export class CreatePredictorDrawerComponent {
  readonly singleFacility = input(false);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly actions = inject(PredictorWorkspaceActionsService);
  private readonly destroy = inject(DestroyRef);
  private readonly accountGuid = this.workspace.account()?.guid;
  readonly initialFacilityGuid = input<string>();
  readonly closed = output<void>();
  readonly created = output<IdbPredictor>();
  readonly weatherSelected = output<string>();
  readonly saving = signal(false);
  readonly error = signal('');
  readonly facilities = computed(() => this.workspace.facilities().filter(item => item.accountId === this.accountGuid).slice().sort((a, b) => a.name.localeCompare(b.name) || a.guid.localeCompare(b.guid)));
  readonly facilityControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly facilityGuid = signal(this.facilityControl.value);
  readonly selectedFacility = computed(() => this.facilities().find(item => item.guid === this.facilityGuid()));
  readonly canCreate = computed(() => !!this.selectedFacility() && this.workspace.account()?.guid === this.accountGuid && this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
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
    effect(() => { if (this.saving() || !this.workspace.canWrite() || this.workspace.hasPending()) this.facilityControl.disable({ emitEvent: false }); else this.facilityControl.enable({ emitEvent: false }); });
  }
  openWeather(): void { if (this.canCreate()) this.weatherSelected.emit(this.facilityGuid()); }
  async create(draft: PredictorDraft): Promise<void> {
    if (!this.canCreate()) return;
    this.saving.set(true); this.error.set('');
    try {
      const predictor = await this.actions.createPredictor(draft, this.facilityGuid());
      if (!this.destroy.destroyed && predictor.accountId === this.workspace.account()?.guid) this.created.emit(predictor);
    } catch (error) { if (!this.destroy.destroyed) this.error.set(error instanceof Error ? error.message : 'The predictor could not be added.'); }
    finally { if (!this.destroy.destroyed) this.saving.set(false); }
  }
}
