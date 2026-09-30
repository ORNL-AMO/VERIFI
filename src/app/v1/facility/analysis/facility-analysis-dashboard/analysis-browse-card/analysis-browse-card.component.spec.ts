import { AnalysisBrowseCardComponent } from './analysis-browse-card.component';

describe('AnalysisBrowseCardComponent', () => {
  it('emits semantic card intents without owning persistence', () => {
    const component = new AnalysisBrowseCardComponent();
    const card = { analysis: { guid: 'analysis-a' }, isActiveForReporting: false } as any;
    component.card = card;
    const emitted: string[] = [];
    component.detailsRequested.subscribe(() => emitted.push('details'));
    component.comparisonToggled.subscribe(() => emitted.push('compare'));
    component.copyRequested.subscribe(() => emitted.push('copy'));
    component.activeRequested.subscribe(() => emitted.push('active'));
    component.deleteRequested.subscribe(() => emitted.push('delete'));

    ['details', 'compare', 'copy', 'active', 'delete'].forEach(id => component.selectAction(id));

    expect(emitted).toEqual(['details', 'compare', 'copy', 'active', 'delete']);
  });
});
