import { TestBed } from '@angular/core/testing';
import { AnalysisBrowseCardComponent } from './analysis-browse-card.component';

describe('AnalysisBrowseCardComponent', () => {
  it('emits semantic card intents without owning persistence', async () => {
    await TestBed.configureTestingModule({ imports: [AnalysisBrowseCardComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalysisBrowseCardComponent);
    const component = fixture.componentInstance;
    const card = cardFixture();
    fixture.componentRef.setInput('card', card);
    const emitted: string[] = [];
    component.detailsRequested.subscribe(() => emitted.push('details'));
    component.comparisonToggled.subscribe(() => emitted.push('compare'));
    component.copyRequested.subscribe(() => emitted.push('copy'));
    component.activeRequested.subscribe(() => emitted.push('active'));
    component.deleteRequested.subscribe(() => emitted.push('delete'));

    ['details', 'compare', 'copy', 'active', 'delete'].forEach(id => component.selectAction(id));

    expect(emitted).toEqual(['details', 'compare', 'copy', 'active', 'delete']);
  });

  it('renders compact group and model details beneath the facts', async () => {
    await TestBed.configureTestingModule({ imports: [AnalysisBrowseCardComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalysisBrowseCardComponent);
    fixture.componentRef.setInput('card', cardFixture());
    fixture.componentRef.setInput('meterGroups', [{ guid: 'group-a', name: 'Electricity' }]);
    fixture.componentRef.setInput('showGroupDetails', true);
    fixture.detectChanges();

    const card = fixture.nativeElement as HTMLElement;
    const facts = card.querySelectorAll('.v1-resource-browse-card__fact-section');
    const roster = card.querySelector('app-facility-analysis-group-model-roster');
    expect(roster?.textContent).toContain('Groups and models');
    expect(roster?.textContent).toContain('Electricity');
    expect(roster?.textContent).toContain('Absolute consumption');
    expect(roster?.textContent).toContain('Modeled energy = baseline-period actual consumption');
    expect(facts[facts.length - 1].compareDocumentPosition(roster as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fixture.componentRef.setInput('showGroupDetails', false);
    fixture.detectChanges();
    expect(card.querySelector('app-facility-analysis-group-model-roster')).toBeNull();
  });

  it('disables incompatible comparison actions with an accessible explanation', async () => {
    await TestBed.configureTestingModule({ imports: [AnalysisBrowseCardComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AnalysisBrowseCardComponent);
    fixture.componentRef.setInput('card', cardFixture());
    fixture.componentRef.setInput('comparisonDisabledReason', 'Compare with another water analysis');
    fixture.detectChanges();

    expect(fixture.componentInstance.actions().find(action => action.id === 'compare')).toMatchObject({
      label: 'Compare with another water analysis',
      disabled: true
    });
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[aria-label="Compare with another water analysis"]');
    expect(button?.disabled).toBe(true);
  });
});

function cardFixture() {
  return {
    analysis: {
      guid: 'analysis-a', name: 'Energy analysis', analysisCategory: 'energy', baselineYear: 2022,
      energyIsSource: false, energyUnit: 'MMBtu',
      groups: [{ idbGroupId: 'group-a', analysisType: 'absoluteEnergyConsumption', predictorVariables: [] }]
    },
    category: 'energy', status: 'ready', statusLabel: 'Ready', findings: [], isActiveForReporting: false,
    linkedAccountAnalyses: [], linkedReports: [], bankingConsumers: [], dependencyCount: 0,
    modifiedDateLabel: 'Oct 8, 2026', modifiedSortValue: 0, searchText: '', attentionRank: 3,
    outcome: { state: 'ready', summary: {} },
    outcomeDisplay: {
      annual: {
        label: 'Latest full year · 2025', valueLabel: '5.18%', metaLabel: 'Total energy improvement',
        loading: false, unavailable: false
      },
      monthly: {
        label: 'Latest month · Feb 2026', valueLabel: '5.21%', metaLabel: 'Rolling 12-month improvement',
        loading: false, unavailable: false
      }
    }
  } as any;
}
