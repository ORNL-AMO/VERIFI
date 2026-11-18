import { TestBed } from '@angular/core/testing';
import { ExplorationModule } from '../exploration.module';
import { PairPanelComponent } from './pair-panel.component';
import { explorationFixture } from '@domain/visualizations/testing/exploration-fixtures';
import { prepareExploration } from '@domain/visualizations/visualization-exploration';

describe('pair panel', () => {
  it('exposes signed correlation and fit units, and retains zoom through appearance edits', async () => {
    TestBed.configureTestingModule({ imports: [ExplorationModule] });
    TestBed.overrideComponent(PairPanelComponent, { set: { template: '<p>{{ summary() }}</p><p>{{ equation() }}</p>' } });
    const input = explorationFixture(), model = await prepareExploration(input.definition, [input.evidence], new AbortController().signal);
    const fixture = TestBed.createComponent(PairPanelComponent), component = fixture.componentInstance;
    fixture.componentRef.setInput('model', model); fixture.componentRef.setInput('pair', { ...model.pairs[1], x: { ...model.pairs[1].x, label: 'HDD', unit: 'days' },
      y: { ...model.pairs[1].y, label: 'Natural Gas', unit: 'MMBtu' } }); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('r = -1');
    expect(component.summary()).toBe('r = -1 · R² = 1');
    expect(component.equation()).toBe('Natural Gas (MMBtu) = -1 × HDD (days) + 5');
    expect(fixture.nativeElement.textContent).not.toMatch(/Original units|Excluded|n =/);
    const unitless = { ...model.pairs[1], x: { ...model.pairs[1].x, unit: '' }, y: { ...model.pairs[1].y, unit: '' } };
    fixture.componentRef.setInput('pair', unitless); fixture.detectChanges();
    expect(component.equation()).toBe('C = -1 × A + 5');
    component.updateZoom({ start: 20, end: 80 });
    fixture.componentRef.setInput('model', { ...model, title: 'Renamed' }); fixture.detectChanges();
    expect(component.zoom()).toEqual({ start: 20, end: 80 });
    fixture.destroy();
  });
});
