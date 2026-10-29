import { TestBed } from '@angular/core/testing';
import { AnalysisDetailsSlideoutComponent } from './analysis-details-slideout.component';

describe('AnalysisDetailsSlideoutComponent', () => {
  it('renders the shared analysis details and emits the full-analysis action', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [AnalysisDetailsSlideoutComponent]
    }).createComponent(AnalysisDetailsSlideoutComponent);
    fixture.componentRef.setInput('card', card());
    fixture.componentRef.setInput('meterGroups', []);
    fixture.componentRef.setInput('outcomeDisplay', {
      annual: { label: 'Latest full year · 2025', valueLabel: '8.75%' },
      monthly: { label: 'Latest month · Aug 2026', valueLabel: '7.90%' }
    });
    const opened: void[] = [];
    fixture.componentInstance.opened.subscribe(() => opened.push(undefined));

    fixture.detectChanges();
    const openButton = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Open full analysis'));
    openButton?.click();

    expect(fixture.nativeElement.textContent).toContain('Analysis groups and models');
    expect(fixture.nativeElement.textContent).toContain('Latest full year · 2025');
    expect(fixture.nativeElement.querySelector('.v1-workspace-slideout__footer')).toBeTruthy();
    expect(opened).toHaveLength(1);
    fixture.componentRef.setInput('secondaryActionLabel', 'Go To Analysis');
    fixture.componentRef.setInput('secondaryActionDisabled', true); fixture.detectChanges();
    const go = fixture.nativeElement.querySelector('footer .v1-btn--secondary') as HTMLButtonElement;
    expect(go.disabled).toBe(true);
    const navigated = vi.fn(); fixture.componentInstance.secondaryActionSelected.subscribe(navigated);
    fixture.componentRef.setInput('secondaryActionDisabled', false); fixture.detectChanges(); go.click();
    expect(navigated).toHaveBeenCalledOnce(); expect(opened).toHaveLength(1);
  });

  it('disables closing and navigation while the full analysis is opening', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [AnalysisDetailsSlideoutComponent]
    }).createComponent(AnalysisDetailsSlideoutComponent);
    fixture.componentRef.setInput('card', card());
    fixture.componentRef.setInput('meterGroups', []);
    fixture.componentRef.setInput('opening', true);

    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(Array.from(buttons).every(button => button.disabled)).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Opening…');
  });
});

function card() {
  return {
    analysis: {
      guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Electricity plan',
      analysisCategory: 'energy', energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal',
      baselineYear: 2022, groups: [], modifiedDate: new Date('2026-01-01')
    },
    category: 'energy', status: 'ready', statusLabel: 'Ready', findings: [], isActiveForReporting: false,
    linkedAccountAnalyses: [], linkedReports: [], bankingConsumers: [], dependencyCount: 0,
    modifiedDateLabel: 'Jan 1, 2026', modifiedSortValue: 1, searchText: 'electricity plan', attentionRank: 3
  } as any;
}
