import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { utilityMeasureKey } from '@domain/visualizations/utility/utility-selection';
import type { UtilityVisualizationSource, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { UtilityEditorsModule } from '../utility-editors.module';
import { applyUtilitySourceForm, utilitySourceFormValue, UtilitySourceEditorComponent } from './utility-source-editor.component';

function source(definition = utilityVisualizationFixture()) { return definition.sources[0] as UtilityVisualizationSource; }

describe('utility source editing', () => {
  afterEach(() => TestBed.resetTestingModule());
  function setup(definition = utilityVisualizationFixture()) {
    const changed = vi.fn(), validityChanged = vi.fn();
    TestBed.configureTestingModule({ imports: [UtilityEditorsModule], providers: [AccountWorkspaceStore] });
    const fixture = TestBed.createComponent(UtilitySourceEditorComponent);
    const context = { definition, sourceId: source(definition).id, editorKey: 'chart-a', disabled: false, changed, validityChanged };
    fixture.componentRef.setInput('context', context); fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, context, changed, validityChanged };
  }

  it.each(['meter', 'group', 'source'] as const)('keeps the %s meter view selectable and saved in source settings', groupBy => {
    const { fixture, component, changed } = setup();
    const select = fixture.nativeElement.querySelector('select[formcontrolname="groupBy"]') as HTMLSelectElement;
    expect([...select.options].map(option => option.value)).toEqual(expect.arrayContaining(['meter', 'group', 'source']));
    if (groupBy === 'meter') component.form.controls.groupBy.setValue('group');
    select.value = groupBy; select.dispatchEvent(new Event('change')); fixture.detectChanges();
    expect(component.form.controls.groupBy.value).toBe(groupBy);
    const saved = changed.mock.lastCall![0] as VisualizationDefinition;
    expect(source(saved)).toMatchObject({ kind: 'utility', groupBy, dataMode: 'calendarized' });
    expect(source(saved).selection).toEqual(source().selection);
  });

  it('hydrates saved unsupported native setup without changing its chart, source settings, or saving', () => {
    const base = utilityVisualizationFixture();
    const definition: VisualizationDefinition = { ...base, sources: [{ ...source(base), dataMode: 'billing-period' }] };
    const { component, changed } = setup(definition);
    expect(component.form.getRawValue().dataMode).toBe('billing-period');
    expect(component.form.getRawValue().aggregation).toBe('sum');
    expect(changed).not.toHaveBeenCalled();
    expect(definition.chart?.kind === 'time-series' && definition.chart.interval).toBe('monthly');
  });

  it('retains an invalid pinned unit through metadata acknowledgement and protects it until corrected', () => {
    const { fixture, component, changed, validityChanged, context } = setup();
    component.form.controls.unit.setValue(''); fixture.detectChanges();
    expect(changed).not.toHaveBeenCalled(); expect(validityChanged).toHaveBeenLastCalledWith(true);
    fixture.componentRef.setInput('context', { ...context, definition: { ...context.definition, name: 'New title' } }); fixture.detectChanges();
    expect(component.form.controls.unit.value).toBe('');
    component.form.controls.unit.setValue('MMBtu');
    expect(validityChanged).toHaveBeenLastCalledWith(false);
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ name: 'New title', sources: [expect.objectContaining({ settings: expect.objectContaining({ unit: { kind: 'pinned', value: 'MMBtu' } }) })] }));
  });

  it('requires an explicit choice when a saved configuration changes under invalid local input', () => {
    const { fixture, component, context, changed, validityChanged } = setup();
    component.form.controls.unit.setValue('');
    const incoming = { ...context.definition, name: 'External metadata', sources: [
      { ...source(context.definition), groupBy: 'facility' as const, settings: { unit: { kind: 'pinned' as const, value: 'MMBtu' } } }
    ] };
    fixture.componentRef.setInput('context', { ...context, definition: incoming }); fixture.detectChanges();
    expect(component.conflict()).toBe(true); expect(component.form.controls.unit.value).toBe('');
    expect(validityChanged).toHaveBeenLastCalledWith(true);
    component.form.controls.unit.setValue('GJ');
    expect(component.form.valid).toBe(true); expect(changed).not.toHaveBeenCalled();
    expect(validityChanged).toHaveBeenLastCalledWith(true);
    component.keepLocal();
    expect(component.conflict()).toBe(false);
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ name: 'External metadata', sources: [expect.objectContaining({
      groupBy: 'meter', settings: expect.objectContaining({ unit: { kind: 'pinned', value: 'GJ' } })
    })] }));
    expect(validityChanged).toHaveBeenLastCalledWith(false);
  });

  it('uses the latest saved configuration only after explicit review and keeps incomplete local input protected after Keep local', () => {
    const { fixture, component, context, changed, validityChanged } = setup();
    component.form.controls.unit.setValue('');
    const incoming = { ...context.definition, sources: [{ ...source(context.definition), settings: { unit: { kind: 'pinned' as const, value: 'MMBtu' } } }] };
    fixture.componentRef.setInput('context', { ...context, definition: incoming }); fixture.detectChanges();
    component.keepLocal();
    expect(component.form.controls.unit.value).toBe(''); expect(component.conflict()).toBe(false);
    expect(changed).not.toHaveBeenCalled(); expect(validityChanged).toHaveBeenLastCalledWith(true);
    fixture.componentRef.setInput('context', { ...context, definition: { ...incoming, sources: [{ ...source(incoming), groupBy: 'facility' }] } }); fixture.detectChanges();
    expect(component.conflict()).toBe(true);
    component.useSaved();
    expect(component.form.controls.unit.value).toBe('MMBtu'); expect(component.form.controls.groupBy.value).toBe('facility');
    expect(component.conflict()).toBe(false); expect(changed).not.toHaveBeenCalled();
    expect(validityChanged).toHaveBeenLastCalledWith(false);
  });

  it('shows missing selected identities instead of dropping them and resets drafts on explicit discard', () => {
    const { fixture, component, context } = setup();
    expect(fixture.nativeElement.textContent).toContain('Unavailable: meter-a');
    component.form.controls.unit.setValue('');
    fixture.componentRef.setInput('context', { ...context, resetKey: 1 }); fixture.detectChanges();
    expect(component.form.controls.unit.value).toBe('kWh'); expect(component.form.valid).toBe(true);
  });

  it('makes group membership live explicitly and clears meters when switching resource namespaces', () => {
    const { component, changed } = setup();
    component.form.controls.mode.setValue('groups');
    expect(component.form.controls.guids.value).toEqual([]);
    component.form.controls.guids.setValue(['group-a']);
    const next = changed.mock.lastCall![0] as VisualizationDefinition;
    expect(source(next).selection).toEqual({ kind: 'fixed', resource: 'meter-group', guids: ['group-a'] });
  });

  it('normalizes native mode only on real edits and keeps independent data sources and series', () => {
    const base = utilityVisualizationFixture();
    const mixed: VisualizationDefinition = { ...base, sources: [...base.sources, { id: 'weather', kind: 'predictor', measure: 'value', aggregation: 'none' }],
      series: [...base.series, { id: 'weather-series', sourceId: 'weather', metric: 'value', axis: 'right' }] };
    const next = applyUtilitySourceForm(mixed, source(mixed).id, { ...utilitySourceFormValue(source(mixed)), dataMode: 'billing-period' });
    expect(source(next)).toMatchObject({ dataMode: 'billing-period', aggregation: 'none', groupBy: 'meter' });
    expect(next.chart?.kind === 'time-series' && next.chart.interval).toBe('native');
    expect(next.sources[1]).toEqual(mixed.sources[1]); expect(next.series[1]).toEqual(mixed.series[1]);
  });
  it('retains every category appearance and explicit order when a live selection changes', () => {
    const base = utilityVisualizationFixture();
    const { resourceGuid: _resource, ...wildcard } = base.series[0];
    const definition = { ...base, sources: base.sources.map(item => item.kind === 'utility' ? { ...item, groupBy: 'source' as const } : item), series: [{ ...wildcard, overrides: [
      { seriesId: 'utility:source:Electricity', label: 'Electricity', order: 0 },
      { seriesId: 'utility:source:Natural Gas', visible: false, order: 1 },
      { seriesId: 'utility:source:Dormant', color: '#123456' }
    ] }] };
    const next = applyUtilitySourceForm(definition, source(definition).id, { ...utilitySourceFormValue(source(definition)), mode: 'rule', search: 'Main' });
    expect(next.series[0].overrides).toEqual(definition.series[0].overrides);
  });

  it('retargets an explicit resource edit without leaving an uneditable old series anchor', () => {
    const definition = utilityVisualizationFixture();
    const next = applyUtilitySourceForm(definition, source(definition).id, { ...utilitySourceFormValue(source(definition)), guids: ['new-meter'] });
    expect(source(next).selection).toMatchObject({ guids: ['new-meter'] });
    expect(next.series).toHaveLength(1); expect(next.series[0].resourceGuid).toBeUndefined();
    expect(next.series[0].label).toBeUndefined();
    expect(next.series[0].overrides).toContainEqual(expect.objectContaining({ resourceGuid: 'meter-a', accountGuid: definition.accountGuid, label: 'Electricity' }));
    const grouped = applyUtilitySourceForm(next, source(next).id, { ...utilitySourceFormValue(source(next)), groupBy: 'facility' });
    expect(grouped.series[0].overrides).toBeUndefined();
    const separate = applyUtilitySourceForm(grouped, source(grouped).id, { ...utilitySourceFormValue(source(grouped)), aggregation: 'none' });
    expect(source(separate).groupBy).toBe('meter');
  });

  it('clears irrelevant pinned settings on a real measure change and declares the new metric', () => {
    const definition = utilityVisualizationFixture();
    const next = applyUtilitySourceForm(definition, source(definition).id, { ...utilitySourceFormValue(source(definition)), measure: 'cost' });
    expect(source(next).settings).toEqual({});
    expect(next.series[0].metric).toBe(utilityMeasureKey(source(next)));
    expect(source(definition).settings?.unit).toEqual({ kind: 'pinned', value: 'kWh' });
  });

  it('requires meter and charge together without inventing a charge identity', () => {
    const definition = utilityVisualizationFixture(), value = utilitySourceFormValue(source(definition));
    expect(applyUtilitySourceForm(definition, source(definition).id, { ...value, measure: 'charge', chargeMeter: 'meter-a' })).toBe(definition);
    const next = applyUtilitySourceForm(definition, source(definition).id, { ...value, measure: 'charge', chargeMeter: 'meter-a', chargeGuid: 'charge-a', chargeMeasure: 'usage' });
    expect(source(next)).toMatchObject({ dataMode: 'billing-period', charge: { meterGuid: 'meter-a', chargeGuid: 'charge-a', measure: 'usage' } });
    expect(source(next).selection).toEqual({ kind: 'fixed', resource: 'meter', guids: ['meter-a'] });
  });
});
