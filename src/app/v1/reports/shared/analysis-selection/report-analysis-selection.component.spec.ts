import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { ReportsSharedModule } from '@app/v1/reports/shared/reports-shared.module';
import { reportAnalysisSelectionCard } from './report-analysis-selection.models';
import { ReportAnalysisSelectionComponent } from './report-analysis-selection.component';

function setup() {
  TestBed.configureTestingModule({ imports: [ReportsSharedModule] });
  const fixture = TestBed.createComponent(ReportAnalysisSelectionComponent), control = new FormControl<string | null>('energy');
  const cards = [
    reportAnalysisSelectionCard('energy', { name: 'Energy analysis', analysisCategory: 'energy', baselineYear: 2022 }, 'ready', 'ready'),
    reportAnalysisSelectionCard('water', { name: 'Water analysis', analysisCategory: 'water', baselineYear: 2023 }, 'warning', 'ready')
  ];
  fixture.componentRef.setInput('cards', cards); fixture.componentRef.setInput('selectionControl', control);
  fixture.componentRef.setInput('selectedValue', 'energy'); fixture.componentRef.setInput('resetKey', 'report-a');
  fixture.componentRef.setInput('idPrefix', 'test-report'); fixture.componentRef.setInput('showTypeFilter', true);
  fixture.detectChanges();
  return { fixture, control, cards, component: fixture.componentInstance, root: fixture.nativeElement as HTMLElement };
}

describe('shared report analysis selection', () => {
  it.each([false, true])('keeps a single accessible analysis heading and working filters with section presentation: %s', sectioned => {
    const { fixture, component, control, root } = setup();
    fixture.componentRef.setInput('sectioned', sectioned); fixture.detectChanges();
    expect(root.querySelectorAll('#test-report-analysis-title')).toHaveLength(1);
    expect(root.querySelector('section')!.classList.contains('report-setup-section')).toBe(sectioned);
    expect(root.querySelector('.setup-section-heading') !== null).toBe(sectioned);
    expect(root.querySelector('[role=radiogroup]')!.getAttribute('aria-labelledby')).toBe('test-report-analysis-title');
    if (sectioned) {
      expect(root.querySelector('.report-analysis-filters')!.closest('.report-setup-body')).not.toBeNull();
      expect(root.querySelector('fieldset')!.closest('.report-setup-body')).not.toBeNull();
    }
    component.form.controls.category.setValue('water'); fixture.detectChanges();
    expect(root.querySelectorAll('input[type=radio]')).toHaveLength(1);
    expect(control.value).toBe('energy');
  });
  it('allows reports without inspection or data checks to supply their own empty-state guidance', () => {
    const { fixture, root } = setup();
    fixture.componentRef.setInput('showInspection', false); fixture.detectChanges();
    expect(root.querySelector('button[title="Inspect analysis"]')).toBeNull();
    fixture.componentRef.setInput('cards', []);
    fixture.componentRef.setInput('emptyMessage', 'Choose manual source data or create an analysis.'); fixture.detectChanges();
    expect(root.textContent).toContain('Choose manual source data or create an analysis.');
  });
  it('filters and clears browsing without changing the linked analysis', () => {
    const { fixture, control, component, root } = setup(), changed = vi.fn(); control.valueChanges.subscribe(changed);
    component.form.controls.category.setValue('water'); fixture.detectChanges();
    expect(component.filteredCards().map(card => card.value)).toEqual(['water']);
    expect(component.hiddenSelection()?.name).toBe('Energy analysis');
    expect(root.textContent).toContain('Hidden by the current filters');
    component.form.controls.baselineYear.setValue(2022); fixture.detectChanges();
    expect(root.textContent).toContain('No analyses match these filters');
    root.querySelector<HTMLButtonElement>('.report-analysis-filters button')!.click(); fixture.detectChanges();
    expect(component.filteredCards()).toHaveLength(2); expect(control.value).toBe('energy'); expect(changed).not.toHaveBeenCalled();
  });
  it('emits inspection separately from explicit radio selection and respects disabled editing', () => {
    const { fixture, control, component, root } = setup(), inspected = vi.fn(); component.inspected.subscribe(inspected);
    root.querySelector<HTMLButtonElement>('[aria-label="Inspect Water analysis"]')!.click();
    expect(inspected).toHaveBeenCalledWith('water'); expect(control.value).toBe('energy');
    expect(root.querySelector('[role=radiogroup]')?.getAttribute('aria-required')).toBe('true');
    expect(root.querySelector('h2')?.textContent).toContain('Analysis *');
    expect(root.querySelector<HTMLInputElement>('input[type=radio]')?.required).toBe(true);
    root.querySelectorAll<HTMLInputElement>('input[type=radio]')[1].click(); expect(control.value).toBe('water');
    fixture.componentRef.setInput('canEdit', false); fixture.detectChanges();
    expect(root.querySelector('fieldset')!.disabled).toBe(true);
  });
  it('resets filters for another report and ignores a category filter when that control becomes inapplicable', () => {
    const { fixture, component, cards } = setup();
    component.form.controls.category.setValue('water'); fixture.detectChanges();
    fixture.componentRef.setInput('cards', [cards[0]]); fixture.componentRef.setInput('showTypeFilter', false); fixture.detectChanges();
    expect(component.filteredCards().map(card => card.value)).toEqual(['energy']); expect(component.filtersActive()).toBe(false);
    component.form.controls.baselineYear.setValue(2023); fixture.detectChanges();
    fixture.componentRef.setInput('resetKey', 'report-b'); fixture.detectChanges();
    expect(component.form.getRawValue()).toEqual({ category: 'all', baselineYear: null });
  });
  it.each(['ready', 'evaluating', 'error'] as const)('projects current %s validation into the established status badge', evaluation => {
    const { fixture, root } = setup();
    fixture.componentRef.setInput('cards', [reportAnalysisSelectionCard('energy', { name: 'Energy analysis', analysisCategory: 'energy', baselineYear: 2022 }, 'warning', evaluation)]); fixture.detectChanges();
    const badge = root.querySelector('.report-analysis-card__status')!;
    expect(badge.textContent).toContain(evaluation === 'ready' ? 'Has warnings' : evaluation === 'error' ? 'Checks unavailable' : 'Checks pending');
    expect(badge.classList.contains(evaluation === 'ready' ? 'v1-chip--warning' : 'v1-chip--neutral')).toBe(true);
  });
});
