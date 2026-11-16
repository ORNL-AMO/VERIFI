import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { equipmentDefinition, equipmentFixture, equipmentSnapshot } from '@domain/visualizations/testing/equipment-fixtures';
import { EquipmentEditorsModule } from '../equipment-editors.module';
import { EquipmentSourceEditorComponent } from './equipment-source-editor.component';
import { prepareDecisionChange, projectDecisionItems } from '../../decisions/decision-tree';
import { useEquipmentHistorySettings } from '@domain/visualizations/energy-use/equipment-source';

describe('equipment history editor', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('keeps the history toggle in Data settings, reviews enabling it, and preserves current settings when switched off', () => {
    const store = new AccountWorkspaceStore(); store.publish(equipmentSnapshot());
    TestBed.configureTestingModule({ imports: [EquipmentEditorsModule], providers: [{ provide: AccountWorkspaceStore, useValue: store }] });
    const fixture = TestBed.createComponent(EquipmentSourceEditorComponent), request = vi.fn();
    const annual = equipmentDefinition(), definition: VisualizationDefinition = { ...annual, chart: { kind: 'time-series', defaultTraceType: 'line', interval: 'monthly', stack: 'none' } };
    const context = { definition, sourceId: 'source-1', editorKey: 'saved', disabled: false, changed: vi.fn(), request, expandedNodes: new Set(['data-settings:source-1']) };
    fixture.componentRef.setInput('context', context); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement, toggle = root.querySelector<HTMLInputElement>('[role="switch"]')!;
    expect(root.querySelector('#data-settings\\:source-1-body')?.contains(toggle)).toBe(true);
    expect([...root.querySelectorAll('button')].some(button => button.textContent?.trim() === 'Use equipment history settings')).toBe(false);
    expect(toggle.checked).toBe(false); expect(request).not.toHaveBeenCalled();
    toggle.click(); fixture.detectChanges();
    expect(request).toHaveBeenCalledExactlyOnceWith({ kind: 'equipment-defaults', sourceId: 'source-1' });
    expect(toggle.checked).toBe(false);
    fixture.componentRef.setInput('context', { ...context }); fixture.detectChanges();
    expect(toggle.checked).toBe(false); // Canceled or still awaiting review.
    const accepted = useEquipmentHistorySettings(definition, 'source-1');
    fixture.componentRef.setInput('context', { ...context, definition: accepted }); fixture.detectChanges();
    expect(toggle.checked).toBe(true);
    request.mockClear(); toggle.click(); fixture.detectChanges();
    expect(toggle.checked).toBe(false); expect(request).not.toHaveBeenCalled(); expect(context.changed).not.toHaveBeenCalled();
    fixture.componentRef.setInput('context', { ...context, definition: { ...accepted, name: 'Renamed chart' } }); fixture.detectChanges();
    expect(toggle.checked).toBe(false);
    fixture.componentRef.setInput('context', { ...context, definition: accepted, editorKey: 'reopened' }); fixture.detectChanges();
    expect(toggle.checked).toBe(true);
    fixture.componentRef.setInput('context', { ...context, definition: accepted, disabled: true }); fixture.detectChanges();
    expect(toggle.disabled).toBe(true); toggle.click(); expect(request).not.toHaveBeenCalled();
  });
  it('hydrates without edits, emits typed selection/unit changes, and retains missing selections for repair', () => {
    const store = new AccountWorkspaceStore(); store.publish(equipmentSnapshot([equipmentFixture(), equipmentFixture({ guid: 'other', name: 'Other equipment', utilityData: [], noLongerInUse: { isNoLongerInUse: true, year: 2023 } })]));
    TestBed.configureTestingModule({ imports: [EquipmentEditorsModule], providers: [{ provide: AccountWorkspaceStore, useValue: store }] });
    const fixture = TestBed.createComponent(EquipmentSourceEditorComponent), requested = vi.fn(), definition = equipmentDefinition();
    const context = { definition, sourceId: 'source-1', disabled: false, editorKey: 'saved', expandedNodes: new Set(['selection-mode:source-1', 'resources:source-1', 'data-settings:source-1']), changed: () => {}, request: requested };
    fixture.componentRef.setInput('context', context); fixture.detectChanges();
    expect(requested).not.toHaveBeenCalled();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Retired'); expect(root.textContent).toContain('No saved consumption');
    const other = [...root.querySelectorAll<HTMLButtonElement>('.resource-picker__option')].find(button => button.textContent?.includes('Other equipment'))!;
    other.click();
    expect(requested).toHaveBeenLastCalledWith({ kind: 'energy-use-resources', sourceId: 'source-1', ids: ['equipment-a', 'other'] });
    fixture.componentInstance.unit.setValue('MJ');
    expect(requested).toHaveBeenLastCalledWith({ kind: 'equipment-unit', sourceId: 'source-1', unit: { kind: 'pinned', value: 'MJ' } });
    store.publish(equipmentSnapshot([])); fixture.detectChanges();
    expect(root.textContent).toContain('Unavailable: equipment-a');
    fixture.componentRef.setInput('context', { ...context, disabled: true }); fixture.detectChanges();
    const count = requested.mock.calls.length; fixture.componentInstance.setSelection([]); fixture.componentInstance.useDefaults();
    expect(requested).toHaveBeenCalledTimes(count);
  });
  it('retains sibling presentation and reviews customized removal without silently changing settings', () => {
    const snapshot = equipmentSnapshot([equipmentFixture(), equipmentFixture({ guid: 'other' })]);
    let definition: VisualizationDefinition = equipmentDefinition();
    const apply = (action: Parameters<typeof prepareDecisionChange>[1]) => {
      const result = prepareDecisionChange(definition, action, { snapshot });
      if (result.state !== 'unchanged') definition = result.definition;
      return result;
    };
    apply({ kind: 'item-style', sourceId: 'source-1', item: { resourceGuid: 'equipment-a' }, changes: { color: '#123456', traceType: 'bar', axis: 'right' } });
    apply({ kind: 'equipment-selection', sourceId: 'source-1', equipmentGuids: ['equipment-a', 'other'] });
    const items = projectDecisionItems(definition, 'source-1', snapshot);
    expect(items[0].appearance).toMatchObject({ color: '#123456', traceType: 'bar', axis: 'right' });
    expect(items[1].appearance).toMatchObject({ traceType: 'line', axis: 'left' });
    expect(apply({ kind: 'equipment-selection', sourceId: 'source-1', equipmentGuids: ['other'] }).state).toBe('confirm');
    expect(projectDecisionItems(definition, 'source-1', snapshot)).toHaveLength(1);
    expect(prepareDecisionChange(definition, { kind: 'equipment-selection', sourceId: 'source-1', equipmentGuids: ['foreign'] }, { snapshot }).state).toBe('unchanged');
  });
});
