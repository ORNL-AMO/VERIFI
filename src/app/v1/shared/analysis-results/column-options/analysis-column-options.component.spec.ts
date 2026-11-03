import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { AnalysisColumnOptionsComponent } from './analysis-column-options.component';

describe('shared analysis column options', () => {
  it('edits caller-owned controls inline and delegates bulk/reset actions', async () => {
    await TestBed.configureTestingModule({ imports: [AnalysisColumnOptionsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalysisColumnOptionsComponent);
    const control = new FormControl(false, { nonNullable: true });
    fixture.componentRef.setInput('sections', [{ id: 'use', label: 'Consumption', options: [{ id: 'actual', label: 'Actual use', control }] }]);
    fixture.componentRef.setInput('inline', true); fixture.componentRef.setInput('sectionActions', true);
    const bulk = vi.fn(), defaults = vi.fn();
    fixture.componentInstance.sectionVisibilityRequested.subscribe(bulk);
    fixture.componentInstance.defaultsRequested.subscribe(defaults);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLInputElement>('input')!.click(); expect(control.value).toBe(true);
    root.querySelector<HTMLButtonElement>('[aria-label="Clear Consumption"]')!.click();
    expect(bulk).toHaveBeenCalledExactlyOnceWith({ id: 'use', visible: false });
    [...root.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Use Defaults')!.click();
    expect(defaults).toHaveBeenCalledOnce(); expect(root.querySelector('[role=dialog]')).toBeNull();
    fixture.componentRef.setInput('canEdit', false); fixture.detectChanges();
    expect([...root.querySelectorAll('button')].every(button => button.disabled)).toBe(true);
  });
});
