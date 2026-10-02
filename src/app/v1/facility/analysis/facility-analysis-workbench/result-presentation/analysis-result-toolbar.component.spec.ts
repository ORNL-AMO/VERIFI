import { TestBed } from '@angular/core/testing';
import { AnalysisResultToolbarComponent } from './analysis-result-toolbar.component';

describe('analysis result toolbar', () => {
  it('emits the selected result view', async () => {
    await TestBed.configureTestingModule({ imports: [AnalysisResultToolbarComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalysisResultToolbarComponent);
    const changed = vi.fn();
    fixture.componentRef.setInput('description', 'Result description');
    fixture.componentRef.setInput('ariaLabel', 'Result view');
    fixture.componentRef.setInput('display', 'table');
    fixture.componentInstance.displayChanged.subscribe(changed);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    buttons[1].click();

    expect(changed).toHaveBeenCalledWith('graph');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
  });
});
