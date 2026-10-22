import { TestBed } from '@angular/core/testing';
import { ReportSnapshotComponent } from './report-snapshot.component';

describe('ReportSnapshotComponent', () => {
  it('shows saved summary facts, then scope and a bounded findings preview in Detailed', async () => {
    await TestBed.configureTestingModule({ imports: [ReportSnapshotComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ReportSnapshotComponent);
    fixture.componentRef.setInput('snapshot', { scope: 'account', typeLabel: 'Analysis', modified: 'Oct 22, 2026', scopeLabel: 'Two saved facilities',
      facts: [{ label: 'Analysis', value: 'Annual analysis' }], findings: [1, 2, 3].map(id => ({ id: String(id), title: `Finding ${id}`, description: `Description ${id}`, severity: 'error' })) });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Annual analysis');
    expect(fixture.nativeElement.textContent).not.toContain('Two saved facilities');
    expect(fixture.nativeElement.textContent).not.toContain('Finding 1');
    fixture.componentRef.setInput('detailed', true); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Two saved facilities');
    expect(fixture.nativeElement.textContent).toContain('Finding 1');
    expect(fixture.nativeElement.textContent).not.toContain('Finding 3');
    expect(fixture.nativeElement.textContent).toContain('1 more setup findings');
  });
});
