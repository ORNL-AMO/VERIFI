import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import type { UtilityVisualizationSource, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { visualizationSnapshot } from '../../../testing/visualization-test-fixtures';
import { meter } from '@app/v1/data/meters/facility-meters.testing';
import { UtilityEditorsModule } from '../utility-editors.module';
import { decisionNodeId } from '../../../decisions/decision-tree';
import { UtilitySourceEditorComponent } from './utility-source-editor.component';
import type { UtilityEditorContext } from '../utility-editor-context';

describe('Meter decision branches', () => {
  it('retains normalized-equivalent raw unit text through its own acknowledgement and replaces it on reset', () => {
    const state = setup(), original = utilityVisualizationFixture(), source = original.sources[0] as UtilityVisualizationSource;
    state.component.settingsForm.controls.unit.setValue('  MWh  ');
    expect(state.request).toHaveBeenLastCalledWith(expect.objectContaining({ settings: expect.objectContaining({ settings: expect.objectContaining({ unit: { kind: 'pinned', value: 'MWh' } }) }) }));
    state.update({ definition: { ...original, sources: [{ ...source, settings: { ...source.settings, unit: { kind: 'pinned', value: 'MWh' } } }] } });
    expect(state.component.settingsForm.controls.unit.value).toBe('  MWh  '); expect(state.component.conflict()).toBe(false);
    state.update({ nodeResetKeys: { 'data-settings:utility': 1 } });
    expect(state.component.settingsForm.controls.unit.value).toBe('MWh');
  });
  it('keeps newer incomplete unit input without an external conflict when acknowledging its prior coherent edit', () => {
    const state = setup(), original = utilityVisualizationFixture(), source = original.sources[0] as UtilityVisualizationSource;
    state.component.settingsForm.controls.unit.setValue('MWh');
    state.component.settingsForm.controls.unit.setValue('');
    state.update({ definition: { ...original, sources: [{ ...source, settings: { ...source.settings, unit: { kind: 'pinned', value: 'MWh' } } }] } });
    expect(state.component.settingsForm.controls.unit.value).toBe(''); expect(state.component.issue()).toBeDefined();
    expect(state.component.conflict()).toBe(false); expect(state.invalid).toHaveBeenLastCalledWith('data-settings:utility', true);
  });
  it.each([
    { edits: ['MWh', 'kWh'], acknowledged: 'kWh', external: 'MWh' },
    { edits: ['MWh', 'kWh', 'MWh'], acknowledged: 'MWh', external: 'kWh' }
  ])('finishes acknowledgement tracking for $edits before accepting an external update', ({ edits, acknowledged, external }) => {
    const state = setup(), original = utilityVisualizationFixture(), source = original.sources[0] as UtilityVisualizationSource;
    for (const unit of edits) state.component.settingsForm.controls.unit.setValue(unit);
    expect(state.request).toHaveBeenLastCalledWith(expect.objectContaining({ settings: expect.objectContaining({ settings: expect.objectContaining({ unit: { kind: 'pinned', value: acknowledged } }) }) }));
    state.update({ definition: { ...original, sources: [{ ...source, settings: { ...source.settings, unit: { kind: 'pinned', value: acknowledged } } }] } });
    state.update({ definition: { ...original, sources: [{ ...source, settings: { ...source.settings, unit: { kind: 'pinned', value: external } } }] } });
    expect(state.component.settingsForm.controls.unit.value).toBe(external); expect(state.component.conflict()).toBe(false);
  });
  it('places each selected item beside the source settings without an Items wrapper or movement buttons', () => {
    const original = utilityVisualizationFixture(), source = original.sources[0] as UtilityVisualizationSource;
    const state = setup({ ...original, sources: [{ ...source, selection: { kind: 'fixed', resource: 'meter', guids: ['meter-a', 'meter-b'] } }] });
    const root = state.fixture.nativeElement as HTMLElement, sections = root.querySelector('.utility-editor')!;
    const items = [...root.querySelectorAll('app-visualization-item-settings')];
    expect(items).toHaveLength(2); expect(items.every(item => item.parentElement === sections)).toBe(true);
    expect(items.map(item => item.querySelector('.decision-section__toggle strong')?.textContent)).toContain('Boiler meter');
    expect([...sections.children].some(section => section.querySelector('strong')?.textContent === 'Data settings')).toBe(true);
    expect(root.querySelector('[id^="items:"]')).toBeNull();
    expect(root.querySelector('button[aria-label^="Move "]')).toBeNull();
  });
  it('shows the default-on calendarization switch inside Data settings and preserves drafts while a change is reviewed', () => {
    const state = setup(), root = state.fixture.nativeElement as HTMLElement;
    const settings = root.querySelector('[id="data-settings:utility-body"]')!;
    const toggle = [...settings.querySelectorAll<HTMLInputElement>('input[role="switch"]')]
      .find(input => input.closest('label')?.textContent?.trim() === 'Use Calendarized Data')!;
    expect(toggle.checked).toBe(true); expect(state.request).not.toHaveBeenCalled();
    expect(root.querySelector('[id="observation:utility-heading"]')).toBeNull();
    state.component.settingsForm.controls.unit.setValue(''); state.fixture.detectChanges();
    toggle.click(); state.fixture.detectChanges();
    expect(state.request).toHaveBeenCalledExactlyOnceWith({ kind: 'source-settings', sourceId: 'utility', settings: { dataMode: 'billing-period' } });
    expect(toggle.checked).toBe(true); expect(state.component.settingsForm.controls.unit.value).toBe('');
    const original = utilityVisualizationFixture(), source = original.sources[0] as UtilityVisualizationSource;
    state.update({ definition: { ...original, sources: [{ ...source, dataMode: 'billing-period', aggregation: 'none', groupBy: 'meter' }] } });
    expect(toggle.checked).toBe(false); expect(state.component.settingsForm.controls.unit.value).toBe('');
    toggle.click(); state.fixture.detectChanges();
    expect(state.request).toHaveBeenLastCalledWith({ kind: 'source-settings', sourceId: 'utility', settings: { dataMode: 'calendarized' } });
    expect(toggle.checked).toBe(false);
  });
  it.each([
    { name: 'source totals', patch: { selectionMode: 'source' } },
    { name: 'group totals', patch: { selectionMode: 'group' } },
    { name: 'facility totals', patch: { aggregation: 'sum', groupBy: 'facility' } },
    { name: 'multiple meters', patch: { selection: { kind: 'fixed', resource: 'meter', guids: ['meter-a', 'meter-b'] } } },
    { name: 'bill charges', patch: { measure: 'charge', dataMode: 'billing-period', aggregation: 'none' } }
  ] satisfies readonly { name: string; patch: Partial<UtilityVisualizationSource> }[])('hides calendarization when $name require a fixed data view', ({ patch }) => {
    const original = utilityVisualizationFixture(), source = original.sources[0] as UtilityVisualizationSource;
    const state = setup({ ...original, sources: [{ ...source, ...patch }] });
    const root = state.fixture.nativeElement as HTMLElement;
    expect(state.component.calendarizationChoiceVisible()).toBe(false);
    expect([...root.querySelectorAll('input[role="switch"]')].some(input => input.closest('label')?.textContent?.includes('Use Calendarized Data'))).toBe(false);
    expect(state.component.useCalendarizedData.disabled).toBe(true);
    expect(state.request).not.toHaveBeenCalled();
  });
  it('offers default unit and energy switches with clear custom-setting labels', () => {
    const state = setup(), root = state.fixture.nativeElement as HTMLElement;
    const units = root.querySelector<HTMLInputElement>('input[formcontrolname="useDefaultUnits"]')!;
    const energy = root.querySelector<HTMLInputElement>('input[formcontrolname="useDefaultEnergySettings"]')!;
    expect(units.getAttribute('role')).toBe('switch'); expect(energy.getAttribute('role')).toBe('switch');
    expect(units.closest('label')?.textContent).toContain('Use facility units');
    expect(energy.closest('label')?.textContent).toContain('Use facility energy settings');
    expect(units.checked).toBe(false); expect(root.textContent).toContain('Chart units');
    units.click(); state.fixture.detectChanges();
    expect(state.request).toHaveBeenCalledWith(expect.objectContaining({ kind: 'source-settings',
      settings: expect.objectContaining({ settings: expect.objectContaining({ unit: { kind: 'owner' } }) }) }));
    expect(root.querySelector('input[formcontrolname="unit"]')).toBeNull();
    state.component.settingsForm.controls.useDefaultEnergySettings.setValue(false); state.fixture.detectChanges();
    const energyChoices = root.querySelectorAll<HTMLButtonElement>('[aria-label="Site or source energy"] button');
    expect([...energyChoices].map(button => button.textContent?.trim())).toEqual(['Site', 'Source']);
    expect(energyChoices[0].getAttribute('aria-pressed')).toBe('true');
    energyChoices[1].click(); state.fixture.detectChanges();
    expect(energyChoices[1].getAttribute('aria-pressed')).toBe('true');
    expect(state.request).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'source-settings',
      settings: expect.objectContaining({ settings: expect.objectContaining({ energyTreatment: { kind: 'pinned', value: 'source' } }) }) }));
  });
  it('requests facility aggregation without discarding an incomplete units draft', () => {
    const state = setup(), root = state.fixture.nativeElement as HTMLElement;
    state.component.settingsForm.controls.unit.setValue(''); state.fixture.detectChanges();
    const toggle = [...root.querySelectorAll<HTMLInputElement>('input[role="switch"]')]
      .find(input => input.closest('label')?.textContent?.includes('Aggregate by facility'))!;
    expect(toggle.checked).toBe(false); toggle.click(); state.fixture.detectChanges();
    expect(state.request).toHaveBeenCalledExactlyOnceWith({ kind: 'source-settings', sourceId: 'utility', settings: { aggregation: 'sum', groupBy: 'facility' } });
    expect(toggle.checked).toBe(false); expect(state.component.settingsForm.controls.unit.value).toBe('');
    expect(state.component.issue()).toBeDefined();
    const original = utilityVisualizationFixture(), source = original.sources[0] as UtilityVisualizationSource;
    state.update({ definition: { ...original, sources: [{ ...source, aggregation: 'sum', groupBy: 'facility' }] } });
    expect(toggle.checked).toBe(true); expect(state.component.settingsForm.controls.unit.value).toBe('');
    toggle.click(); state.fixture.detectChanges();
    expect(state.request).toHaveBeenLastCalledWith({ kind: 'source-settings', sourceId: 'utility', settings: { aggregation: 'sum', groupBy: 'meter' } });
  });
  it('disables facility aggregation for native bills', () => {
    const original = utilityVisualizationFixture(), source = original.sources[0] as UtilityVisualizationSource;
    const state = setup({ ...original, sources: [{ ...source, dataMode: 'billing-period', aggregation: 'none', groupBy: 'meter' }] });
    expect(state.component.aggregateByFacility.disabled).toBe(true);
    state.component.aggregateByFacility.setValue(true);
    expect(state.request).not.toHaveBeenCalled();
  });
  afterEach(() => TestBed.resetTestingModule());
  function setup(definition = utilityVisualizationFixture()) {
    const store = new AccountWorkspaceStore(); store.publish({ ...visualizationSnapshot(), meters: [meter({ id: 1 }), meter({ id: 2, guid: 'meter-b', name: 'Boiler meter' })] });
    const request = vi.fn(), invalid = vi.fn();
    const expandedNodes = new Set(['measure', 'selection-mode', 'resources', 'data-settings', 'items'].map(kind => `${kind}:utility`));
    let context: UtilityEditorContext = { definition, sourceId: 'utility', editorKey: 'saved-a', disabled: false, changed: vi.fn(),
      request, expandedNodes, sectionChanged: vi.fn(), nodeValidityChanged: invalid };
    TestBed.configureTestingModule({ imports: [UtilityEditorsModule], providers: [{ provide: AccountWorkspaceStore, useValue: store }] });
    const fixture = TestBed.createComponent(UtilitySourceEditorComponent); fixture.componentRef.setInput('context', context); fixture.detectChanges();
    const update = (changes: Partial<UtilityEditorContext>) => { context = { ...context, ...changes }; fixture.componentRef.setInput('context', context); fixture.detectChanges(); };
    return { fixture, component: fixture.componentInstance, store, request, invalid, update };
  }
  it('shows emissions choices under Charted Data only while the account displays emissions', () => {
    const state = setup(), root = state.fixture.nativeElement as HTMLElement;
    const labels = () => [...root.querySelectorAll<HTMLButtonElement>('[aria-label="Charted Data"] button')].map(button => button.textContent?.trim());
    expect(root.querySelector('[id="measure:utility-heading"] strong')?.textContent).toBe('Charted Data');
    expect(labels()).toEqual(['Energy', 'Consumption / water', 'Cost', 'Bill charge']);
    state.component.selectMeasure('location-emissions'); state.component.selectMeasure('market-emissions');
    expect(state.request).not.toHaveBeenCalled();
    const snapshot = state.store.snapshot()!;
    state.store.publish({ ...snapshot, account: { ...snapshot.account, displayEmissions: true } }); state.fixture.detectChanges();
    expect(labels()).toEqual(['Energy', 'Consumption / water', 'Cost', 'Location emissions', 'Market emissions', 'Bill charge']);
    const market = [...root.querySelectorAll<HTMLButtonElement>('[aria-label="Charted Data"] button')].find(button => button.textContent?.trim() === 'Market emissions')!;
    market.click();
    expect(state.request).toHaveBeenCalledWith({ kind: 'measure', sourceId: 'utility', measure: 'market-emissions' });
    state.request.mockClear();
    state.store.publish({ ...snapshot, account: { ...snapshot.account, displayEmissions: false } }); state.fixture.detectChanges();
    expect(labels()).toEqual(['Energy', 'Consumption / water', 'Cost', 'Bill charge']);
    expect(state.component.selectedSource()?.measure).toBe('energy'); expect(state.request).not.toHaveBeenCalled();
  });
  it('retains an incomplete charge draft visibly when its meter is no longer included', () => {
    const original = utilityVisualizationFixture();
    const definition: VisualizationDefinition = { ...original, series: [], sources: original.sources.map(source => {
      if (source.kind !== 'utility') return source;
      const { selection: _selection, ...base } = source;
      return { ...base, measure: 'charge', settings: {} };
    }) };
    const state = setup(definition);
    state.component.settingsForm.controls.chargeMeter.setValue('meter-a');
    state.update({ definition: { ...definition, facilitySelection: { kind: 'fixed', facilityGuids: ['missing-facility'] } } });
    const meterControl = (state.fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('select[formcontrolname="chargeMeter"]')!;
    expect(state.component.settingsForm.controls.chargeMeter.value).toBe('meter-a');
    expect(meterControl.value).toBe('meter-a');
    expect(meterControl.selectedOptions[0].textContent).toContain('Unavailable meter');
    expect(meterControl.selectedOptions[0].disabled).toBe(true); expect(state.component.issue()).toBeDefined();
  });
  it('shows the three primary selection methods and requests changes without changing the current selection', () => {
    const state = setup();
    const root = state.fixture.nativeElement as HTMLElement;
    const choices = root.querySelectorAll<HTMLButtonElement>('[aria-label="Meter selection method"] button');
    expect([...choices].map(choice => choice.textContent?.trim())).toEqual(['Source', 'Meter group', 'Individual meters']);
    choices[0].click(); state.fixture.detectChanges();
    expect(state.request).toHaveBeenCalledWith({ kind: 'selection-mode', sourceId: 'utility', mode: 'source' });
    expect(state.component.selectedSource()?.selectionMode).toBe('meter');
  });
  it('keeps a checkbox selected while its removal waits for parent review', () => {
    const state = setup(), root = state.fixture.nativeElement as HTMLElement;
    const remove = root.querySelector<HTMLButtonElement>('app-visualization-resource-picker .resource-picker__option[aria-checked="true"]')!;
    remove.click(); state.fixture.detectChanges();
    expect(state.request).toHaveBeenCalledWith({ kind: 'toggle-resource', sourceId: 'utility', resourceId: 'meter-a', selected: false });
    expect(state.component.selected.value).toEqual(['meter-a']);
    expect(remove.getAttribute('aria-checked')).toBe('true');
  });
  it.each([
    { mode: 'source', label: 'Sources' }, { mode: 'group', label: 'Meter groups' },
    { mode: 'meter', label: 'Meters' }, { mode: 'facility', label: 'Facilities' }
  ] as const)('names the resource section $label when selecting by $mode', ({ mode, label }) => {
    const original = utilityVisualizationFixture(), source = original.sources[0] as UtilityVisualizationSource;
    const state = setup({ ...original, sources: [{ ...source, selectionMode: mode }] });
    const root = state.fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[id="resources:utility-heading"] strong')?.textContent).toBe(label);
    expect(root.querySelector('.resource-picker__options button')?.textContent?.trim()).toBe('Include All');
  });
  it('requests Include All as one resource-selection change', () => {
    const state = setup(), root = state.fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('.resource-picker__all')!.click(); state.fixture.detectChanges();
    expect(state.request).toHaveBeenCalledExactlyOnceWith({ kind: 'set-resources', sourceId: 'utility', resourceIds: ['meter-a', 'meter-b'] });
    expect(state.component.selected.value).toEqual(['meter-a']);
  });
  it('preserves a saved filtered selection without exposing filter controls or publishing changes', () => {
    const original = utilityVisualizationFixture(), source = original.sources[0] as UtilityVisualizationSource;
    const definition: VisualizationDefinition = { ...original, sources: [{ ...source, selectionMode: 'rule', selection: { kind: 'rule', resource: 'meter', filter: {
      facilityGuids: ['facility-a'], groupGuids: ['group-a'], utilitySources: ['Electricity'], search: 'Main', includeRetired: false } } }] };
    const state = setup(definition), root = state.fixture.nativeElement as HTMLElement;
    expect(state.request).not.toHaveBeenCalled();
    expect(state.component.selectedSource()).toEqual(definition.sources[0]);
    expect(root.textContent).not.toMatch(/matching rule|matching selection|output grouping|retired meter history/i);
    expect(root.querySelector('input[type="search"]')).toBeNull();
    expect(root.textContent).toContain('Choose how to select meters first.');
  });
  it('retains incomplete unit input through selection changes and resets only the explicitly affected node', () => {
    const state = setup();
    state.component.settingsForm.controls.unit.setValue(''); state.fixture.detectChanges();
    expect(state.component.issue()).toContain('chart units');
    const original = utilityVisualizationFixture(), source = original.sources[0] as UtilityVisualizationSource;
    state.update({ definition: { ...original, sources: [{ ...source, selection: { kind: 'fixed', resource: 'meter', guids: [] } }] } });
    expect(state.component.settingsForm.controls.useDefaultUnits.value).toBe(false); expect(state.component.issue()).toBeDefined();
    state.update({ nodeResetKeys: { [decisionNodeId({ kind: 'data-settings', sourceId: 'utility' })]: 1 } });
    expect(state.component.settingsForm.controls.useDefaultUnits.value).toBe(false);
    // A reset replaces raw input from the current coherent definition rather than another section's draft.
    expect(state.component.settingsForm.controls.unit.value).toBe('kWh'); expect(state.component.issue()).toBeUndefined();
  });
  it('keeps incomplete Energy input visible until explicitly adopting an external Cost measure', () => {
    const state = setup(), root = state.fixture.nativeElement as HTMLElement;
    const unit = root.querySelector<HTMLInputElement>('input[formcontrolname="unit"]')!;
    unit.value = ''; unit.dispatchEvent(new Event('input')); state.fixture.detectChanges();
    const original = utilityVisualizationFixture(), source = original.sources[0] as UtilityVisualizationSource;
    const incoming: VisualizationDefinition = { ...original, sources: [{ ...source, measure: 'cost', settings: {} }] };
    state.update({ definition: incoming });
    expect(state.component.conflict()).toBe(true); expect(state.component.issue()).toContain('chart units');
    expect(state.component.settingsForm.invalid).toBe(true); expect(state.invalid).toHaveBeenLastCalledWith('data-settings:utility', true);
    expect(root.querySelector<HTMLInputElement>('input[formcontrolname="unit"]')?.value).toBe('');
    expect(root.textContent).toContain('saved charted data changed to Cost');
    expect([...root.querySelectorAll('button')].some(button => button.textContent?.trim() === 'Keep local input')).toBe(false);
    // A later publication cannot turn this unresolved previous-measure draft into valid Cost input.
    state.update({ definition: { ...incoming, name: 'Updated elsewhere' } });
    state.component.keepLocal();
    expect(state.component.conflict()).toBe(true); expect(state.request).not.toHaveBeenCalled();
    const useSaved = [...root.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === 'Use saved settings')!;
    useSaved.click(); state.fixture.detectChanges();
    expect(state.component.conflict()).toBe(false); expect(state.component.issue()).toBeUndefined();
    expect(root.querySelector('input[formcontrolname="unit"]')).toBeNull(); expect(root.textContent).toContain('Cost uses the recorded currency');
    expect(state.invalid).toHaveBeenLastCalledWith('data-settings:utility', false); expect(state.request).not.toHaveBeenCalled();
  });
  it('allows corrected local units to be explicitly kept after a same-measure external change', () => {
    const state = setup(), original = utilityVisualizationFixture(), source = original.sources[0] as UtilityVisualizationSource;
    state.component.settingsForm.controls.unit.setValue('');
    state.update({ definition: { ...original, sources: [{ ...source, settings: { ...source.settings, unit: { kind: 'pinned', value: 'Btu' } } }] } });
    state.component.settingsForm.controls.unit.setValue('MWh'); state.fixture.detectChanges();
    expect(state.component.conflict()).toBe(true); expect(state.request).not.toHaveBeenCalled();
    const keepLocal = [...(state.fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.trim() === 'Keep local input')!;
    keepLocal.click(); state.fixture.detectChanges();
    expect(state.component.conflict()).toBe(false);
    expect(state.request).toHaveBeenCalledWith(expect.objectContaining({ kind: 'source-settings', sourceId: 'utility',
      settings: expect.objectContaining({ settings: expect.objectContaining({ unit: { kind: 'pinned', value: 'MWh' } }) }) }));
  });
  it('hides the native-data choice for multiple selected meters and respects read-only controls', () => {
    const original = utilityVisualizationFixture(), source = original.sources[0] as UtilityVisualizationSource;
    const state = setup({ ...original, sources: [{ ...source, selection: { kind: 'fixed', resource: 'meter', guids: ['meter-a', 'meter-b'] } }] });
    expect(state.component.calendarizationChoiceVisible()).toBe(false);
    state.update({ disabled: true });
    const mode = state.fixture.nativeElement.querySelector('[aria-label="Meter selection method"] button') as HTMLButtonElement;
    expect(mode.disabled).toBe(true); mode.click(); expect(state.request).not.toHaveBeenCalled();
  });
});
