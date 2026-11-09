import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { MeterPhase } from '@data/models/constantsAndTypes';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { PowerUnitOptions } from '@shared/unitOptions';
import { calculateLoadFactor, calculateLoadFactorPowers, calculateOperatingHours, LoadFactorInputs } from '@shared/energy-use-calculators/operating-calculators';
import { RatedPowerCalculator } from '@shared/energy-use-calculators/rated-power-calculator';
import { AnnualConditionsForm } from '../energy-use-setup-form.service';
import { EnergyUseSourceForm } from '../energy-use-settings-form.service';

@Component({
  selector: 'button[appSetupCalculator]',
  standalone: false,
  templateUrl: './setup-calculator.component.html',
  styleUrls: ['./setup-calculator.component.css'],
  host: {
    type: 'button',
    class: 'input-group-text',
    'aria-haspopup': 'dialog',
    '[disabled]': '!canEdit()',
    '[attr.aria-label]': 'title()',
    '[attr.title]': 'title()',
    '[attr.aria-expanded]': 'opened()',
    '(click)': 'open()'
  }
})
export class SetupCalculatorComponent {
  readonly embedded = input(false);
  readonly viewRequested = output<TemplateRef<unknown> | null>();
  readonly kind = input.required<'hours' | 'load' | 'power'>();
  readonly conditions = input<AnnualConditionsForm>();
  readonly source = input<EnergyUseSourceForm>();
  readonly electricity = input(false);
  readonly linkedMeters = input<readonly IdbUtilityMeter[]>([]);
  readonly editorKey = input.required<string>();
  readonly canEdit = input(false);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly modal = inject(ModalPortalService);
  private readonly view = inject(ViewContainerRef);
  @ViewChild('calculator') private readonly calculator?: TemplateRef<unknown>;
  private portal?: TemplatePortal;
  private openedKey = '';
  private target?: AnnualConditionsForm | EnergyUseSourceForm;
  readonly opened = signal(false);
  readonly title = computed(() => this.kind() === 'hours' ? 'Calculate operating hours' : this.kind() === 'load' ? 'Calculate load factor' : 'Calculate rated power');
  readonly units = PowerUnitOptions.map(unit => ({
    ...unit, shortLabel: /\(([^)]+)\)$/.exec(unit.display)?.[1] ?? unit.value
  }));
  readonly form = new FormGroup({
    hours: new FormControl<number | null>(24), days: new FormControl<number | null>(7), weeks: new FormControl<number | null>(52),
    method: new FormControl<LoadFactorInputs['method']>('measuredPower', { nonNullable: true }),
    ratedPower: new FormControl<number | null>(null), ratedPowerUnit: new FormControl('hp', { nonNullable: true }),
    measuredPower: new FormControl<number | null>(null), measuredPowerUnit: new FormControl('kW', { nonNullable: true }),
    voltage: new FormControl<number | null>(null), current: new FormControl<number | null>(null), phases: new FormControl(3, { nonNullable: true }),
    powerFactor: new FormControl<number | null>(1), phase: new FormControl<MeterPhase>('Gas', { nonNullable: true }),
    fuel: new FormControl('', { nonNullable: true }), physicalUnit: new FormControl('', { nonNullable: true }),
    powerUnit: new FormControl('MMBtuhr', { nonNullable: true }), heatCapacity: new FormControl<number | null>(null),
    capacity: new FormControl<number | null>(null)
  });
  private readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly fuelCalculator = signal<RatedPowerCalculator | undefined>(undefined);
  readonly fuelVersion = signal(0);
  readonly loadPowers = computed(() => {
    this.values();
    return calculateLoadFactorPowers(this.form.getRawValue());
  });
  readonly loadFactor = computed(() => {
    this.values();
    return this.kind() === 'load' ? calculateLoadFactor(this.form.getRawValue()) : null;
  });
  readonly result = computed(() => {
    this.values(); this.fuelVersion(); const value = this.form.getRawValue();
    if (this.kind() === 'hours') return calculateOperatingHours(value.hours, value.days, value.weeks);
    if (this.kind() === 'load') return this.loadFactor()?.applied ?? null;
    const calculator = this.fuelCalculator();
    if (!calculator || calculator.isDisabled) return null;
    return Number(calculator.calculatedRatedPower.toFixed(6));
  });
  readonly loadWarning = computed(() => (this.loadFactor()?.percent ?? 0) > 100);
  constructor() {
    inject(DestroyRef).onDestroy(() => this.close());
    effect(() => { const active = this.modal.activePortal();
      if (this.opened() && this.portal && active !== this.portal) untracked(() => this.close()); });
    effect(() => { const key = this.editorKey(), target = this.source() ?? this.conditions();
      if (this.opened() && (key !== this.openedKey || target !== this.target)) untracked(() => this.close()); });
    const controls = this.form.controls;
    const sub = this.form.valueChanges.subscribe(() => {
      const calculator = this.fuelCalculator(); if (!calculator) return;
      const value = this.form.getRawValue();
      if (calculator.phase !== value.phase) calculator.changePhase(value.phase);
      else if (calculator.fuel !== value.fuel) calculator.changeFuel(value.fuel);
      else if (calculator.physicalUnit !== value.physicalUnit) calculator.changePhysicalUnit(value.physicalUnit);
      else if (calculator.heatCapacity !== value.heatCapacity) calculator.updateHeatCapacity(value.heatCapacity == null ? '' : String(value.heatCapacity));
      calculator.changePowerUnit(value.powerUnit); calculator.ratedCapacity = value.capacity;
      controls.fuel.setValue(calculator.fuel, { emitEvent: false });
      controls.physicalUnit.setValue(calculator.physicalUnit, { emitEvent: false });
      controls.heatCapacity.setValue(Number.isFinite(calculator.heatCapacity) ? calculator.heatCapacity : null, { emitEvent: false });
      this.fuelVersion.update(value => value + 1);
    });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }
  open(): void {
    if (!this.canEdit() || !this.calculator) return;
    this.target = this.source() ?? this.conditions(); if (!this.target) return;
    this.openedKey = this.editorKey();
    const row = this.conditions()?.getRawValue();
    this.fuelCalculator.set(undefined);
    this.form.reset({ hours: row?.hoursPerDay ?? 24, days: row?.daysPerWeek ?? 7, weeks: row?.weeksPerYear ?? 52,
      method: this.electricity() ? 'voltageCurrent' : 'measuredPower', ratedPowerUnit: this.electricity() ? 'hp' : 'MMBtuhr',
      measuredPowerUnit: this.electricity() ? 'kW' : 'MMBtuhr', phases: 3, powerFactor: 1 });
    const source = this.source()?.getRawValue();
    if (this.kind() === 'power' && source) {
      const calculator = new RatedPowerCalculator(this.workspace.customFuels?.() ?? []);
      calculator.energySource = source.energySource; calculator.initialPowerUnit = source.units;
      calculator.linkedMeters = this.linkedMeters().filter(meter => meter.source === source.energySource).map(meter => structuredClone(meter));
      calculator.initialize(); this.fuelCalculator.set(calculator);
      this.form.patchValue({ phase: calculator.phase, fuel: calculator.fuel, physicalUnit: calculator.physicalUnit,
        powerUnit: calculator.powerUnit, heatCapacity: Number.isFinite(calculator.heatCapacity) ? calculator.heatCapacity : null }, { emitEvent: false });
      this.fuelVersion.update(value => value + 1);
    }
    this.opened.set(true);
    if (this.embedded()) { this.viewRequested.emit(this.calculator); return; }
    this.portal = new TemplatePortal(this.calculator, this.view); this.modal.show(this.portal);
  }
  close(): void {
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    if (this.embedded() && this.opened()) this.viewRequested.emit(null);
    this.portal = undefined; this.opened.set(false);
  }
  apply(): void {
    const amount = this.result();
    if (!this.opened() || amount == null || !this.canEdit() || this.openedKey !== this.editorKey() || this.target !== (this.source() ?? this.conditions())) return;
    const value = this.form.getRawValue();
    if (this.kind() === 'hours') this.conditions()?.patchValue({ hoursOfOperation: amount, hoursPerDay: value.hours, daysPerWeek: value.days, weeksPerYear: value.weeks });
    else if (this.kind() === 'load') this.conditions()?.patchValue({ loadFactor: amount });
    else this.source()?.patchValue({ size: amount, units: value.powerUnit });
    this.target?.markAsDirty(); this.close();
  }
}
