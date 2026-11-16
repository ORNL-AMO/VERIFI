import { analysisPickerTestProvider } from '../../testing/analysis-picker.testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { analysisFixture, analysisDefinition } from '@domain/visualizations/testing/analysis-fixtures';
import { AnalysisEditorsModule } from '../analysis-editors.module';
import { AnalysisSourceEditorComponent } from './analysis-source-editor.component';
import { prepareDecisionChange } from '../../decisions/decision-tree';
import { projectAnalysisItems } from '../analysis-items';

describe('facility analysis source editing', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('emits typed bindings, measures and interval requests; hydration and disabled controls do not edit intent', () => {
    const workspace = new AccountWorkspaceStore(); workspace.publish(analysisFixture().snapshot);
    TestBed.configureTestingModule({ imports: [AnalysisEditorsModule], providers: [provideRouter([]), analysisPickerTestProvider(), { provide: AccountWorkspaceStore, useValue: workspace }] });
    const fixture = TestBed.createComponent(AnalysisSourceEditorComponent), requested = vi.fn(), definition = analysisDefinition();
    const context = { definition, sourceId: 'source-1', disabled: false, changed: () => {}, request: requested };
    fixture.componentRef.setInput('context', context); fixture.detectChanges();
    expect(requested).not.toHaveBeenCalled();
    const selects = fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
    (fixture.nativeElement.querySelector('select[formcontrolname=groupGuid]') as HTMLSelectElement).value = 'group-a'; fixture.nativeElement.querySelector('select[formcontrolname=groupGuid]').dispatchEvent(new Event('change'));
    expect(requested).toHaveBeenLastCalledWith({ kind: 'analysis-binding', sourceId: 'source-1', analysisGuid: 'analysis-a', groupGuid: 'group-a' });
    (fixture.nativeElement.querySelector('select[formcontrolname=measure]') as HTMLSelectElement).value = 'calculated'; fixture.nativeElement.querySelector('select[formcontrolname=measure]').dispatchEvent(new Event('change'));
    expect(requested).toHaveBeenLastCalledWith({ kind: 'analysis-measure', sourceId: 'source-1', measure: 'calculated' });
    (fixture.nativeElement.querySelector('select[formcontrolname=interval]') as HTMLSelectElement).value = 'yearly'; fixture.nativeElement.querySelector('select[formcontrolname=interval]').dispatchEvent(new Event('change'));
    expect(requested).toHaveBeenLastCalledWith({ kind: 'analysis-interval', sourceId: 'source-1', interval: 'yearly' });
    fixture.componentRef.setInput('context', { ...context, disabled: true }); fixture.detectChanges();
    expect([...selects].filter(select => ['groupGuid', 'interval', 'measure'].includes(select.getAttribute('formcontrolname') ?? '')).every(select => select.disabled)).toBe(true);
    expect(fixture.nativeElement.querySelector('.report-analysis-selection').disabled).toBe(true);
    fixture.destroy();
  });
  it('reviews target/presentation loss and retains compatible appearance through measure changes', () => {
    const { snapshot } = analysisFixture();
    const definition = { ...analysisDefinition(), series: [{ ...analysisDefinition().series[0], label: 'My result', color: '#123456' }] };
    const changed = prepareDecisionChange(definition, { kind: 'analysis-measure', sourceId: 'source-1', measure: 'calculated' }, { snapshot });
    expect(changed).toMatchObject({ state: 'apply', definition: { series: [{ metric: 'calculated', label: 'My result', color: '#123456' }] } });
    const binding = prepareDecisionChange(definition, { kind: 'analysis-binding', sourceId: 'source-1', analysisGuid: 'analysis-a', groupGuid: 'group-a' }, { snapshot });
    expect(binding.state).toBe('confirm'); if (binding.state === 'unchanged') throw new Error('Expected reviewed change');
    expect(projectAnalysisItems(binding.definition, 'source-1', snapshot)[0]).toMatchObject({ identity: { resourceGuid: 'group-a' }, customized: false });
    const clear = prepareDecisionChange(definition, { kind: 'analysis-binding', sourceId: 'source-1' }, { snapshot });
    expect(clear).toMatchObject({ state: 'confirm', definition: { sources: [{ kind: 'analysis' }], series: [] } });
  });
});
