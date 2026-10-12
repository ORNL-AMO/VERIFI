import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountAnalysisResultsShellComponent } from './account-analysis-results-shell.component';

describe('AccountAnalysisResultsShellComponent', () => {
  it('provides an accessible child-route boundary for account results', () => {
    TestBed.configureTestingModule({
      imports: [AccountAnalysisResultsShellComponent],
      providers: [provideRouter([])]
    });
    const fixture = TestBed.createComponent(AccountAnalysisResultsShellComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('section')?.getAttribute('aria-label')).toBe('Account analysis results');
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });
});
