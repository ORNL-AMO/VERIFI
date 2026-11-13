import { TestBed } from '@angular/core/testing';
import { VisualizationSnapshotComponent } from './visualization-snapshot.component';

describe('visualization card metadata', () => {
  it('exposes scope and saved period, with source findings only at detailed level', () => {
    const fixture = TestBed.createComponent(VisualizationSnapshotComponent);
    fixture.componentRef.setInput('snapshot', { typeLabel: 'Utility', scopeLabel: 'Facility A', periodLabel: 'All saved history', chartLabel: 'Setup required', modified: 'Today', issues: ['Missing meter'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('All saved history');
    expect(fixture.nativeElement.textContent).toContain('Facility A');
    expect(fixture.nativeElement.textContent).not.toContain('Missing meter');
    fixture.componentRef.setInput('detailed', true); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Missing meter');
  });
});
