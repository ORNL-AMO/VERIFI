import { Component, DestroyRef, ElementRef, afterRenderEffect, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { orderFacilities } from '@app/v1/shared/facilities/facility-order';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { applyMeterSourceDefaults } from '@app/v1/shared/meter-settings/meter-source-defaults';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MeterSource } from '@data/models/constantsAndTypes';
import { getNewIdbUtilityMeter, IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getStartingUnitOptions } from '@shared/sharedHelperFunctions';
import { METER_SOURCES, meterSourceIcon } from '../models';
import { MeterActionsService } from '../meter-actions.service';

type MeterCreationStep = 'facility' | 'source' | 'unit' | 'name';
interface MeterSelection {
  readonly step: MeterCreationStep;
  readonly label: string;
  readonly icon: IconName;
  readonly editable: boolean;
}

@Component({
  selector: 'app-create-portfolio-meter-drawer',
  templateUrl: './create-meter-drawer.component.html',
  styleUrls: ['./create-meter-drawer.component.css'],
  standalone: false,
  providers: [MeterActionsService]
})
export class CreateMeterDrawerComponent {
  readonly singleFacility = input(false);
  readonly initialFacilityGuid = input<string>();
  readonly closed = output<void>();
  readonly created = output<IdbUtilityMeter>();
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly actions = inject(MeterActionsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly accountGuid = this.workspace.account()?.guid;
  private readonly stepHeading = viewChild<ElementRef<HTMLElement>>('stepHeading');
  private readonly meterName = viewChild<ElementRef<HTMLInputElement>>('meterName');

  readonly saving = signal(false);
  readonly error = signal('');
  readonly step = signal<MeterCreationStep>('facility');
  readonly facilityLocked = computed(() => this.singleFacility() || !!this.initialFacilityGuid());
  readonly facilities = computed(() => orderFacilities(this.workspace.facilities().filter(item => item.accountId === this.accountGuid), this.workspace.account()?.portfolioFacilityOrder));
  readonly facilityControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly facilityGuid = signal(this.facilityControl.value);
  readonly selectedFacility = computed(() => this.facilities().find(facility => facility.guid === this.facilityGuid()));
  readonly facilitySearch = new FormControl('', { nonNullable: true });
  private readonly search = toSignal(this.facilitySearch.valueChanges, { initialValue: '' });
  readonly matchingFacilities = computed(() => {
    const search = this.search().trim().toLocaleLowerCase();
    return this.facilities().filter(facility => (facility.name || '').toLocaleLowerCase().includes(search));
  });
  readonly form = new FormGroup({
    source: new FormControl<MeterSource | null>(null, Validators.required),
    startingUnit: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] })
  });
  private readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  private readonly formStatus = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  private readonly selectedSource = toSignal(this.form.controls.source.valueChanges, { initialValue: this.form.controls.source.value });
  readonly sources = METER_SOURCES.map(value => ({ value, icon: meterSourceIcon(value) }));
  readonly sourceDefaults = computed(() => {
    const facility = this.selectedFacility(), source = this.selectedSource();
    return facility && source ? applyMeterSourceDefaults({
      ...getNewIdbUtilityMeter(facility.guid, this.accountGuid, true, facility.energyUnit), source
    }, facility, this.workspace.customFuels()) : undefined;
  });
  readonly units = computed(() => {
    const meter = this.sourceDefaults();
    return meter ? getStartingUnitOptions(meter.source, meter.phase, meter.fuel, meter.scope) : [];
  });
  readonly selectedUnit = computed(() => this.units().find(unit => unit.value === this.values().startingUnit));
  readonly canAct = computed(() => this.workspace.account()?.guid === this.accountGuid
    && this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly canCreate = computed(() => this.canAct() && this.step() === 'name' && !!this.selectedFacility()
    && this.formStatus() === 'VALID' && !!this.selectedUnit());
  readonly selections = computed(() => {
    const selections: MeterSelection[] = [];
    const facility = this.selectedFacility(), source = this.values().source, unit = this.selectedUnit();
    if (facility) selections.push({ step: 'facility', label: facility.name || 'Unnamed facility', icon: 'facility', editable: !this.facilityLocked() });
    if (source) selections.push({ step: 'source', label: source, icon: meterSourceIcon(source), editable: true });
    if (unit) selections.push({ step: 'unit', label: unit.value, icon: 'meter', editable: true });
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
        this.step.set('source');
      }
    });
    effect(() => {
      if (!this.canAct()) {
        this.facilityControl.disable({ emitEvent: false });
        this.facilitySearch.disable({ emitEvent: false });
        this.form.disable({ emitEvent: false });
      } else {
        this.facilityControl.enable({ emitEvent: false });
        this.facilitySearch.enable({ emitEvent: false });
        this.form.enable({ emitEvent: false });
      }
    });
    this.facilityControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(guid => {
      this.facilityGuid.set(guid);
      this.form.controls.startingUnit.setValue('');
      this.error.set('');
    });
    let focusedStep: MeterCreationStep | undefined;
    afterRenderEffect(() => {
      const step = this.step();
      const target = step === 'name' ? this.meterName()?.nativeElement : this.stepHeading()?.nativeElement;
      if (target && step !== focusedStep) {
        focusedStep = step;
        target.focus();
      }
    });
  }

  selectFacility(guid: string): void {
    if (!this.canAct() || this.facilityLocked() || !this.facilities().some(facility => facility.guid === guid)) return;
    if (guid !== this.facilityGuid()) this.facilityControl.setValue(guid);
    this.error.set('');
    this.step.set('source');
  }

  selectSource(source: MeterSource): void {
    if (!this.canAct() || !this.selectedFacility() || !METER_SOURCES.includes(source)) return;
    if (source !== this.form.controls.source.value) this.form.patchValue({ source, startingUnit: '' });
    this.error.set('');
    this.step.set('unit');
  }

  selectUnit(unit: string): void {
    if (!this.canAct() || !this.units().some(option => option.value === unit)) return;
    this.form.controls.startingUnit.setValue(unit);
    this.error.set('');
    this.step.set('name');
  }

  editSelection(step: MeterCreationStep): void {
    if (this.canAct() && this.selections().some(selection => selection.step === step && selection.editable)) this.step.set(step);
  }

  async createMeter(): Promise<void> {
    this.form.controls.name.markAsTouched();
    if (this.destroyRef.destroyed || !this.canCreate()) return;
    const facilityGuid = this.facilityGuid();
    const { name, source, startingUnit } = this.form.getRawValue();
    if (!source) return;
    const isCurrent = () => !this.destroyRef.destroyed && this.workspace.account()?.guid === this.accountGuid
      && facilityGuid === this.selectedFacility()?.guid;
    this.error.set('');
    this.saving.set(true);
    try {
      const meter = await this.actions.createMeter({ name, source, startingUnit }, facilityGuid);
      if (isCurrent() && meter.accountId === this.accountGuid && meter.facilityId === facilityGuid) this.created.emit(meter);
    } catch (error) {
      if (isCurrent()) this.error.set(error instanceof Error ? error.message : 'The meter could not be added. Please try again.');
    } finally {
      if (!this.destroyRef.destroyed) this.saving.set(false);
    }
  }
}
