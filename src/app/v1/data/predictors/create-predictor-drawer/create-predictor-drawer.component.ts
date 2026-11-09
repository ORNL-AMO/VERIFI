import { Component, DestroyRef, ElementRef, afterRenderEffect, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { orderFacilities } from '@app/v1/shared/facilities/facility-order';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbPredictor, WeatherDataType } from '@data/models/idbModels/predictor';
import { WeatherPredictorSetupRequest } from '../models/predictor-creation.models';
import { WEATHER_DATA_TYPE_OPTIONS } from '../models/predictor-settings.models';
import { PredictorWorkspaceActionsService } from '../predictor-workspace-actions.service';

type PredictorCreationStep = 'facility' | 'type' | 'standard' | 'weather';
type PredictorCreationType = 'Standard' | 'Weather';
interface PredictorSelection {
  readonly step: PredictorCreationStep;
  readonly label: string;
  readonly icon: IconName;
  readonly editable: boolean;
}

@Component({ selector: 'app-create-portfolio-predictor-drawer', standalone: true, providers: [PredictorWorkspaceActionsService],
  imports: [ReactiveFormsModule, IconComponent, WorkspaceSlideoutComponent],
  templateUrl: './create-predictor-drawer.component.html',
  styleUrls: ['./create-predictor-drawer.component.css', '../../../shared/creation-flow/creation-flow.css'] })
export class CreatePredictorDrawerComponent {
  readonly singleFacility = input(false);
  readonly initialFacilityGuid = input<string>();
  readonly closed = output<void>();
  readonly created = output<IdbPredictor>();
  readonly weatherSelected = output<WeatherPredictorSetupRequest>();
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly actions = inject(PredictorWorkspaceActionsService);
  private readonly destroy = inject(DestroyRef);
  private readonly accountGuid = this.workspace.account()?.guid;
  private readonly stepHeading = viewChild<ElementRef<HTMLElement>>('stepHeading');
  private readonly predictorName = viewChild<ElementRef<HTMLInputElement>>('predictorName');
  readonly saving = signal(false);
  readonly error = signal('');
  readonly step = signal<PredictorCreationStep>('facility');
  readonly predictorType = signal<PredictorCreationType | undefined>(undefined);
  readonly facilityLocked = computed(() => this.singleFacility() || !!this.initialFacilityGuid());
  readonly facilities = computed(() => orderFacilities(this.workspace.facilities().filter(item => item.accountId === this.accountGuid), this.workspace.account()?.portfolioFacilityOrder));
  readonly facilityControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly facilityGuid = signal(this.facilityControl.value);
  readonly selectedFacility = computed(() => this.facilities().find(item => item.guid === this.facilityGuid()));
  readonly facilitySearch = new FormControl('', { nonNullable: true });
  private readonly search = toSignal(this.facilitySearch.valueChanges, { initialValue: '' });
  readonly matchingFacilities = computed(() => {
    const search = this.search().trim().toLocaleLowerCase();
    return this.facilities().filter(facility => (facility.name || '').toLocaleLowerCase().includes(search));
  });
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)] }),
    production: new FormControl(false, { nonNullable: true })
  });
  private readonly formStatus = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  get weatherTypes(): typeof WEATHER_DATA_TYPE_OPTIONS { return WEATHER_DATA_TYPE_OPTIONS; }
  readonly weatherForm = new FormGroup(Object.fromEntries(WEATHER_DATA_TYPE_OPTIONS.map(option => [
    option.value, new FormControl(option.value === 'HDD', { nonNullable: true })
  ])) as Record<WeatherDataType, FormControl<boolean>>);
  private readonly weatherValues = toSignal(this.weatherForm.valueChanges, { initialValue: this.weatherForm.getRawValue() });
  readonly includedWeatherTypes = computed(() => this.weatherTypes.filter(option => this.weatherValues()[option.value]).map(option => option.value));
  readonly canAct = computed(() => this.workspace.account()?.guid === this.accountGuid && this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly canCreate = computed(() => this.canAct() && !!this.selectedFacility() && (
    this.step() === 'standard' && this.predictorType() === 'Standard' && this.formStatus() === 'VALID'
    || this.step() === 'weather' && this.predictorType() === 'Weather' && this.includedWeatherTypes().length > 0
  ));
  readonly selections = computed(() => {
    const selections: PredictorSelection[] = [];
    const facility = this.selectedFacility(), type = this.predictorType();
    if (this.facilityGuid()) selections.push({ step: 'facility', label: facility ? facility.name || 'Unnamed facility' : 'Facility unavailable', icon: 'facility', editable: !this.facilityLocked() });
    if (type) selections.push({ step: 'type', label: type === 'Standard' ? 'Standard predictor' : 'Weather predictors', icon: type === 'Standard' ? 'predictor' : 'cloudRain', editable: true });
    return selections;
  });

  constructor() {
    let initialized = false;
    effect(() => {
      const guid = this.initialFacilityGuid();
      if (!initialized && guid && this.facilities().some(facility => facility.guid === guid)) {
        initialized = true;
        this.facilityControl.setValue(guid, { emitEvent: false });
        this.facilityGuid.set(guid);
        this.step.set('type');
      }
    });
    effect(() => {
      for (const control of [this.facilityControl, this.facilitySearch, this.form, this.weatherForm]) {
        if (this.canAct()) control.enable({ emitEvent: false });
        else control.disable({ emitEvent: false });
      }
    });
    this.facilityControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(guid => { this.facilityGuid.set(guid); this.error.set(''); });
    let focusedStep: PredictorCreationStep | undefined;
    afterRenderEffect(() => {
      const step = this.step();
      const target = step === 'standard' ? this.predictorName()?.nativeElement : this.stepHeading()?.nativeElement;
      if (target && step !== focusedStep) { focusedStep = step; target.focus(); }
    });
  }

  selectFacility(guid: string): void {
    if (!this.canAct() || this.facilityLocked() || !this.facilities().some(facility => facility.guid === guid)) return;
    if (guid !== this.facilityGuid()) this.facilityControl.setValue(guid);
    this.error.set(''); this.step.set('type');
  }
  selectType(type: PredictorCreationType): void {
    if (!this.canAct() || !this.selectedFacility()) return;
    this.predictorType.set(type); this.error.set(''); this.step.set(type === 'Standard' ? 'standard' : 'weather');
  }
  editSelection(step: PredictorCreationStep): void {
    if (this.canAct() && this.selections().some(selection => selection.step === step && selection.editable)) this.step.set(step);
  }
  async submit(): Promise<void> {
    if (this.destroy.destroyed || !this.canCreate()) { this.form.markAllAsTouched(); return; }
    if (this.predictorType() === 'Weather') {
      this.weatherSelected.emit({ facilityGuid: this.facilityGuid(), weatherDataTypes: this.includedWeatherTypes() });
      return;
    }
    const facilityGuid = this.facilityGuid();
    const isCurrent = () => !this.destroy.destroyed && this.workspace.account()?.guid === this.accountGuid && facilityGuid === this.selectedFacility()?.guid;
    this.saving.set(true); this.error.set('');
    try {
      const predictor = await this.actions.createPredictor({ ...this.form.getRawValue(), predictorType: 'Standard' }, facilityGuid);
      if (isCurrent() && predictor.accountId === this.accountGuid && predictor.facilityId === facilityGuid) this.created.emit(predictor);
    } catch (error) { if (isCurrent()) this.error.set(error instanceof Error ? error.message : 'The predictor could not be added.'); }
    finally { if (!this.destroy.destroyed) this.saving.set(false); }
  }
}
