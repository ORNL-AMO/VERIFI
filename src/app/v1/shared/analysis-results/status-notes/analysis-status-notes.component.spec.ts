import { TestBed } from '@angular/core/testing';
import { StatusItem } from '@app/v1/status/status.models';
import { AnalysisStatusNotesComponent } from './analysis-status-notes.component';

const finding: StatusItem = {
  id: 'finding-a', code: 'analysis.configuration.invalid', severity: 'error', category: 'readiness',
  entity: { name: 'Analysis A', kind: 'facility-analysis', guid: 'analysis-a', accountGuid: 'account-a', facilityGuid: 'facility-a' },
  evidence: {}, title: 'Complete analysis setup', description: 'Choose a baseline year.', todo: true,
  destination: { kind: 'facility-analysis', facilityGuid: 'facility-a', analysisGuid: 'analysis-a', scope: 'analysis', tab: 'setup' }
};

describe('AnalysisStatusNotesComponent', () => {
  it('renders severity, copy, and an accessible typed Review action only for available destinations', () => {
    TestBed.configureTestingModule({ imports: [AnalysisStatusNotesComponent] });
    const fixture = TestBed.createComponent(AnalysisStatusNotesComponent);
    const reviewed = vi.fn();
    fixture.componentInstance.reviewed.subscribe(reviewed);
    fixture.componentRef.setInput('findings', [finding, {
      ...finding, id: 'finding-b', severity: 'warning', title: 'Review inputs', destination: { kind: 'unavailable' }
    }]);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('li')).toHaveLength(2);
    expect(host.querySelector('ul')?.getAttribute('tabindex')).toBe('0');
    expect(host.querySelectorAll('.analysis-status-note--error')).toHaveLength(1);
    expect(host.textContent).toContain('Complete analysis setup');
    expect(host.textContent).toContain('Choose a baseline year.');
    const buttons = host.querySelectorAll<HTMLButtonElement>('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].getAttribute('aria-label')).toBe('Review: Complete analysis setup');
    buttons[0].click();
    expect(reviewed).toHaveBeenCalledWith(finding);
    fixture.componentRef.setInput('findings', []);
    fixture.detectChanges();
    expect(host.querySelector('ul')).toBeNull();
  });
});
