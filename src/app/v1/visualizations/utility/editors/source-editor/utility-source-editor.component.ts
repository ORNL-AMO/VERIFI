import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import { Component, DestroyRef, Input, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import type { UtilitySelectionMode, UtilityVisualizationSource } from '@domain/visualizations/visualization-definition';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import type { UtilityEditorContext } from '../utility-editor-context';
import { decisionNodeId, meterResourceChoices, meterSelectionChoices, nativeObservationAvailable, prepareDecisionChange, projectMeterItems } from '../../../decisions/decision-tree';
import type { VisualizationDecisionAction } from '../../../decisions/decision-types';
import type { ResourceOption } from '../../../shared/resource-picker/resource-picker.component';

interface DataSettingsValue { readonly useDefaultUnits: boolean; readonly unit: string; readonly chargeMeter: string; readonly chargeGuid: string; }
function dataSettingsIssue(value: DataSettingsValue, measure?: UtilityVisualizationSource['measure']): string | undefined {
  if (measure === 'charge' && (!!value.chargeMeter !== !!value.chargeGuid)) return 'Choose both an owning meter and a named charge.';
  if (measure && ['energy', 'consumption', 'location-emissions', 'market-emissions'].includes(measure)
    && !value.useDefaultUnits && !value.unit.trim()) return 'Enter chart units or use the default units.';
  return undefined;
}

@Component({ selector: 'app-utility-source-editor', standalone: false, templateUrl: './utility-source-editor.component.html',
  styleUrls: ['./utility-source-editor.component.css', '../../../shared/compact-controls.css'] })
export class UtilitySourceEditorComponent {
  readonly emptyExpanded: ReadonlySet<string> = new Set();
  private readonly store = inject(AccountWorkspaceStore);
  private readonly destroy = inject(DestroyRef);
  private readonly contextValue = signal<UtilityEditorContext | undefined>(undefined);
  private identity = '';
  private settingsFingerprint = '';
  private readonly publishedSettings: string[] = [];
  private settingsEpoch = 0;
  private previousChargeMeter = '';
  readonly settingsMeasure = signal<UtilityVisualizationSource['measure'] | undefined>(undefined);
  readonly conflict = signal(false);
  readonly measureConflict = computed(() => this.conflict() && this.settingsMeasure() !== this.selectedSource()?.measure);
  readonly disabled = computed(() => this.contextValue()?.disabled ?? true);
  readonly contextState = this.contextValue.asReadonly();
  readonly selectedSource = computed(() => {
    const context = this.contextValue();
    const source = context?.definition.sources.find(item => item.id === context.sourceId);
    return source?.kind === 'utility' ? source : undefined;
  });
  readonly measures = [
    { value: 'energy', label: 'Energy', icon: 'energy' }, { value: 'consumption', label: 'Consumption / water', icon: 'droplet' },
    { value: 'cost', label: 'Cost', icon: 'piggyBank' }, { value: 'location-emissions', label: 'Location emissions', icon: 'location' },
    { value: 'market-emissions', label: 'Market emissions', icon: 'earth' }, { value: 'charge', label: 'Bill charge', icon: 'invoice' }
  ] as const satisfies readonly { value: UtilityVisualizationSource['measure']; label: string; icon: IconName }[];
  readonly visibleMeasures = computed(() => this.measures.filter(option => this.store.account()?.displayEmissions
    || option.value !== 'location-emissions' && option.value !== 'market-emissions'));
  readonly modes = meterSelectionChoices();
  readonly measureLabel = computed(() => this.measures.find(measure => measure.value === this.selectedSource()?.measure)?.label ?? 'Choose charted data');
  readonly settingsMeasureLabel = computed(() => this.measures.find(measure => measure.value === this.settingsMeasure())?.label ?? '');
  readonly nodes = computed(() => {
    const sourceId = this.contextValue()?.sourceId;
    const id = (kind: 'measure' | 'selection-mode' | 'resources' | 'data-settings') => decisionNodeId({ kind, sourceId });
    return { measure: id('measure'), mode: id('selection-mode'), resources: id('resources'), settings: id('data-settings') };
  });
  readonly items = computed(() => {
    const context = this.contextValue(), snapshot = this.store.snapshot();
    return context && snapshot ? projectMeterItems(context.definition, context.sourceId, snapshot).map(item => ({ ...item,
      resetKey: context.nodeResetKeys?.[decisionNodeId({ kind: 'item', sourceId: context.sourceId, itemKey: item.key })] ?? 0 })) : [];
  });
  readonly choices = computed<readonly ResourceOption[]>(() => {
    const source = this.selectedSource(), context = this.contextValue(), snapshot = this.store.snapshot();
    if (!source?.selectionMode || !this.selectionSupported() || !context || !snapshot) return [];
    return meterResourceChoices(snapshot, resolveVisualizationFacilities(context.definition, snapshot.facilities).scope, source.selectionMode, source.measure)
      .map(option => ({ guid: option.value, label: option.label, icon: option.icon, detail: option.detail || (!option.available ? 'No usable readings yet' : '') }));
  });
  readonly selectionLabel = computed(() => this.modes.find(mode => mode.value === this.selectedSource()?.selectionMode)?.label
    ?? (this.selectedSource()?.selectionMode === 'facility' ? 'Saved facility selection' : 'Choose a selection method'));
  readonly selectionSupported = computed(() => this.selectedSource()?.selectionMode === 'facility' || this.modes.some(mode => mode.value === this.selectedSource()?.selectionMode));
  readonly resourceLabel = computed(() => ({ source: 'Sources', group: 'Meter groups', meter: 'Meters', facility: 'Facilities', rule: 'Resources' })[this.selectedSource()?.selectionMode ?? 'meter']);
  readonly calendarizationChoiceVisible = computed(() => {
    const context = this.contextValue(), snapshot = this.store.snapshot(), source = this.selectedSource();
    return !!context && !!snapshot && !!source && source.measure !== 'charge'
      && (source.dataMode === 'billing-period' || nativeObservationAvailable(context.definition, context.sourceId, snapshot));
  });
  readonly selected = new FormControl<string[]>([], { nonNullable: true });
  readonly useCalendarizedData = new FormControl(true, { nonNullable: true });
  readonly aggregateByFacility = new FormControl(false, { nonNullable: true });
  readonly aggregationDisabled = computed(() => this.disabled() || this.selectedSource()?.measure === 'charge' || this.selectedSource()?.dataMode !== 'calendarized');
  readonly settingsOwner = computed(() => {
    const context = this.contextValue(), snapshot = this.store.snapshot();
    return context && snapshot && resolveVisualizationFacilities(context.definition, snapshot.facilities).scope.kind === 'facility' ? 'facility' : 'account';
  });
  readonly settingsForm = new FormGroup({
    useDefaultUnits: new FormControl(true, { nonNullable: true }), unit: new FormControl('', { nonNullable: true }),
    useDefaultEnergySettings: new FormControl(true, { nonNullable: true }), treatment: new FormControl<'site' | 'source'>('site', { nonNullable: true }),
    chargeMeter: new FormControl('', { nonNullable: true }), chargeGuid: new FormControl('', { nonNullable: true }),
    chargeMeasure: new FormControl<'cost' | 'usage'>('cost', { nonNullable: true })
  }, { validators: control => dataSettingsIssue(control.getRawValue() as DataSettingsValue, this.settingsMeasure()) ? { dataSettings: true } : null });
  readonly settingsValue = signal(this.settingsForm.getRawValue());
  readonly issue = computed(() => dataSettingsIssue(this.settingsValue(), this.settingsMeasure()));
  readonly scopeMeters = computed(() => {
    const context = this.contextValue(), snapshot = this.store.snapshot();
    const scope = context && snapshot ? resolveVisualizationFacilities(context.definition, snapshot.facilities).scope : undefined;
    const eligible = (value: { accountId: string; facilityId?: string }) => value.accountId === context?.definition.accountGuid
      && !!value.facilityId && !!scope?.facilityGuids.includes(value.facilityId);
    return this.store.meters().filter(eligible);
  });
  readonly meterOptions = computed(() => {
    const options = this.scopeMeters().map(value => ({ guid: value.guid, label: `${value.name} · ${value.source}`, unavailable: false }));
    const guid = this.settingsValue().chargeMeter;
    return guid && !options.some(item => item.guid === guid) ? [{ guid, label: `Unavailable meter: ${guid}`, unavailable: true }, ...options] : options;
  });
  readonly chargeOptions = computed(() => {
    const options = (this.scopeMeters().find(meter => meter.guid === this.settingsValue().chargeMeter)?.charges ?? []).map(charge => ({ guid: charge.guid, label: charge.name, unavailable: false }));
    const guid = this.settingsValue().chargeGuid;
    return guid && !options.some(item => item.guid === guid) ? [{ guid, label: `Unavailable charge: ${guid}`, unavailable: true }, ...options] : options;
  });

  @Input({ required: true }) set context(context: UtilityEditorContext) {
    this.contextValue.set(context);
    const source = this.selectedSource(); if (!source) return;
    const identity = `${context.editorKey}:${context.sourceId}:${context.resetKey ?? 0}`;
    const fingerprint = JSON.stringify([source.settings, source.charge, source.measure]);
    const epoch = context.nodeResetKeys?.[this.nodes().settings] ?? 0;
    if (identity !== this.identity || epoch !== this.settingsEpoch) {
      this.identity = identity; this.settingsEpoch = epoch; this.hydrateSettings(source);
    } else {
      // An acknowledged coherent edit must not replace newer raw form input.
      const acknowledgement = this.publishedSettings.lastIndexOf(fingerprint);
      if (!this.conflict() && acknowledgement >= 0) {
        this.settingsFingerprint = fingerprint;
        this.publishedSettings.splice(0, acknowledgement + 1);
      } else if (fingerprint !== this.settingsFingerprint) {
        if (this.issue() || this.conflict()) {
          this.publishedSettings.length = 0;
          this.conflict.set(true);
        } else this.hydrateSettings(source);
      }
    }
    const filter = source.selection?.kind === 'rule' ? source.selection.filter : {};
    const selected = source.selectionMode === 'source' ? [...filter.utilitySources ?? []] : source.selection?.kind === 'fixed' ? [...source.selection.guids] : [];
    this.selected.setValue(selected, { emitEvent: false });
    this.useCalendarizedData.setValue(source.dataMode === 'calendarized', { emitEvent: false });
    context.disabled || !this.calendarizationChoiceVisible() ? this.useCalendarizedData.disable({ emitEvent: false }) : this.useCalendarizedData.enable({ emitEvent: false });
    this.aggregateByFacility.setValue(source.aggregation === 'sum' && source.groupBy === 'facility', { emitEvent: false });
    this.aggregationDisabled() ? this.aggregateByFacility.disable({ emitEvent: false }) : this.aggregateByFacility.enable({ emitEvent: false });
    context.disabled ? this.settingsForm.disable({ emitEvent: false }) : this.settingsForm.enable({ emitEvent: false });
    this.settingsForm.updateValueAndValidity({ emitEvent: false });
    this.reportValidity();
  }

  constructor() {
    this.useCalendarizedData.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(enabled => {
      const source = this.selectedSource(); if (!source || this.disabled() || !this.calendarizationChoiceVisible()) return;
      this.contextValue()?.draftChanged?.();
      this.useCalendarizedData.setValue(source.dataMode === 'calendarized', { emitEvent: false });
      this.request({ kind: 'source-settings', sourceId: source.id, settings: { dataMode: enabled ? 'calendarized' : 'billing-period' } });
    });
    this.aggregateByFacility.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(enabled => {
      const source = this.selectedSource(); if (!source || this.aggregationDisabled()) return;
      this.contextValue()?.draftChanged?.();
      const groupBy = enabled ? 'facility' : source.selectionMode === 'source' ? 'source' : source.selectionMode === 'group' ? 'group' : 'meter';
      this.aggregateByFacility.setValue(source.aggregation === 'sum' && source.groupBy === 'facility', { emitEvent: false });
      this.request({ kind: 'source-settings', sourceId: source.id, settings: { groupBy, aggregation: 'sum' } });
    });
    this.settingsForm.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
      this.contextValue()?.draftChanged?.();
      const value = this.settingsForm.getRawValue();
      if (value.chargeMeter !== this.previousChargeMeter) { this.previousChargeMeter = value.chargeMeter; this.settingsForm.controls.chargeGuid.setValue('', { emitEvent: false }); }
      this.settingsValue.set(this.settingsForm.getRawValue()); this.publishSettings();
    });
    this.destroy.onDestroy(() => { const context = this.contextValue(); context?.validityChanged?.(false); context?.nodeValidityChanged?.(this.nodes().settings, false); });
  }

  request(action: VisualizationDecisionAction): void { if (!this.disabled()) this.contextValue()?.request?.(action); }
  selectMode(mode: UtilitySelectionMode): void { const source = this.selectedSource(); if (source && this.modes.some(choice => choice.value === mode)) this.request({ kind: 'selection-mode', sourceId: source.id, mode }); }
  selectMeasure(measure: UtilityVisualizationSource['measure']): void {
    const source = this.selectedSource();
    if (source && this.visibleMeasures().some(option => option.value === measure)) this.request({ kind: 'measure', sourceId: source.id, measure });
  }
  toggleResource(change: { readonly guid: string; readonly selected: boolean }): void {
    const source = this.selectedSource(); if (source) this.request({ kind: 'toggle-resource', sourceId: source.id, resourceId: change.guid, selected: change.selected });
  }
  setResources(resourceIds: readonly string[]): void {
    const source = this.selectedSource(); if (source) this.request({ kind: 'set-resources', sourceId: source.id, resourceIds });
  }
  setSection(id: string, expanded: boolean): void { this.contextValue()?.sectionChanged?.(id, expanded); }
  chooseSetting<T>(control: FormControl<T>, value: T): void { if (!this.disabled() && control.value !== value) { control.markAsDirty(); control.setValue(value); } }
  useSaved(): void { const source = this.selectedSource(); if (source) { this.hydrateSettings(source); this.reportValidity(); } }
  keepLocal(): void { if (!this.disabled() && !this.measureConflict()) { this.conflict.set(false); this.publishSettings(); } }

  private hydrateSettings(source: UtilityVisualizationSource): void {
    this.publishedSettings.length = 0;
    this.settingsMeasure.set(source.measure);
    this.settingsFingerprint = JSON.stringify([source.settings, source.charge, source.measure]); this.conflict.set(false);
    const value = { useDefaultUnits: source.settings?.unit?.kind !== 'pinned', unit: source.settings?.unit?.kind === 'pinned' ? source.settings.unit.value : '',
      useDefaultEnergySettings: source.settings?.energyTreatment?.kind !== 'pinned', treatment: source.settings?.energyTreatment?.kind === 'pinned' ? source.settings.energyTreatment.value : 'site',
      chargeMeter: source.charge?.meterGuid ?? '', chargeGuid: source.charge?.chargeGuid ?? '', chargeMeasure: source.charge?.measure ?? 'cost' } as const;
    this.settingsForm.reset(value, { emitEvent: false }); this.settingsValue.set(this.settingsForm.getRawValue());
    this.previousChargeMeter = value.chargeMeter;
  }
  private reportValidity(): void {
    const context = this.contextValue(), invalid = this.conflict() || !!this.issue();
    context?.validityChanged?.(invalid); context?.nodeValidityChanged?.(this.nodes().settings, invalid);
  }
  private publishSettings(): void {
    const source = this.selectedSource(), context = this.contextValue();
    this.reportValidity(); if (!source || !context || this.disabled() || this.issue() || this.conflict()) return;
    const value = this.settingsValue(), settings = { ...source.settings };
    if (['energy', 'consumption', 'location-emissions', 'market-emissions'].includes(source.measure)) settings.unit = value.useDefaultUnits
      ? { kind: 'owner' } : { kind: 'pinned', value: value.unit.trim() };
    if (source.measure === 'energy') settings.energyTreatment = value.useDefaultEnergySettings ? { kind: 'owner' } : { kind: 'pinned', value: value.treatment };
    const action: VisualizationDecisionAction = { kind: 'source-settings', sourceId: source.id, settings: { settings,
      ...(source.measure === 'charge' ? { charge: value.chargeMeter && value.chargeGuid ? { meterGuid: value.chargeMeter, chargeGuid: value.chargeGuid, measure: value.chargeMeasure } : undefined } : {}) } };
    const snapshot = this.store.snapshot();
    const result = snapshot ? prepareDecisionChange(context.definition, action, { snapshot }) : undefined;
    if (result?.state === 'confirm') this.hydrateSettings(source);
    else if (result?.state === 'apply') {
      const published = result.definition.sources.find(item => item.id === source.id);
      if (published?.kind === 'utility') this.publishedSettings.push(JSON.stringify([published.settings, published.charge, published.measure]));
    }
    this.request(action);
  }
}
