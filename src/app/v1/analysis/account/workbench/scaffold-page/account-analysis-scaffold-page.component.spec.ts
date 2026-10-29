import { TestBed } from '@angular/core/testing';
import { AccountAnalysisScaffoldPageComponent } from './account-analysis-scaffold-page.component';

describe('AccountAnalysisScaffoldPageComponent', () => {
  it('labels the final route boundary and clearly identifies deferred parity content', () => {
    const fixture = TestBed.createComponent(AccountAnalysisScaffoldPageComponent);
    fixture.componentRef.setInput('headingId', 'annual-heading');
    fixture.componentRef.setInput('title', 'Annual');
    fixture.componentRef.setInput('icon', 'calendar');
    fixture.componentRef.setInput('description', 'Annual tables and charts will be migrated next.');
    fixture.detectChanges();

    const section: HTMLElement = fixture.nativeElement.querySelector('section');
    expect(section.getAttribute('aria-labelledby')).toBe('annual-heading');
    expect(section.querySelector('h2')?.textContent).toContain('Annual');
    expect(section.querySelector('[role="status"]')?.textContent).toContain('Annual tables and charts will be migrated next.');
  });
});
