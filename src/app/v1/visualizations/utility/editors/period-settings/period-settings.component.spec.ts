import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { UtilityEditorsModule } from '../utility-editors.module';
import { applyPeriodForm, periodFormIssue, periodFormValue, PeriodSettingsComponent } from './period-settings.component';

describe('utility period editing', () => {
  afterEach(() => TestBed.resetTestingModule());
  it.each([
    { kind: 'fixed' as const, start: '2023-02-29', end: '2024-01-01' },
    { kind: 'fixed' as const, start: '2024-12-01', end: '2024-01-01' },
    { kind: 'rolling' as const, count: 0 }, { kind: 'rolling' as const, count: 1.5 },
    { kind: 'fiscal-year' as const, year: null }, { comparison: 'custom' as const, comparisonStart: '', comparisonEnd: '' }
  ])('retains malformed draft %j without publishing it as valid intent', replacement => {
    const definition = utilityVisualizationFixture(), value = { ...periodFormValue(definition), ...replacement };
    expect(periodFormIssue(value)).toBeDefined(); expect(applyPeriodForm(definition, value)).toBe(definition);
  });

  it('preserves rolling anchor, fiscal treatment and incomplete-period intent', () => {
    const definition = utilityVisualizationFixture();
    const next = applyPeriodForm(definition, { ...periodFormValue(definition), kind: 'rolling', count: 3, unit: 'year', anchor: 'calendar',
      basis: 'fiscal', includeIncomplete: false, comparison: 'previous-year', comparisonBasis: 'fiscal' });
    expect(next.period).toEqual({ kind: 'rolling', count: 3, unit: 'year', anchor: 'calendar', basis: 'fiscal', includeIncomplete: false });
    expect(next.comparison).toEqual({ kind: 'previous-year', basis: 'fiscal' });
    expect(next.sources).toEqual(definition.sources);
  });

  it('retains invalid dates across external period changes until the user chooses saved or local settings', () => {
    TestBed.configureTestingModule({ imports: [UtilityEditorsModule] });
    const fixture = TestBed.createComponent(PeriodSettingsComponent), changed = vi.fn(), validityChanged = vi.fn();
    const context = { definition: utilityVisualizationFixture(), disabled: false, editorKey: 'chart-a', changed, validityChanged };
    fixture.componentRef.setInput('context', context); fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.controls.kind.setValue('fixed'); component.form.controls.start.setValue('2024-02-29');
    const incoming = { ...context.definition, name: 'Changed elsewhere', period: { kind: 'fiscal-year' as const, year: 2025 } };
    fixture.componentRef.setInput('context', { ...context, definition: incoming }); fixture.detectChanges();
    expect(component.conflict()).toBe(true); expect(component.form.controls.start.value).toBe('2024-02-29');
    expect(component.form.controls.kind.value).toBe('fixed'); expect(validityChanged).toHaveBeenLastCalledWith(true);
    component.form.controls.end.setValue('2024-03-31');
    expect(component.form.valid).toBe(true); expect(changed).not.toHaveBeenCalled();
    component.keepLocal();
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ name: 'Changed elsewhere', period: { kind: 'fixed', start: '2024-02-29', end: '2024-03-31', basis: 'calendar' } }));
    expect(component.conflict()).toBe(false);
    changed.mockClear(); component.form.controls.end.setValue('');
    fixture.componentRef.setInput('context', { ...context, definition: { ...incoming, period: { kind: 'fiscal-year', year: 2026 } } }); fixture.detectChanges();
    expect(component.conflict()).toBe(true); component.useSaved();
    expect(component.form.controls.kind.value).toBe('fiscal-year'); expect(component.form.controls.year.value).toBe(2026);
    expect(component.conflict()).toBe(false); expect(validityChanged).toHaveBeenLastCalledWith(false);
    expect(changed).not.toHaveBeenCalled();
  });

  it('protects invalid local dates through unrelated acknowledgement and replaces them on identity change', () => {
    TestBed.configureTestingModule({ imports: [UtilityEditorsModule] });
    const fixture = TestBed.createComponent(PeriodSettingsComponent), changed = vi.fn(), validityChanged = vi.fn();
    const context = { definition: utilityVisualizationFixture(), disabled: false, editorKey: 'chart-a', changed, validityChanged };
    fixture.componentRef.setInput('context', context); fixture.detectChanges();
    fixture.componentInstance.form.controls.kind.setValue('fixed');
    expect(validityChanged).toHaveBeenLastCalledWith(true); expect(changed).not.toHaveBeenCalled();
    fixture.componentInstance.form.controls.start.setValue('2024-02-29');
    fixture.componentRef.setInput('context', { ...context, definition: { ...context.definition, name: 'Changed metadata' } }); fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.start.value).toBe('2024-02-29');
    fixture.componentInstance.form.controls.end.setValue('2024-03-31');
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ name: 'Changed metadata', period: { kind: 'fixed', start: '2024-02-29', end: '2024-03-31', basis: 'calendar' } }));
    fixture.componentRef.setInput('context', { ...context, editorKey: 'chart-b' }); fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.kind.value).toBe('all-history');
  });
});
