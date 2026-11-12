import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { LibraryComponent } from './library.component';
import { LibraryModule } from './library.module';
import { configureLibraryTest, libraryRecord } from './testing/library-testing';

async function setup() {
  const context = configureLibraryTest([LibraryModule]);
  context.workspace.publish({ ...context.workspace.snapshot()!, savedVisualizations: [libraryRecord('Portfolio trend'),
    getNewIdbSavedVisualization(createVisualizationDefinition('Facility weather', 'account-a', { kind: 'facility', facilityGuid: 'facility-a' }, 'predictor'))] });
  await TestBed.compileComponents();
  const fixture = TestBed.createComponent(LibraryComponent); fixture.detectChanges();
  return { ...context, fixture, component: fixture.componentInstance, root: fixture.nativeElement as HTMLElement };
}
describe('visualization library dashboard', () => {
  it.each(['failed', 'conflict', 'refresh-required'] as const)('keeps %s deletion recovery visible after Cancel', async outcome => {
    const { component, fixture, root, commands } = await setup();
    const entry = component.entries()[0];
    commands.submit.mockImplementationOnce(async command => ({ state: outcome, command,
      ...(outcome === 'conflict' ? { current: { ...entry.record, revision: entry.record.revision + 1 } } : {}), error: new Error('Deletion needs recovery') } as any));
    component.lifecycle.requestDelete(entry); fixture.detectChanges();
    await component.lifecycle.confirmDelete(); fixture.detectChanges();
    const proposal = component.lifecycle.proposal();
    component.lifecycle.cancelConfirmation(); fixture.detectChanges();
    expect(component.lifecycle.deleteCandidate()).toBeUndefined();
    expect(component.lifecycle.proposal()).toBe(proposal); expect(component.canAct()).toBe(false);
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(outcome === 'conflict' ? 'Reload saved state' : 'Retry');
    if (outcome === 'conflict') await component.lifecycle.reloadSavedConflict();
    else {
      expect(component.lifecycle.canDiscard()).toBe(outcome !== 'refresh-required');
      await component.lifecycle.retry();
      if (outcome === 'refresh-required') expect(commands.recover).toHaveBeenCalledWith('account-a', entry.record.guid);
    }
    expect(component.lifecycle.proposal()).toBeUndefined();
  });
  it('shows cards, filters sourceKind and search, and provides a clear no-match recovery', async () => {
    const { component, fixture, root } = await setup();
    expect(root.textContent).toContain('Portfolio trend'); expect(root.textContent).toContain('Facility weather');
    component.filtersForm.controls.sourceKind.setValue('predictor'); fixture.detectChanges();
    expect(component.filteredEntries().map(entry => entry.name)).toEqual(['Facility weather']);
    component.filtersForm.controls.search.setValue('not a match'); fixture.detectChanges();
    expect(root.textContent).toContain('No visualizations match these filters'); component.clearFilters(); fixture.detectChanges();
    expect(component.filteredEntries()).toHaveLength(2);
    expect([...root.querySelectorAll('select')].every(select => select.classList.contains('v1-select'))).toBe(true);
  });
  it('preserves single-facility portfolio cards while creation belongs to the sole facility', async () => {
    const { component, fixture, workspace, facility } = await setup();
    workspace.publish({ ...workspace.snapshot()!, account: { ...workspace.account()!, isSingleFacilityCompany: true } }); facility.set('facility-a'); fixture.detectChanges();
    expect(component.entries()).toHaveLength(2); component.openCreate(); fixture.detectChanges();
    expect(component.lifecycle.editor()?.fixedFacility).toBe('facility-a');
    expect(component.lifecycle.form.controls.scope.value).toBe('facility');
  });
  it('keeps the retained portfolio card and routes its Duplicate action through scope review for a single facility', async () => {
    const { component, fixture, workspace, facility, commands, visualizations } = await setup();
    workspace.publish({ ...workspace.snapshot()!, account: { ...workspace.account()!, isSingleFacilityCompany: true } });
    facility.set('facility-a'); fixture.detectChanges();
    const portfolio = component.entries().find(entry => entry.scope === 'portfolio')!;
    const original = structuredClone(portfolio.record.definition);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.requestAction({ guid: portfolio.record.guid, action: 'copy' }); await fixture.whenStable(); fixture.detectChanges();
    expect(component.entries()).toHaveLength(2);
    expect(navigate).toHaveBeenCalledWith(visualizations.workbenchRoute('account-a', portfolio.record.guid), { queryParams: { action: 'copy-scope' } });
    expect(commands.prepareDuplicate).not.toHaveBeenCalled(); expect(commands.submit).not.toHaveBeenCalled();
    expect(portfolio.record.definition).toEqual(original);
  });
  it('captures originating facility browse context before opening the exact saved item', async () => {
    const { component, fixture, facility, visualizations } = await setup(); facility.set('facility-a'); fixture.detectChanges();
    expect(component.entries()).toHaveLength(1); const entry = component.entries()[0];
    await component.openRoute(visualizations.workbenchRoute('account-a', entry.record.guid));
    expect(visualizations.rememberReturn).toHaveBeenCalledWith('account-a', 'facility-a'); expect(visualizations.open).toHaveBeenCalledWith('account-a', entry.record.guid);
  });
});
