import { compositionFixture, equipmentCompositionEvidence } from '@domain/visualizations/testing/composition-fixtures';
import { compositionOption } from './composition-options';
import { compositionPercent, prepareComposition } from './composition.models';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';

describe('composition presentation', () => {
  it.each(['treemap', 'sunburst'] as const)('uses identical %s leaf totals and preserves source details, zero and missing values', kind => {
    const { snapshot, definition } = compositionFixture({ kind, hierarchy: ['group', 'equipment'], values: 'percent' });
    const evidence = equipmentCompositionEvidence(snapshot, definition), model = prepareComposition(definition, [evidence]);
    const root = model.nodes.find(node => !node.parentId)!;
    expect(root.amount).toBeCloseTo(10.01); expect(root.description).toContain('known values only');
    expect(model.nodes.find(node => node.label === 'Small positive share')!.description).toContain('<1%');
    expect(model.details.rows).toHaveLength(4); expect(model.details.rows.flat().join(' ')).toContain('FY 2024');
    expect((compositionOption(model).series as any[])[0]).toMatchObject({ type: kind, nodeClick: false });
    expect((compositionOption(model).series as any[])[0].data[0].children).toHaveLength(2);
  });
  it('keeps full-scope denominators stable when selected items are hidden and keeps their original details', () => {
    const { snapshot, definition } = compositionFixture({ kind: 'breakdown', type: 'donut', values: 'percent' });
    const evidence = equipmentCompositionEvidence(snapshot, definition);
    const full = prepareComposition(definition, [evidence]);
    const hidden: VisualizationDefinition = { ...definition, series: definition.series.map(series => ({ ...series, overrides: [{ resourceGuid: 'equipment-a', visible: false }] })) };
    const model = prepareComposition(hidden, [evidence]);
    expect(model.nodes.find(node => node.label === 'Small positive share')!.percentage).toBe(full.nodes.find(node => node.label === 'Small positive share')!.percentage);
    expect(model.nodes.find(node => node.label === 'Small positive share')!.description).toContain('100% of selected');
    expect(model.details.rows).toHaveLength(4);
    expect((compositionOption(model).series as any[])[0].data).toHaveLength(1);
    expect(compositionPercent(0)).toBe('0%'); expect(compositionPercent(.0001)).toBe('<1%');
  });
  it('honors saved item order in hierarchies without changing the original occurrence evidence', () => {
    const { snapshot, definition } = compositionFixture();
    const ordered: VisualizationDefinition = { ...definition, series: definition.series.map(series => ({ ...series, overrides: [{ resourceGuid: 'small', order: 0 }] })) };
    const evidence = equipmentCompositionEvidence(snapshot, ordered), before = structuredClone(evidence);
    const model = prepareComposition(ordered, [evidence]);
    expect(model.nodes.filter(node => node.parentId).map(node => node.label).slice(0, 2)).toEqual(['Small positive share', 'Pump']);
    expect(evidence).toEqual(before);
  });
});
