import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AnalysisUsageService } from '../analysis-usage.service';
import { AnalysisUsedByComponent } from './analysis-used-by.component';

describe('AnalysisUsedByComponent', () => {
  it('renders a linked card to the consuming workbench', () => {
    TestBed.configureTestingModule({ imports: [AnalysisUsedByComponent], providers: [provideRouter([]),
      { provide: AnalysisUsageService, useValue: { view: signal({ consumers: [{ key: 'report:r', name: 'Savings report',
        detail: 'Analysis report', icon: 'report', route: ['/report', 'r'] }] }), editor: signal(undefined), confirmDiscard: signal(false), close: () => {} } }
    ] });
    const fixture = TestBed.createComponent(AnalysisUsedByComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a')?.getAttribute('href')).toBe('/report/r');
    expect(fixture.nativeElement.querySelector('a')?.textContent).toContain('Savings report');
  });
});
