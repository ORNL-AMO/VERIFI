import { TestBed } from '@angular/core/testing';
import { AnalysisResultToolbarComponent } from './analysis-result-toolbar.component';

describe('analysis result toolbar', () => {
  it('renders the result description without a duplicate view selector', async () => {
    await TestBed.configureTestingModule({ imports: [AnalysisResultToolbarComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalysisResultToolbarComponent);
    fixture.componentRef.setInput('description', 'Result description');
    fixture.componentRef.setInput('ariaLabel', 'Result view');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Result description');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-analysis-results__toolbar')?.getAttribute('aria-label')).toBe('Result view');
  });
});
