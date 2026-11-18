import { analysisDefinition } from '@domain/visualizations/testing/analysis-fixtures';
import { equipmentDefinition } from '@domain/visualizations/testing/equipment-fixtures';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { PeriodSettingsModule } from './period-settings.module';
import { PeriodSettingsComponent } from './period-settings.component';
import { applyPeriodForm, periodFormIssue, periodFormValue } from './period-settings.models';

describe('shared visualization period editing', () => {
  it('explicitly removes an unsupported Analysis comparison even when all history is already selected', () => {
    TestBed.configureTestingModule({ imports: [PeriodSettingsModule] });
    const fixture = TestBed.createComponent(PeriodSettingsComponent), changed = vi.fn();
    fixture.componentRef.setInput('context', { definition: { ...analysisDefinition(), comparison: { kind: 'previous-period' } }, disabled: false, changed }); fixture.detectChanges();
    expect(changed).not.toHaveBeenCalled();
    const button = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(button => button.textContent?.includes('Use all history'))!;
    button.click();
    expect(changed).toHaveBeenCalledExactlyOnceWith({ period: { kind: 'all-history' }, comparison: { kind: 'none' } });
  });

  it('offers only annual equipment periods and protects incomplete pinned years through saved changes', () => {
    TestBed.configureTestingModule({ imports: [PeriodSettingsModule] });
    const fixture = TestBed.createComponent(PeriodSettingsComponent), changed = vi.fn(), validityChanged = vi.fn();
    const context = { definition: equipmentDefinition(), disabled: false, editorKey: 'equipment', changed, validityChanged };
    fixture.componentRef.setInput('context', context); fixture.detectChanges();
    const component = fixture.componentInstance, root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[aria-label="Comparison"]')).toBeNull();
    expect([...root.querySelectorAll('[aria-label="Saved period"] button')].map(button => button.textContent?.trim())).toEqual(['All history', 'Pinned fiscal year', 'Latest fiscal year']);
    expect(changed).not.toHaveBeenCalled(); component.selectChoice(component.form.controls.kind, 'fiscal-year');
    expect(validityChanged).toHaveBeenLastCalledWith(true); expect(changed).not.toHaveBeenCalled();
    component.form.controls.year.setValue(2028);
    expect(changed).toHaveBeenLastCalledWith({ period: { kind: 'fiscal-year', year: 2028 }, comparison: { kind: 'none' } });
    component.form.controls.year.setValue(null);
    fixture.componentRef.setInput('context', { ...context, definition: { ...context.definition, period: { kind: 'all-history' } } }); fixture.detectChanges();
    expect(component.conflict()).toBe(true); expect(component.form.controls.year.value).toBeNull();
    component.useSaved(); expect(component.form.controls.kind.value).toBe('all-history'); expect(validityChanged).toHaveBeenLastCalledWith(false);
  });

  it('changes utility date inputs to whole months on composition conversion and exposes the pinned fiscal year input', () => {
    TestBed.configureTestingModule({ imports: [PeriodSettingsModule] });
    const fixture = TestBed.createComponent(PeriodSettingsComponent), changed = vi.fn();
    const definition = { ...utilityVisualizationFixture(), period: { kind: 'fixed' as const, start: '2026-01-01', end: '2026-03-31', basis: 'calendar' as const } };
    const context = { definition, disabled: false, editorKey: 'utility', changed };
    fixture.componentRef.setInput('context', context); fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.start.value).toBe('2026-01');
    fixture.componentRef.setInput('context', { ...context, definition: { ...definition, chart: { kind: 'breakdown', type: 'donut', values: 'absolute' } } }); fixture.detectChanges();
    const component = fixture.componentInstance, root = fixture.nativeElement as HTMLElement;
    expect(component.form.controls.start.value).toBe('2026-01'); expect(component.issue()).toBeUndefined();
    expect(changed).not.toHaveBeenCalled();
    component.selectChoice(component.form.controls.kind, 'fiscal-year'); fixture.detectChanges();
    expect(root.querySelector('input[formcontrolname="year"]')).not.toBeNull();
    component.form.controls.year.setValue(2025);
    expect(changed).toHaveBeenLastCalledWith({ period: { kind: 'fiscal-year', year: 2025 }, comparison: { kind: 'none' } });
    fixture.destroy();
  });

  it.each(['monthly', 'yearly'] as const)('uses the %s Analysis policy for rendered inputs and comparisons', interval => {
    TestBed.configureTestingModule({ imports: [PeriodSettingsModule] });
    const fixture = TestBed.createComponent(PeriodSettingsComponent), changed = vi.fn();
    const definition = analysisDefinition(interval === 'yearly' ? 'annual-improvement' : 'actual');
    fixture.componentRef.setInput('context', { definition, disabled: false, changed }); fixture.detectChanges();
    const component = fixture.componentInstance, root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[aria-label="Comparison"]')).toBeNull();
    expect(root.querySelector('[aria-label="Calendar basis"]')).toBeNull();
    component.selectChoice(component.form.controls.kind, interval === 'yearly' ? 'fiscal-year' : 'fixed'); fixture.detectChanges();
    expect(root.querySelectorAll('input[type="month"]')).toHaveLength(interval === 'monthly' ? 2 : 0);
    expect(root.querySelector('input[formcontrolname="year"]') !== null).toBe(interval === 'yearly');
    expect(root.querySelector('input[type="date"]')).toBeNull();
    expect(changed).not.toHaveBeenCalled();
  });

  afterEach(() => TestBed.resetTestingModule());
  it('uses inclusive month inputs for predictors, preserves partial-month saved intent on hydration, and retains invalid input', () => {
    TestBed.configureTestingModule({ imports: [PeriodSettingsModule] });
    const fixture = TestBed.createComponent(PeriodSettingsComponent), changed = vi.fn(), validityChanged = vi.fn();
    const definition = { ...createVisualizationDefinition('Predictor', 'account-a', { kind: 'all' }, 'predictor'),
      period: { kind: 'fixed' as const, start: '2024-01-15', end: '2024-03-10', basis: 'calendar' as const } };
    fixture.componentRef.setInput('context', { definition, changed, validityChanged, disabled: false, editorKey: 'predictor' }); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement, component = fixture.componentInstance;
    expect(root.querySelectorAll('input[type="month"]')).toHaveLength(2);
    expect(root.querySelector('input[type="date"]')).toBeNull();
    expect(root.querySelector('input[formcontrolname="includeIncomplete"]')).toBeNull();
    expect(changed).not.toHaveBeenCalled();
    component.form.controls.start.setValue('2024-02');
    expect(changed).toHaveBeenLastCalledWith({ period: { kind: 'fixed', start: '2024-02-01', end: '2024-03-31', basis: 'calendar' }, comparison: { kind: 'none' } });
    component.form.controls.end.setValue(''); expect(validityChanged).toHaveBeenLastCalledWith(true);
    expect(component.form.controls.end.value).toBe('');
    component.selectChoice(component.form.controls.kind, 'rolling');
    expect(changed).toHaveBeenLastCalledWith({ period: { kind: 'rolling', count: 12, unit: 'month', anchor: 'latest-data', basis: 'calendar', includeIncomplete: false }, comparison: { kind: 'none' } });
  });
  it.each([
    { kind: 'fixed' as const, start: '2023-02-29', end: '2024-01-01' },
    { kind: 'fixed' as const, start: '2024-12-01', end: '2024-01-01' },
    { kind: 'rolling' as const, count: 0 }, { kind: 'rolling' as const, count: 1.5 },
    { kind: 'fiscal-year' as const, year: null }
  ])('retains malformed draft %j without publishing it as valid intent', replacement => {
    const definition = utilityVisualizationFixture(), value = { ...periodFormValue(definition), ...replacement };
    expect(periodFormIssue(value)).toBeDefined(); expect(applyPeriodForm(definition, value)).toBe(definition);
  });

  it('preserves rolling anchor, fiscal treatment and incomplete-period intent', () => {
    const definition = utilityVisualizationFixture();
    const next = applyPeriodForm(definition, { ...periodFormValue(definition), kind: 'rolling', count: 3, unit: 'year', anchor: 'calendar',
      basis: 'fiscal', includeIncomplete: false });
    expect(next.period).toEqual({ kind: 'rolling', count: 3, unit: 'year', anchor: 'calendar', basis: 'fiscal', includeIncomplete: false });
    expect(next.comparison).toEqual({ kind: 'none' });
    expect(next.sources).toEqual(definition.sources);
  });

  it('retains invalid dates across external period changes until the user chooses saved or local settings', () => {
    TestBed.configureTestingModule({ imports: [PeriodSettingsModule] });
    const fixture = TestBed.createComponent(PeriodSettingsComponent), changed = vi.fn(), validityChanged = vi.fn();
    const context = { definition: utilityVisualizationFixture(), disabled: false, editorKey: 'chart-a', changed, validityChanged };
    fixture.componentRef.setInput('context', context); fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.controls.kind.setValue('fixed'); component.form.controls.start.setValue('2024-02');
    const incoming = { ...context.definition, name: 'Changed elsewhere', period: { kind: 'fiscal-year' as const, year: 2025 } };
    fixture.componentRef.setInput('context', { ...context, definition: incoming }); fixture.detectChanges();
    expect(component.conflict()).toBe(true); expect(component.form.controls.start.value).toBe('2024-02');
    expect(component.form.controls.kind.value).toBe('fixed'); expect(validityChanged).toHaveBeenLastCalledWith(true);
    component.form.controls.end.setValue('2024-03');
    expect(component.form.valid).toBe(true); expect(changed).not.toHaveBeenCalled();
    component.keepLocal();
    expect(changed).toHaveBeenCalledWith({ period: { kind: 'fixed', start: '2024-02-01', end: '2024-03-31', basis: 'calendar' }, comparison: { kind: 'none' } });
    expect(component.conflict()).toBe(false);
    changed.mockClear(); component.form.controls.end.setValue('');
    fixture.componentRef.setInput('context', { ...context, definition: { ...incoming, period: { kind: 'fiscal-year', year: 2026 } } }); fixture.detectChanges();
    expect(component.conflict()).toBe(true); component.useSaved();
    expect(component.form.controls.kind.value).toBe('fiscal-year'); expect(component.form.controls.year.value).toBe(2026);
    expect(component.conflict()).toBe(false); expect(validityChanged).toHaveBeenLastCalledWith(false);
    expect(changed).not.toHaveBeenCalled();
  });

  it('protects invalid local dates through unrelated acknowledgement and replaces them on identity change', () => {
    TestBed.configureTestingModule({ imports: [PeriodSettingsModule] });
    const fixture = TestBed.createComponent(PeriodSettingsComponent), changed = vi.fn(), validityChanged = vi.fn();
    const context = { definition: utilityVisualizationFixture(), disabled: false, editorKey: 'chart-a', changed, validityChanged };
    fixture.componentRef.setInput('context', context); fixture.detectChanges();
    fixture.componentInstance.form.controls.kind.setValue('fixed');
    expect(validityChanged).toHaveBeenLastCalledWith(true); expect(changed).not.toHaveBeenCalled();
    fixture.componentInstance.form.controls.start.setValue('2024-02');
    fixture.componentRef.setInput('context', { ...context, definition: { ...context.definition, name: 'Changed metadata' } }); fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.start.value).toBe('2024-02');
    fixture.componentInstance.form.controls.end.setValue('2024-03');
    expect(changed).toHaveBeenCalledWith({ period: { kind: 'fixed', start: '2024-02-01', end: '2024-03-31', basis: 'calendar' }, comparison: { kind: 'none' } });
    fixture.componentRef.setInput('context', { ...context, editorKey: 'chart-b' }); fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.kind.value).toBe('all-history');
  });
  it('retains incomplete independent dates through an external retarget and reviews the local choice', () => {
    TestBed.configureTestingModule({ imports: [PeriodSettingsModule] });
    const fixture = TestBed.createComponent(PeriodSettingsComponent), changed = vi.fn(), validityChanged = vi.fn();
    const context = { definition: utilityVisualizationFixture(), disabled: false, editorKey: 'chart-a', changed, validityChanged };
    fixture.componentRef.setInput('context', context); fixture.detectChanges();
    const component = fixture.componentInstance, root = fixture.nativeElement as HTMLElement;
    component.form.controls.kind.setValue('fixed'); component.form.controls.start.setValue('2026-03');
    const incoming = { ...context.definition, facilitySelection: { kind: 'fixed' as const, facilityGuids: ['facility-b'] } };
    fixture.componentRef.setInput('context', { ...context, definition: incoming }); fixture.detectChanges();
    expect(component.form.controls.kind.value).toBe('fixed'); expect(root.querySelector<HTMLInputElement>('input[formcontrolname="start"]')?.value).toBe('2026-03');
    expect(component.form.controls.end.value).toBe(''); expect(component.conflict()).toBe(true); expect(component.issue()).toBeDefined();
    expect(validityChanged).toHaveBeenLastCalledWith(true); expect(changed).not.toHaveBeenCalled();
    component.form.controls.end.setValue('2026-03'); fixture.detectChanges();
    expect(changed).not.toHaveBeenCalled();
    const keepLocal = [...root.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === 'Keep local input')!;
    keepLocal.click(); fixture.detectChanges();
    expect(changed).toHaveBeenCalledExactlyOnceWith({ period: { kind: 'fixed', start: '2026-03-01', end: '2026-03-31', basis: 'calendar' }, comparison: { kind: 'none' } });
    expect(component.conflict()).toBe(false); expect(validityChanged).toHaveBeenLastCalledWith(false);
  });
  it('honors an explicit reviewed period reset during a same-identity ownership change', () => {
    TestBed.configureTestingModule({ imports: [PeriodSettingsModule] });
    const fixture = TestBed.createComponent(PeriodSettingsComponent), changed = vi.fn(), validityChanged = vi.fn();
    const context = { definition: utilityVisualizationFixture(), disabled: false, editorKey: 'chart-a', resetKey: 0, changed, validityChanged };
    fixture.componentRef.setInput('context', context); fixture.detectChanges();
    fixture.componentInstance.form.controls.kind.setValue('fixed'); fixture.componentInstance.form.controls.start.setValue('2026-03');
    fixture.componentRef.setInput('context', { ...context, resetKey: 1,
      definition: { ...context.definition, facilitySelection: { kind: 'fixed' as const, facilityGuids: ['facility-b'] } } }); fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.kind.value).toBe('all-history'); expect(fixture.componentInstance.conflict()).toBe(false);
    expect(fixture.componentInstance.issue()).toBeUndefined(); expect(validityChanged).toHaveBeenLastCalledWith(false); expect(changed).not.toHaveBeenCalled();
  });
  it('publishes month-based period choices without comparison controls through typed controls without duplicate saves', () => {
    TestBed.configureTestingModule({ imports: [PeriodSettingsModule] });
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
      kind: 'rolling', count: 12, unit: 'month', anchor: 'latest-data', basis: 'calendar', includeIncomplete: false
    } }));
    const count = changed.mock.calls.length;
    choose('Saved period', 'Rolling period'); expect(changed).toHaveBeenCalledTimes(count);
    choose('Period unit', 'Years'); choose('Anchor', 'Last completed month');
    expect(root.querySelector('[aria-label="Comparison"]')).toBeNull();
    expect(root.querySelector('input[type=date]')).toBeNull();
    expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({
      period: { kind: 'rolling', count: 12, unit: 'year', anchor: 'calendar', basis: 'calendar', includeIncomplete: false },
      comparison: { kind: 'none' }
    }));
    fixture.componentRef.setInput('context', { ...context, disabled: true }); fixture.detectChanges();
    const beforeDisabledClick = changed.mock.calls.length;
    expect([...root.querySelectorAll<HTMLButtonElement>('[role="group"] button')].every(button => button.disabled)).toBe(true);
    choose('Saved period', 'All history');
    expect(changed).toHaveBeenCalledTimes(beforeDisabledClick);
  });

});
