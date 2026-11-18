import { TestBed } from '@angular/core/testing';
import { ExplorationModule } from '../exploration.module';
import { ExplorationSettingsComponent } from './exploration-settings.component';
import { explorationFixture } from '@domain/visualizations/testing/exploration-fixtures';

describe('exploration settings', () => {
  it('hydrates without writes and emits typed independent field edits', () => {
    TestBed.configureTestingModule({ imports: [ExplorationModule] });
    const fixture = TestBed.createComponent(ExplorationSettingsComponent), component = fixture.componentInstance;
    const definition = explorationFixture().definition, requested: unknown[] = [];
    component.requested.subscribe(value => requested.push(value));
    fixture.componentRef.setInput('definition', definition); fixture.detectChanges();
    expect(requested).toEqual([]);
    component.form.controls.view.setValue('matrix');
    expect(requested[0]).toMatchObject({ kind: 'correlation', view: 'matrix', statistic: 'r', scale: 'raw' });
    fixture.componentRef.setInput('definition', { ...definition, chart: requested[0] }); fixture.detectChanges();
    component.form.controls.grouping.setValue('year');
    expect(requested[1]).toMatchObject({ view: 'matrix', grouping: 'year' });
    expect(fixture.nativeElement.querySelectorAll('select:not(.v1-select)')).toHaveLength(0);
    fixture.destroy();
  });
  it('chooses diverging standardization explicitly and retains saved color scales on hydration', () => {
    TestBed.configureTestingModule({ imports: [ExplorationModule] });
    const fixture = TestBed.createComponent(ExplorationSettingsComponent), component = fixture.componentInstance, requested: unknown[] = [];
    component.requested.subscribe(value => requested.push(value));
    fixture.componentRef.setInput('definition', explorationFixture(3, { kind: 'heatmap', dimension: 'series-period', scale: 'linear' }).definition); fixture.detectChanges();
    component.form.controls.normalization.setValue('z-score');
    expect(requested[0]).toMatchObject({ normalization: 'z-score', scale: 'diverging' });
    fixture.componentRef.setInput('disabled', true); fixture.detectChanges();
    component.form.controls.normalization.setValue('raw');
    expect(requested).toHaveLength(1);
    fixture.destroy();
  });
  it('recognizes saved scatter selectors regardless of JSON object key order', () => {
    TestBed.configureTestingModule({ imports: [ExplorationModule] });
    const fixture = TestBed.createComponent(ExplorationSettingsComponent), component = fixture.componentInstance;
    fixture.componentRef.setInput('definition', explorationFixture(2, { kind: 'scatter', showFit: false, x: { resourceGuid: 'a', sourceId: 'utility' }, y: { sourceId: 'utility', resourceGuid: 'b' } }).definition);
    fixture.componentRef.setInput('items', ['a', 'b'].map(id => ({ sourceId: 'utility', identity: { resourceGuid: id }, label: id, selectedId: 's-' + id, appearance: { visible: true } })));
    fixture.detectChanges();
    expect(component.form.controls.x.value).toBe(component.choices()[0].key);
    expect(component.missingX()).toBe(false); expect(component.missingY()).toBe(false);
    fixture.destroy();
  });

});
