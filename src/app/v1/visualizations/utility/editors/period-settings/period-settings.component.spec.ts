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
    expect(changed).toHaveBeenCalledWith({ period: { kind: 'fixed', start: '2024-02-29', end: '2024-03-31', basis: 'calendar' }, comparison: { kind: 'none' } });
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
    expect(changed).toHaveBeenCalledWith({ period: { kind: 'fixed', start: '2024-02-29', end: '2024-03-31', basis: 'calendar' }, comparison: { kind: 'none' } });
    fixture.componentRef.setInput('context', { ...context, editorKey: 'chart-b' }); fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.kind.value).toBe('all-history');
  });
  it('retains incomplete independent dates through an external retarget and reviews the local choice', () => {
    TestBed.configureTestingModule({ imports: [UtilityEditorsModule] });
    const fixture = TestBed.createComponent(PeriodSettingsComponent), changed = vi.fn(), validityChanged = vi.fn();
    const context = { definition: utilityVisualizationFixture(), disabled: false, editorKey: 'chart-a', changed, validityChanged };
    fixture.componentRef.setInput('context', context); fixture.detectChanges();
    const component = fixture.componentInstance, root = fixture.nativeElement as HTMLElement;
    component.form.controls.kind.setValue('fixed'); component.form.controls.start.setValue('2026-03-01');
    const incoming = { ...context.definition, facilitySelection: { kind: 'fixed' as const, facilityGuids: ['facility-b'] } };
    fixture.componentRef.setInput('context', { ...context, definition: incoming }); fixture.detectChanges();
    expect(component.form.controls.kind.value).toBe('fixed'); expect(root.querySelector<HTMLInputElement>('input[formcontrolname="start"]')?.value).toBe('2026-03-01');
    expect(component.form.controls.end.value).toBe(''); expect(component.conflict()).toBe(true); expect(component.issue()).toBeDefined();
    expect(validityChanged).toHaveBeenLastCalledWith(true); expect(changed).not.toHaveBeenCalled();
    component.form.controls.end.setValue('2026-03-31'); fixture.detectChanges();
    expect(changed).not.toHaveBeenCalled();
    const keepLocal = [...root.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === 'Keep local input')!;
    keepLocal.click(); fixture.detectChanges();
    expect(changed).toHaveBeenCalledExactlyOnceWith({ period: { kind: 'fixed', start: '2026-03-01', end: '2026-03-31', basis: 'calendar' }, comparison: { kind: 'none' } });
    expect(component.conflict()).toBe(false); expect(validityChanged).toHaveBeenLastCalledWith(false);
  });
  it('honors an explicit reviewed period reset during a same-identity ownership change', () => {
    TestBed.configureTestingModule({ imports: [UtilityEditorsModule] });
    const fixture = TestBed.createComponent(PeriodSettingsComponent), changed = vi.fn(), validityChanged = vi.fn();
    const context = { definition: utilityVisualizationFixture(), disabled: false, editorKey: 'chart-a', resetKey: 0, changed, validityChanged };
    fixture.componentRef.setInput('context', context); fixture.detectChanges();
    fixture.componentInstance.form.controls.kind.setValue('fixed'); fixture.componentInstance.form.controls.start.setValue('2026-03-01');
    fixture.componentRef.setInput('context', { ...context, resetKey: 1,
      definition: { ...context.definition, facilitySelection: { kind: 'fixed' as const, facilityGuids: ['facility-b'] } } }); fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.kind.value).toBe('all-history'); expect(fixture.componentInstance.conflict()).toBe(false);
    expect(fixture.componentInstance.issue()).toBeUndefined(); expect(validityChanged).toHaveBeenLastCalledWith(false); expect(changed).not.toHaveBeenCalled();
  });
  it('publishes compact period and comparison choices through typed controls without duplicate saves', () => {
    TestBed.configureTestingModule({ imports: [UtilityEditorsModule] });
    const fixture = TestBed.createComponent(PeriodSettingsComponent), changed = vi.fn();
    const context = { definition: utilityVisualizationFixture(), disabled: false, editorKey: 'chart-a', changed };
    fixture.componentRef.setInput('context', context); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const choose = (group: string, label: string) => {
      const button = [...root.querySelectorAll<HTMLButtonElement>(`[role="group"][aria-label="${group}"] button`)]
        .find(candidate => candidate.textContent?.trim() === label)!;
      expect(button).toBeDefined(); button.click(); fixture.detectChanges(); return button;
    };
    expect(changed).not.toHaveBeenCalled();
    const rolling = choose('Saved period', 'Rolling period');
    expect(rolling.getAttribute('aria-pressed')).toBe('true');
    expect(fixture.componentInstance.form.controls.kind.dirty).toBe(true);
    expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ period: {
      kind: 'rolling', count: 12, unit: 'month', anchor: 'latest-data', basis: 'calendar', includeIncomplete: true
    } }));
    const count = changed.mock.calls.length;
    choose('Saved period', 'Rolling period'); expect(changed).toHaveBeenCalledTimes(count);
    choose('Calendar basis', 'Owner’s fiscal calendar'); choose('Period unit', 'Years'); choose('Anchor', 'Current date');
    choose('Comparison', 'Previous year'); choose('Comparison calendar', 'Owner’s fiscal year');
    expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({
      period: { kind: 'rolling', count: 12, unit: 'year', anchor: 'calendar', basis: 'fiscal', includeIncomplete: true },
      comparison: { kind: 'previous-year', basis: 'fiscal' }
    }));
    fixture.componentRef.setInput('context', { ...context, disabled: true }); fixture.detectChanges();
    const beforeDisabledClick = changed.mock.calls.length;
    expect([...root.querySelectorAll<HTMLButtonElement>('[role="group"] button')].every(button => button.disabled)).toBe(true);
    choose('Saved period', 'All history');
    expect(changed).toHaveBeenCalledTimes(beforeDisabledClick);
  });

});
