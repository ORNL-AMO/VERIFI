import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { AnalysisColumnPickerComponent } from './analysis-column-picker.component';

describe('shared analysis column picker presentation', () => {
  it('keeps Apply and Cancel separate and disables Apply while the caller cannot edit', async () => {
    await TestBed.configureTestingModule({ imports: [AnalysisColumnPickerComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalysisColumnPickerComponent);
    const control = new FormControl(false, { nonNullable: true });
    fixture.componentRef.setInput('sections', [{ id: 'consumption', label: 'Consumption columns', options: [{ id: 'actual', label: 'Actual use', control }] }]);
    const closed = vi.fn(), applied = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    fixture.componentInstance.applied.subscribe(applied);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLInputElement>('input')!.click();
    expect(control.value).toBe(true); expect(applied).not.toHaveBeenCalled();
    const apply = [...root.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Apply')!;
    const cancel = [...root.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Cancel')!;
    cancel.click(); expect(closed).toHaveBeenCalledOnce(); expect(applied).not.toHaveBeenCalled();
    apply.click(); expect(applied).toHaveBeenCalledOnce();
    fixture.componentRef.setInput('canEdit', false); fixture.detectChanges();
    expect(apply.disabled).toBe(true); expect(cancel.disabled).toBe(false);
  });
});
