import { Component, DestroyRef, Input, computed, inject, output, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import type { HomeDisplayDefaults, HomeDisplayKey } from '@domain/home/home-dashboard';

export interface HomeDisplayRaw {
  period: 'base' | 'all-history' | 'fixed' | 'retained' | 'rolling-latest' | 'rolling-calendar'; start: string; end: string;
  energy: string; volume: string; energyTreatment: '' | 'owner' | 'site' | 'source'; emissionsTreatment: '' | 'market' | 'location';
  inheritPeriod: boolean; inheritUnits: boolean; inheritEnergy: boolean; inheritEmissions: boolean;
}
export interface HomeDisplayDraft { readonly raw: HomeDisplayRaw; readonly valid: boolean; readonly value: HomeDisplayDefaults; readonly inherit: readonly HomeDisplayKey[]; }
export interface HomeDisplayControlContext {
  readonly key: string; readonly value: HomeDisplayDefaults; readonly inherit?: readonly HomeDisplayKey[];
  readonly draft?: HomeDisplayDraft; readonly disabled: boolean;
}
let nextControl = 0;
@Component({ selector: 'app-home-display-controls', standalone: false, templateUrl: './display-controls.component.html', styleUrl: './display-controls.component.css' })
export class HomeDisplayControlsComponent {
  readonly changed = output<HomeDisplayDraft>();
  readonly id = `home-display-${++nextControl}`;
  readonly state = signal<HomeDisplayControlContext | undefined>(undefined);
  readonly feedback = signal('');
  readonly unitOptions = ['energy', 'volume'].map(quantity => {
    const converter = new ConvertValue(undefined, '', '');
    const measure = converter._measures[quantity] as Record<string, Record<string, unknown>> | undefined;
    return { quantity, values: [...new Set(Object.values(measure ?? {}).flatMap(system => Object.keys(system)))].filter(unit => converter.getUnit(unit)?.measure === quantity) };
  });
  readonly form = new FormGroup({
    period: new FormControl<HomeDisplayRaw['period']>('base', { nonNullable: true }), start: new FormControl('', { nonNullable: true }), end: new FormControl('', { nonNullable: true }),
    energy: new FormControl('', { nonNullable: true }), volume: new FormControl('', { nonNullable: true }),
    energyTreatment: new FormControl<HomeDisplayRaw['energyTreatment']>('', { nonNullable: true }), emissionsTreatment: new FormControl<HomeDisplayRaw['emissionsTreatment']>('', { nonNullable: true }),
    inheritPeriod: new FormControl(false, { nonNullable: true }), inheritUnits: new FormControl(false, { nonNullable: true }),
    inheritEnergy: new FormControl(false, { nonNullable: true }), inheritEmissions: new FormControl(false, { nonNullable: true })
  });
  readonly raw = signal(this.form.getRawValue());
  readonly retainedPeriod = computed(() => { const period = this.state()?.value.period; return period && !['fixed', 'all-history'].includes(period.kind); });
  @Input({ required: true }) set context(context: HomeDisplayControlContext) {
    this.state.set(context);
    const raw = context.draft?.raw ?? homeDisplayRaw(context.value, context.inherit);
    this.form.setValue(raw, { emitEvent: false }); this.raw.set(raw);
    this.feedback.set(context.draft?.valid === false ? 'Choose a valid start and end month in order. The last valid chart request remains active.' : '');
    context.disabled ? this.form.disable({ emitEvent: false }) : this.form.enable({ emitEvent: false });
  }
  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => {
      const context = this.state(); if (!context || context.disabled) return;
      const raw = this.form.getRawValue(), draft = homeDisplayDraft(raw, context.value);
      this.raw.set(raw); this.feedback.set(draft.valid ? '' : 'Choose a valid start and end month in order. The last valid chart request remains active.');
      this.changed.emit(draft);
    });
  }
}
export function homeDisplayRaw(value: HomeDisplayDefaults, inherit: readonly HomeDisplayKey[] = []): HomeDisplayRaw {
  const unit = (key: string) => { const binding = value.displaySettings?.units?.[key]; return binding?.kind === 'pinned' ? binding.value : binding ? 'owner' : ''; };
  const energy = value.displaySettings?.energyTreatment;
  return { period: value.period?.kind === 'fixed' ? 'fixed' : value.period?.kind === 'all-history' ? 'all-history' : value.period ? 'retained' : 'base',
    start: value.period?.kind === 'fixed' ? value.period.start.slice(0, 7) : '', end: value.period?.kind === 'fixed' ? value.period.end.slice(0, 7) : '',
    energy: unit('energy'), volume: unit('volume'), energyTreatment: energy?.kind === 'pinned' ? energy.value : energy ? 'owner' : '', emissionsTreatment: value.emissionsTreatment ?? '',
    inheritPeriod: inherit.includes('period'), inheritUnits: inherit.includes('units'), inheritEnergy: inherit.includes('energyTreatment'), inheritEmissions: inherit.includes('emissionsTreatment') };
}
export function homeDisplayDraft(raw: HomeDisplayRaw, retained: HomeDisplayDefaults): HomeDisplayDraft {
  const validMonth = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && Number(value.slice(0, 4)) >= 1;
  const valid = raw.period !== 'fixed' || validMonth(raw.start) && validMonth(raw.end) && raw.start <= raw.end;
  const { period: _period, displaySettings: _settings, emissionsTreatment: _emissions, ...rest } = retained;
  const units = { ...retained.displaySettings?.units };
  for (const key of ['energy', 'volume'] as const) { const value = raw[key]; if (!value) delete units[key]; else units[key] = value === 'owner' ? { kind: 'owner' } : { kind: 'pinned', value }; }
  const treatment = raw.energyTreatment;
  const unchangedFixed = raw.period === 'fixed' && retained.period?.kind === 'fixed' && raw.start === retained.period.start.slice(0, 7) && raw.end === retained.period.end.slice(0, 7);
  const period = unchangedFixed ? retained.period : raw.period === 'rolling-latest' || raw.period === 'rolling-calendar' ? { kind: 'rolling' as const, count: 12, unit: 'month' as const, anchor: raw.period === 'rolling-latest' ? 'latest-data' as const : 'calendar' as const, basis: 'calendar' as const, includeIncomplete: false } : raw.period === 'retained' ? retained.period : raw.period === 'all-history' ? { kind: 'all-history' as const } : raw.period === 'fixed' && valid
    ? { kind: 'fixed' as const, start: `${raw.start}-01`, end: `${raw.end}-${new Date(Date.UTC(Number(raw.end.slice(0, 4)), Number(raw.end.slice(5)), 0)).getUTCDate()}`, basis: 'calendar' as const } : undefined;
  const inherit: HomeDisplayKey[] = [];
  if (raw.inheritPeriod) inherit.push('period'); if (raw.inheritUnits) inherit.push('units'); if (raw.inheritEnergy) inherit.push('energyTreatment'); if (raw.inheritEmissions) inherit.push('emissionsTreatment');
  const displaySettings = { ...(Object.keys(units).length ? { units } : {}),
    ...(treatment ? { energyTreatment: treatment === 'owner' ? { kind: 'owner' as const } : { kind: 'pinned' as const, value: treatment } } : {}) };
  return { raw, valid, inherit, value: { ...rest, ...(period ? { period } : {}),
    ...(Object.keys(displaySettings).length ? { displaySettings } : {}),
    ...(raw.emissionsTreatment ? { emissionsTreatment: raw.emissionsTreatment } : {}) } };
}
