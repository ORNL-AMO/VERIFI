import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { vi } from 'vitest';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { visualizationEvidenceFixture } from '@domain/visualizations/testing/visualization-provider-fixtures';
import { ChartSettingsComponent } from './chart-settings.component';
import type { ChartSettingsContext } from './chart-settings.component';
import { TimeSeriesModule } from '../time-series.module';
import type { VisualizationDefinition, VisualizationSeriesOverride } from '@domain/visualizations/visualization-definition';
import type { ResolvedVisualizationSeries } from '@domain/visualizations/visualization-source-provider';
import { resolveVisualizationSeries } from '@domain/visualizations/visualization-series';

describe('saved chart settings', () => {
  afterEach(() => TestBed.resetTestingModule());
  function setup(): { fixture: ComponentFixture<ChartSettingsComponent>; context: ChartSettingsContext; changed: ReturnType<typeof vi.fn> } {
    const definition = { ...utilityVisualizationFixture(), series: [{ id: 'energy', sourceId: 'utility', metric: 'energy', axis: 'left' as const }] };
    const evidence = visualizationEvidenceFixture(definition);
    if (evidence.resolution.state !== 'ready') throw new Error('Ready fixture expected.');
    const resolvedSeries = [{ ...evidence.resolution.resolved.series[0], id: 'meter-series', resourceGuid: 'meter-a' }];
    const changed = vi.fn(), context = { definition, disabled: false, changed, resolvedSeries };
    TestBed.configureTestingModule({ imports: [TimeSeriesModule] });
    const fixture = TestBed.createComponent(ChartSettingsComponent); fixture.componentRef.setInput('context', context); fixture.detectChanges();
    return { fixture, context, changed };
  }
  function groupedSetup(overrides: readonly VisualizationSeriesOverride[] = []) {
    const original = utilityVisualizationFixture();
    const definition: VisualizationDefinition = { ...original,
      sources: original.sources.map(source => source.kind === 'utility' ? { ...source, groupBy: 'source', selection: { kind: 'rule', resource: 'meter', filter: {} } } : source),
      series: [{ id: 'energy', sourceId: 'utility', metric: 'energy', axis: 'left', ...(overrides.length ? { overrides } : {}) }] };
    const metadata: readonly ResolvedVisualizationSeries[] = ['Electricity', 'Natural Gas'].map(label => ({
      id: `utility:source:${label}`, sourceId: 'utility', metric: 'energy', label, unit: 'kWh', dimension: 'energy', energyTreatment: 'site', additive: true
    }));
    const changed = vi.fn();
    let context: ChartSettingsContext = { definition, disabled: false, changed, resolvedSeries: metadata, identity: 'saved-category-chart' };
    TestBed.configureTestingModule({ imports: [TimeSeriesModule] });
    const fixture = TestBed.createComponent(ChartSettingsComponent);
    fixture.componentRef.setInput('context', context); fixture.detectChanges();
    const hydrate = (nextDefinition: VisualizationDefinition, nextMetadata: readonly ResolvedVisualizationSeries[] = context.resolvedSeries!) => {
      context = { ...context, definition: nextDefinition, resolvedSeries: nextMetadata };
      fixture.componentRef.setInput('context', context); fixture.detectChanges();
    };
    const acknowledge = () => { const next = changed.mock.lastCall![0] as VisualizationDefinition; hydrate(next); return next; };
    return { fixture, changed, metadata, hydrate, acknowledge, context: () => context };
  }
  it('does not save discovery/hydration and saves member visibility as a resource override', () => {
    const { fixture, changed } = setup();
    expect(changed).not.toHaveBeenCalled();
    fixture.componentInstance.rows()[0].form.controls.visible.setValue(false);
    const next = changed.mock.calls[0][0];
    expect(next.series[0].resourceGuid).toBeUndefined();
    expect(next.series[0].overrides[0]).toMatchObject({ resourceGuid: 'meter-a', accountGuid: 'account-a', visible: false });
    expect(JSON.stringify(next)).not.toContain('"resolvedSeries"');
  });
  it('retains live selection and untouched settings when switching chart type', () => {
    const { fixture, context, changed } = setup();
    fixture.componentInstance.chartForm.controls.type.setValue('bar');
    expect(changed.mock.calls[0][0]).toEqual({ ...context.definition, chart: { kind: 'time-series', type: 'bar', interval: 'monthly', stack: 'none' } });
  });
  it('disables saved changes in a read-only workspace and retains controls across acknowledgement', () => {
    const { fixture, context, changed } = setup();
    const rowForm = fixture.componentInstance.rows()[0].form;
    fixture.componentRef.setInput('context', { ...context, disabled: true }); fixture.detectChanges();
    expect(fixture.componentInstance.rows()[0].form).toBe(rowForm);
    expect(rowForm.disabled).toBe(true);
    rowForm.controls.label.setValue('Changed');
    expect(changed).not.toHaveBeenCalled();
  });
  it('edits category visibility, label, color and axis independently through stable provider-series overrides', () => {
    const state = groupedSetup();
    expect(state.changed).not.toHaveBeenCalled();
    const electricity = () => state.fixture.componentInstance.rows().find(row => row.key === 'utility:source:Electricity')!;
    electricity().form.controls.visible.setValue(false); state.acknowledge();
    electricity().form.controls.label.setValue('Purchased electricity'); state.acknowledge();
    electricity().form.controls.customColor.setValue(true); state.acknowledge();
    electricity().form.controls.color.setValue('#123456'); state.acknowledge();
    electricity().form.controls.axis.setValue('right');
    const saved = state.acknowledge();
    expect(saved.series[0]).toMatchObject({ id: 'energy', axis: 'left' });
    expect(saved.series[0].visible).toBeUndefined(); expect(saved.series[0].label).toBeUndefined(); expect(saved.series[0].color).toBeUndefined();
    expect(saved.series[0].overrides).toEqual([{ seriesId: 'utility:source:Electricity', accountGuid: saved.accountGuid,
      visible: false, label: 'Purchased electricity', color: '#123456', axis: 'right' }]);
    const effective = resolveVisualizationSeries(saved, state.metadata, true);
    expect(effective.find(item => item.metadata.label === 'Electricity')!.selected).toMatchObject({ visible: false, label: 'Purchased electricity', color: '#123456', axis: 'right' });
    const gas = effective.find(item => item.metadata.label === 'Natural Gas')!.selected;
    expect(gas.axis).toBe('left'); expect(gas.visible).toBeUndefined(); expect(gas.label).toBeUndefined(); expect(gas.color).toBeUndefined();
    expect(resolveVisualizationSeries(saved, state.metadata).map(item => item.metadata.label)).toEqual(['Natural Gas']);
    expect(saved.sources[0]).toMatchObject({ groupBy: 'source', selection: { kind: 'rule', resource: 'meter' } });
  });
  it('orders category members without converting the wildcard and preserves dormant appearance plus new bucket defaults', () => {
    const dormant: VisualizationSeriesOverride = { seriesId: 'utility:source:Dormant', label: 'Archived label', color: '#aabbcc', visible: false };
    const state = groupedSetup([dormant]);
    const gas = () => state.fixture.componentInstance.rows().find(row => row.key === 'utility:source:Natural Gas')!;
    gas().form.controls.label.setValue('Gas supply');
    const labeled = state.acknowledge();
    expect(labeled.series[0].overrides.find(override => override.seriesId === 'utility:source:Natural Gas')!.order).toBeUndefined();
    expect(resolveVisualizationSeries(labeled, state.metadata).map(item => item.metadata.label)).toEqual(['Electricity', 'Natural Gas']);
    expect(state.fixture.componentInstance.rows().map(row => row.label)).toEqual(['Electricity', 'Natural Gas']);
    state.fixture.componentInstance.move('utility:source:Natural Gas', -1);
    const ordered = state.acknowledge();
    expect(ordered.series).toHaveLength(1); expect(ordered.series[0].resourceGuid).toBeUndefined();
    expect(ordered.series[0].overrides.map(override => override.seriesId)).toEqual(['utility:source:Natural Gas', 'utility:source:Electricity', 'utility:source:Dormant']);
    expect(ordered.series[0].overrides[0]).toMatchObject({ label: 'Gas supply', order: 0 });
    expect(ordered.series[0].overrides[1]).toMatchObject({ order: 1 });
    expect(ordered.series[0].overrides[2]).toEqual(dormant);
    expect(resolveVisualizationSeries(ordered, state.metadata).map(item => item.metadata.label)).toEqual(['Natural Gas', 'Electricity']);
    gas().form.controls.label.setValue('Delivered gas');
    const edited = state.acknowledge();
    expect(edited.series[0].overrides[0]).toMatchObject({ label: 'Delivered gas', order: 0 });
    expect(resolveVisualizationSeries(edited, state.metadata).map(item => item.metadata.label)).toEqual(['Natural Gas', 'Electricity']);
    const newcomer: ResolvedVisualizationSeries = { ...state.metadata[0], id: 'utility:source:Other Energy', label: 'Other Energy' };
    const persisted = JSON.parse(JSON.stringify(edited)) as VisualizationDefinition, changes = state.changed.mock.calls.length;
    state.hydrate(persisted, [newcomer, ...state.metadata]);
    expect(state.changed).toHaveBeenCalledTimes(changes);
    const expanded = resolveVisualizationSeries(persisted, [newcomer, ...state.metadata], true);
    expect(expanded.map(item => item.metadata.label)).toEqual(['Natural Gas', 'Electricity', 'Other Energy']);
    expect(expanded[0].selected.label).toBe('Delivered gas');
    expect(expanded[2].selected).toMatchObject({ axis: 'left' });
    expect(expanded[2].selected.visible).toBeUndefined(); expect(expanded[2].selected.color).toBeUndefined(); expect(expanded[2].selected.label).toBeUndefined();
    state.hydrate(persisted, [newcomer, state.metadata[0]]);
    expect(state.context().definition.series[0].overrides).toEqual(edited.series[0].overrides);
    state.hydrate(persisted, [newcomer, ...state.metadata]);
    expect(gas().form.controls.label.value).toBe('Delivered gas');
    expect(state.changed).toHaveBeenCalledTimes(changes);
  });
  it('retains explicit member order while clearing label/color and making later appearance edits', () => {
    const state = groupedSetup([{ seriesId: 'utility:source:Electricity', order: 0 },
      { seriesId: 'utility:source:Natural Gas', order: 1, label: 'Custom gas', color: '#123456' }]);
    state.fixture.componentInstance.move('utility:source:Natural Gas', -1); state.acknowledge();
    const gas = () => state.fixture.componentInstance.rows().find(row => row.key === 'utility:source:Natural Gas')!;
    gas().form.controls.label.setValue(''); state.acknowledge();
    gas().form.controls.customColor.markAsDirty(); gas().form.controls.customColor.setValue(false); state.acknowledge();
    gas().form.controls.axis.setValue('right');
    const edited = state.acknowledge(), override = edited.series[0].overrides.find(item => item.seriesId === 'utility:source:Natural Gas')!;
    expect(override.order).toBe(0); expect(override.label).toBeUndefined(); expect(override.color).toBeUndefined();
    expect(override.axis).toBe('right');
    const effective = resolveVisualizationSeries(edited, state.metadata, true);
    expect(effective.map(item => item.metadata.label)).toEqual(['Natural Gas', 'Electricity']);
    expect(effective[0].selected.label).toBeUndefined(); expect(effective[0].selected.color).toBeUndefined();
  });
  it('keeps dormant explicit members in relative order after moved active members and leaves foreign settings untouched', () => {
    const foreign: VisualizationSeriesOverride = { seriesId: 'utility:source:Foreign', accountGuid: 'foreign-account', order: 0, label: 'Foreign appearance' };
    const state = groupedSetup([{ seriesId: 'utility:source:Dormant A', order: 0, label: 'Retained A' },
      { seriesId: 'utility:source:Dormant B', order: 5, visible: false }, foreign]);
    state.fixture.componentInstance.move('utility:source:Natural Gas', -1);
    const moved = state.acknowledge();
    expect(moved.series[0].overrides).toContainEqual(foreign);
    const restored = ['Other Energy', 'Dormant B', 'Dormant A'].map(label => ({ ...state.metadata[0], id: `utility:source:${label}`, label }));
    const effective = resolveVisualizationSeries(moved, [...restored, ...state.metadata], true);
    expect(effective.map(item => item.metadata.label)).toEqual(['Natural Gas', 'Electricity', 'Dormant A', 'Dormant B', 'Other Energy']);
    expect(effective[2].selected.label).toBe('Retained A'); expect(effective[3].selected.visible).toBe(false);
  });
});
