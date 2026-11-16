import { TestBed } from '@angular/core/testing';
import { LibraryLifecycle } from '../library/lifecycle/library-lifecycle.service';
import { configureLibraryTest } from '../library/testing/library-testing';
import { group } from '@app/v1/data/meters/facility-meters.testing';
import { UTILITY_RECIPES } from './visualization-recipes';

describe('visualization recipe presets', () => {
  it.each(UTILITY_RECIPES)('prefills $label without restricting the shared selection paths', preset => {
    const { workspace } = configureLibraryTest();
    workspace.publish({ ...workspace.snapshot()!, meterGroups: [group({ guid: 'future-group' })] });
    const lifecycle = TestBed.inject(LibraryLifecycle);
    lifecycle.openCreate(); lifecycle.continueFacilities(); lifecycle.selectRecipe(preset.id);
    expect(lifecycle.step()).toBe('selection-mode');
    expect(lifecycle.selectionModes.map(choice => choice.value)).toEqual(['source', 'group', 'meter']);
    lifecycle.selectMeterMode('group'); lifecycle.toggleResource('future-group');
    expect(lifecycle.canContinueResources()).toBe(true);
    expect(lifecycle.draftDefinition()).toMatchObject({ name: preset.label, chart: { defaultTraceType: 'line', interval: 'monthly' },
      sources: [{ kind: 'utility', measure: preset.measure, selectionMode: 'group', selection: { guids: ['future-group'] } }] });
    expect(lifecycle.resourceCards()[0].available).toBe(false);
  });
});
