import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { PredictorEditorsModule } from '../predictor-editors.module';
import { PredictorPickerComponent } from './predictor-picker.component';

describe('predictor picker', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('searches source context and emits exact selections, including empty histories', () => {
    TestBed.configureTestingModule({ imports: [PredictorEditorsModule] });
    const fixture = TestBed.createComponent(PredictorPickerComponent), selected = vi.fn();
    fixture.componentRef.setInput('choices', [
      { value: 'production', label: 'Production', detail: 'Plant A · Standard · widgets', icon: 'predictor', available: true },
      { value: 'weather', label: 'Temperature', detail: 'Plant B · Weather · °F · Station B', icon: 'predictor', available: true }
    ]);
    fixture.componentInstance.selectionRequested.subscribe(selected); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    fixture.componentInstance.search.setValue('station b'); fixture.detectChanges();
    expect(root.querySelectorAll('button')).toHaveLength(1);
    root.querySelector<HTMLButtonElement>('button')!.click(); expect(selected).toHaveBeenCalledExactlyOnceWith('weather');
    fixture.componentRef.setInput('disabled', true); fixture.detectChanges();
    expect(root.querySelector<HTMLButtonElement>('button')!.disabled).toBe(true);
  });
});
