import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { analysisFixture } from '@domain/visualizations/testing/analysis-fixtures';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { DisplaySettingsModule } from './display-settings.module';
import { DisplaySettingsComponent } from './display-settings.component';

describe('Chart appearance display settings', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('offers Site/Source only for energy measures that apply that setting', () => {
    const workspace = new AccountWorkspaceStore(); workspace.publish(analysisFixture().snapshot);
    TestBed.configureTestingModule({ imports: [DisplaySettingsModule], providers: [{ provide: AccountWorkspaceStore, useValue: workspace }] });
    const fixture = TestBed.createComponent(DisplaySettingsComponent), original = utilityVisualizationFixture();
    fixture.componentRef.setInput('context', { definition: { ...original, sources: original.sources.map(source => ({ ...source, measure: 'consumption' })) }, disabled: false });
    fixture.detectChanges();
    expect(fixture.componentInstance.quantities().map(quantity => quantity.id)).toEqual(['energy']);
    expect(fixture.componentInstance.showTreatment()).toBe(false);
    expect(fixture.nativeElement.querySelector('[aria-label="Site / Source energy"]')).toBeNull();
    fixture.componentRef.setInput('context', { definition: original, disabled: false }); fixture.detectChanges();
    expect(fixture.componentInstance.showTreatment()).toBe(true); fixture.destroy();
  });
  it('keeps consecutive unit/treatment edits together and hydrates disabled controls without submitting', () => {
    const workspace = new AccountWorkspaceStore(); workspace.publish(analysisFixture().snapshot);
    TestBed.configureTestingModule({ imports: [DisplaySettingsModule], providers: [{ provide: AccountWorkspaceStore, useValue: workspace }] });
    const fixture = TestBed.createComponent(DisplaySettingsComponent), request = vi.fn();
    const context = { definition: utilityVisualizationFixture(), disabled: false, request };
    fixture.componentRef.setInput('context', context); fixture.detectChanges();
    expect(request).not.toHaveBeenCalled();
    const component = fixture.componentInstance;
    component.units.controls['energy'].setValue('MMBtu'); component.treatment.setValue('source');
    expect(request).toHaveBeenLastCalledWith({ kind: 'chart-display', settings: { units: { energy: { kind: 'pinned', value: 'MMBtu' } }, energyTreatment: { kind: 'pinned', value: 'source' } } });
    request.mockClear(); fixture.componentRef.setInput('context', { ...context, disabled: true }); fixture.detectChanges();
    fixture.componentRef.setInput('context', { ...context, disabled: true }); fixture.detectChanges();
    expect(component.units.disabled).toBe(true); expect(request).not.toHaveBeenCalled(); fixture.destroy();
  });
});
