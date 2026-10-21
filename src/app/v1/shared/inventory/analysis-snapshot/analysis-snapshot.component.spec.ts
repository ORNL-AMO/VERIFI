import { TestBed } from '@angular/core/testing';
import { AnalysisSnapshotComponent } from './analysis-snapshot.component';
import { InventoryAnalysisSnapshot } from '../inventory.models';

describe('analysis inventory snapshot', () => {
  it('replaces the account roster with selection progress and details access while retaining attention findings', () => {
    TestBed.configureTestingModule({ imports: [AnalysisSnapshotComponent] });
    const fixture = TestBed.createComponent(AnalysisSnapshotComponent);
    const view: InventoryAnalysisSnapshot = {
      scope: 'account', active: false, outcomes: [], facts: [{ label: 'Baseline', value: '2022' }, { label: 'Energy basis', value: 'Source energy' }],
      selectionProgress: { valid: 2, total: 3, evaluation: 'ready' }, rosterTitle: 'Group Details',
      roster: [{ id: 'hidden', name: 'Limited facility roster', detail: 'Not needed on account cards', state: '' }],
      findings: [{ id: 'setup', title: 'Complete account analysis setup', description: 'Review facility selections.', severity: 'error' }], modified: 'Oct 21, 2026'
    };
    fixture.componentRef.setInput('snapshot', view); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('2 / 3');
    expect(root.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('2');
    expect(parseFloat(root.querySelector<HTMLElement>('.analysis-snapshot__progress span')!.style.width)).toBeCloseTo(2 / 3 * 100);
    expect(root.querySelector('.inventory-attention')).toBeNull();
    const requested = vi.fn(); fixture.componentInstance.detailsRequested.subscribe(requested);
    root.querySelector<HTMLButtonElement>('.analysis-snapshot__selections button')!.click(); expect(requested).toHaveBeenCalledOnce();
    fixture.componentRef.setInput('detailed', true); fixture.detectChanges();
    expect(root.querySelector('.analysis-snapshot__roster')).toBeNull(); expect(root.textContent).not.toContain('Limited facility roster');
    expect(root.querySelector('.inventory-attention [data-severity="error"]')?.textContent).toContain('Review facility selections.');
    for (const evaluation of ['evaluating', 'error'] as const) {
      fixture.componentRef.setInput('snapshot', { ...view, selectionProgress: { ...view.selectionProgress!, evaluation } }); fixture.detectChanges();
      expect(root.querySelector('[role="progressbar"]')).toBeNull(); expect(root.textContent).toContain(evaluation === 'error' ? 'Checks unavailable' : 'Checks pending');
    }
    fixture.componentRef.setInput('snapshot', { ...view, selectionProgress: { valid: 0, total: 0, evaluation: 'ready' } }); fixture.detectChanges();
    expect(root.querySelector('[role="progressbar"]')).toBeNull(); expect(root.textContent).toContain('No facilities');
    fixture.componentRef.setInput('print', true); fixture.detectChanges(); expect(root.querySelector('button')).toBeNull();
  });
  it('adds bounded rosters, usage, and findings only in Detailed and exposes full details access', () => {
    TestBed.configureTestingModule({ imports: [AnalysisSnapshotComponent] });
    const fixture = TestBed.createComponent(AnalysisSnapshotComponent);
    const view: InventoryAnalysisSnapshot = {
      scope: 'facility', active: true, outcomes: [{ label: 'Latest full year · 2025', value: '0%', description: 'Total energy improvement', unavailable: false }],
      facts: [{ label: 'Baseline', value: '2022' }], rosterTitle: 'Group Details',
      roster: Array.from({ length: 5 }, (_, i) => ({ id: String(i), name: `Plant ${i}`, detail: `Model ${i}`, state: 'Included' })),
      usage: 'Changes can affect 2 reports.', findings: ['First warning', 'Second warning', 'Third warning'].map((title, i) => ({ id: String(i), title, description: 'Setup needs review.', severity: 'warning' })), modified: 'Oct 20, 2026'
    };
    fixture.componentRef.setInput('snapshot', view); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('0%'); expect(fixture.nativeElement.textContent).not.toContain('Plant 0');
    fixture.componentRef.setInput('detailed', true); fixture.detectChanges();
    const root = fixture.nativeElement;
    expect(root.querySelectorAll('.analysis-snapshot__row')).toHaveLength(3); expect(root.textContent).toContain('2 more entries');
    expect(root.textContent).not.toContain('Plant 3'); expect(root.textContent).not.toContain('Basis and units');
    expect(root.textContent).toContain('Used By'); expect(root.textContent).toContain('Changes can affect 2 reports.'); expect(root.querySelector('.analysis-snapshot__usage app-ui-icon')?.getAttribute('name')).toBe('link'); expect(root.textContent).toContain('Needs attention'); expect(root.querySelectorAll('.inventory-attention li')).toHaveLength(2); expect(root.textContent).not.toContain('Third warning');
    const requested = vi.fn(); fixture.componentInstance.detailsRequested.subscribe(requested); expect(root.querySelector('button app-ui-icon')?.getAttribute('name')).toBe('monocle'); root.querySelector('button').click();
    expect(requested).toHaveBeenCalledOnce();
    fixture.componentRef.setInput('snapshot', { ...view, usage: undefined }); fixture.detectChanges(); expect(root.textContent).toContain('Not used by other analyses or reports.');
    fixture.componentRef.setInput('print', true); fixture.detectChanges(); expect(root.querySelector('button')).toBeNull();
  });
});
