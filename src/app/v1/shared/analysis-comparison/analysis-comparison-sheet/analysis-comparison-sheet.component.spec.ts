import { TestBed } from '@angular/core/testing';
import { AnalysisComparisonSheetComponent } from './analysis-comparison-sheet.component';

describe('Comparison sheet selectors', () => {
  it('uses typed selection changes, keeps unavailable categories out of the second selector, and preserves labels', () => {
    const fixture = TestBed.configureTestingModule({ imports: [AnalysisComparisonSheetComponent] }).createComponent(AnalysisComparisonSheetComponent);
    fixture.componentRef.setInput('options', [
      { key: 'a', label: 'Same name · Account analysis · Energy', scope: 'account', category: 'energy' },
      { key: 'b', label: 'Same name · Account analysis · Energy', scope: 'account', category: 'energy' },
      { key: 'f', label: 'Same name · Facility analysis · Plant', scope: 'facility', category: 'energy', facilityGuid: 'plant' }
    ]);
    fixture.componentRef.setInput('selection', { first: null, second: null }); fixture.detectChanges();
    const host = fixture.componentInstance; const changed = vi.fn(); host.selectionChanged.subscribe(changed);
    expect(fixture.nativeElement.querySelector('[formControlName="second"]').disabled).toBe(true);
    host.form.controls.first.setValue('a'); expect(changed).toHaveBeenCalledWith({ first: 'a', second: null });
    fixture.componentRef.setInput('selection', { first: 'a', second: null }); fixture.detectChanges();
    const second = fixture.nativeElement.querySelector('[formControlName="second"]') as HTMLSelectElement;
    expect(Array.from(second.options).map(option => option.textContent)).toEqual(['Choose an analysis', 'Same name · Account analysis · Energy']);
    expect(fixture.nativeElement.textContent).toContain('Choose Analysis 2');
    host.form.controls.second.setValue('b'); expect(changed).toHaveBeenLastCalledWith({ first: 'a', second: 'b' });
    fixture.componentRef.setInput('selection', { first: 'f', second: null }); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No compatible second analysis');
  });
});
