import { analysisDefinition } from '@domain/visualizations/testing/analysis-fixtures';
import { equipmentDefinition } from '@domain/visualizations/testing/equipment-fixtures';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { createVisualizationDefinition, type VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { equipmentPeriodIssue } from '@domain/visualizations/energy-use/equipment-source';
import { predictorPeriodIssue } from '@domain/visualizations/predictor/predictor-source';
import { applyPeriodForm, periodEditorPolicy, periodFormIssue, periodFormValue } from './period-settings.models';

const predictorDefinition = () => createVisualizationDefinition('Predictor', 'account-a', { kind: 'all' }, 'predictor');
function combine(first: VisualizationDefinition, second: VisualizationDefinition): VisualizationDefinition {
  return { ...first, sources: [...first.sources, ...second.sources.map(source => ({ ...source, id: `${source.id}-other` }))] };
}
const monthlyKinds = ['all-history', 'fixed', 'rolling'];
const annualKinds = ['all-history', 'fiscal-year', 'latest-saved-year'];

describe('visualization period editor policy', () => {
  it.each([
    { name: 'Utility', definition: utilityVisualizationFixture(), monthInput: false, ranges: true, comparison: true, kinds: [...monthlyKinds, 'fiscal-year', 'latest-saved-year'] },
    { name: 'Predictor', definition: predictorDefinition(), monthInput: true, ranges: true, comparison: false, kinds: monthlyKinds },
    { name: 'Utility/Predictor', definition: combine(utilityVisualizationFixture(), predictorDefinition()), monthInput: true, ranges: true, comparison: false, kinds: monthlyKinds },
    { name: 'Equipment', definition: equipmentDefinition(), monthInput: false, ranges: false, comparison: false, kinds: annualKinds },
    { name: 'monthly Analysis', definition: analysisDefinition(), monthInput: true, ranges: true, comparison: false, kinds: monthlyKinds },
    { name: 'yearly Analysis', definition: analysisDefinition('annual-improvement'), monthInput: false, ranges: false, comparison: false, kinds: annualKinds },
    { name: 'unsupported Predictor/Equipment', definition: combine(predictorDefinition(), equipmentDefinition()), monthInput: true, ranges: false, comparison: false, kinds: annualKinds },
    { name: 'unsupported Analysis/Equipment', definition: combine(analysisDefinition(), equipmentDefinition()), monthInput: true, ranges: false, comparison: false, kinds: annualKinds }
  ])('projects $name controls without changing the definition', ({ definition, monthInput, ranges, comparison, kinds }) => {
    const before = structuredClone(definition), policy = periodEditorPolicy(definition);
    expect(policy.monthInput).toBe(monthInput);
    expect(policy.controls).toMatchObject({ ranges, comparison, basis: ranges && !monthInput, fiscalYear: !monthInput || !ranges, incomplete: !monthInput });
    expect(policy.choices.map(choice => choice.kind)).toEqual(kinds);
    expect(definition).toEqual(before);
  });

  it.each([
    { definition: utilityVisualizationFixture(), defaults: {} },
    { definition: predictorDefinition(), defaults: { basis: 'calendar', includeIncomplete: false, comparison: 'none' } },
    { definition: analysisDefinition(), defaults: { basis: 'calendar', includeIncomplete: false, comparison: 'none' } },
    { definition: equipmentDefinition(), defaults: { basis: 'fiscal', comparison: 'none' } },
    { definition: analysisDefinition('annual-improvement'), defaults: { basis: 'fiscal', comparison: 'none' } },
    { definition: combine(predictorDefinition(), equipmentDefinition()), defaults: { basis: 'fiscal', comparison: 'none' } }
  ])('retains the existing explicit period-choice defaults for $definition.sources', ({ definition, defaults }) => {
    expect(periodEditorPolicy(definition).selectionDefaults).toEqual(defaults);
  });

  it.each([
    { definition: predictorDefinition(), kind: 'predictor', reset: { kind: 'all-history', basis: 'calendar', includeIncomplete: false, comparison: 'none' } },
    { definition: equipmentDefinition(), kind: 'equipment', reset: { kind: 'latest-saved-year', comparison: 'none' } },
    { definition: analysisDefinition(), kind: 'analysis', reset: { kind: 'all-history', basis: 'calendar', includeIncomplete: false, comparison: 'none' } },
    { definition: analysisDefinition('annual-improvement'), kind: 'analysis', reset: { kind: 'all-history', basis: 'fiscal', includeIncomplete: false, comparison: 'none' } }
  ])('offers an explicit $kind reset without applying it during projection', ({ definition, kind, reset }) => {
    const unsupported: VisualizationDefinition = { ...definition, comparison: { kind: 'previous-period' } }, before = structuredClone(unsupported);
    expect(periodEditorPolicy(unsupported).notices).toEqual([expect.objectContaining({ kind, reset })]);
    expect(unsupported).toEqual(before);
  });

  it('keeps distinct reset actions for an unsupported multi-source setup', () => {
    const definition = { ...combine(analysisDefinition(), equipmentDefinition()), comparison: { kind: 'previous-period' as const } };
    expect(periodEditorPolicy(definition).notices.map(notice => notice.kind)).toEqual(['analysis', 'equipment']);
  });

  it('retains partial Predictor bounds and separately reports Analysis whole-month requirements', () => {
    const period = { kind: 'fixed' as const, basis: 'calendar' as const, start: '2024-01-15', end: '2024-03-10' };
    const predictor = { ...predictorDefinition(), period }, analysis = { ...analysisDefinition(), period };
    expect(periodEditorPolicy(predictor)).toMatchObject({ retainedPartial: true, notices: [] });
    expect(periodEditorPolicy(analysis)).toMatchObject({ retainedPartial: true, notices: [expect.objectContaining({ kind: 'analysis' })] });
    expect(periodFormValue(predictor)).toMatchObject({ start: '2024-01', end: '2024-03' });
    expect(predictor.period).toEqual(period); expect(analysis.period).toEqual(period);
  });

  it.each(['0001-01', '2024-02', '9999-12'])('expands a valid %s month draft to its real civil boundaries', month => {
    const definition = predictorDefinition(), value = { ...periodFormValue(definition), kind: 'fixed' as const, start: month, end: month };
    expect(periodFormIssue(value, true)).toBeUndefined();
    const end = month === '2024-02' ? '2024-02-29' : `${month}-31`;
    expect(applyPeriodForm(definition, value).period).toEqual({ kind: 'fixed', basis: 'calendar', start: `${month}-01`, end });
  });

  it('shares source period checks without accepting comparisons or incomplete Predictor months', () => {
    const rolling = { kind: 'rolling' as const, count: 1, unit: 'month' as const, anchor: 'calendar' as const, basis: 'calendar' as const, includeIncomplete: true };
    const request = { period: rolling, comparison: { kind: 'none' as const } };
    expect(predictorPeriodIssue(request)).toBeDefined();
    expect(predictorPeriodIssue(request, false)).toBeUndefined();
    expect(predictorPeriodIssue({ ...request, comparison: { kind: 'previous-period' } }, false)).toBeDefined();
    expect(equipmentPeriodIssue(request)).toBeDefined();
    expect(equipmentPeriodIssue({ period: { kind: 'fiscal-year', year: 2024 }, comparison: { kind: 'none' } })).toBeUndefined();
  });
});
