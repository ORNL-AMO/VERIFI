import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { createVisualizationSetupDefinition, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { visualizationSnapshot } from '../testing/visualization-test-fixtures';
import { VisualizationNavigationService } from '../visualization-navigation.service';
import { createVisualizationChart, VISUALIZATION_CHART_CHOICES } from '../visualization-charts';
import { WorkbenchModule } from './workbench.module';
import { WorkbenchComponent } from './workbench.component';

describe('visualization workbench', () => {
  afterEach(() => TestBed.resetTestingModule());
  function setup(definition?: VisualizationDefinition) {
    const snapshot = visualizationSnapshot();
    const store = new AccountWorkspaceStore(); store.publish(definition ? { ...snapshot,
      savedVisualizations: [{ ...getNewIdbSavedVisualization(definition), id: 1, guid: 'visualization-a' }] } : snapshot);
    const route = signal({ section: 'visualization', accountGuid: 'account-a', visualizationGuid: 'visualization-a' });
    const submit = vi.fn(async (command: any) => ({ state: 'committed', value: { ...store.savedVisualizations()[0], definition: command.definition, revision: command.expectedRevision + 1 }, command, referenceIssues: [] }));
    TestBed.configureTestingModule({ imports: [WorkbenchModule], providers: [provideRouter([]),
      { provide: AccountWorkspaceStore, useValue: store }, { provide: WorkspaceNavigationService, useValue: { routeState: route } },
      { provide: SavedVisualizationCommands, useValue: { submit } }
    ] });
    const fixture = TestBed.createComponent(WorkbenchComponent); fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, store, submit, route };
  }
  it('shows saved ownership and saves valid edits before leaving', async () => {
    const { fixture, component, submit } = setup();
    expect(fixture.nativeElement.textContent).toContain('Plant A');
    component.editor.form.controls.name.setValue('Updated name');
    await expect(component.resolveLeave()).resolves.toBe(true);
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 1, definition: expect.objectContaining({ name: 'Updated name' }) }));
    expect(component.editor.needsProtection()).toBe(false);
  });
  it.each(VISUALIZATION_CHART_CHOICES)('shows the saved $label chart choice and all selected source families', choice => {
    const definition = createVisualizationSetupDefinition({ name: 'Mixed chart', accountGuid: 'account-a', scope: { kind: 'portfolio' },
      chart: createVisualizationChart(choice.value), sourceKinds: ['utility', 'weather', 'analysis-model'] });
    const { fixture, component } = setup(definition);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain(`Chart: ${choice.label}`);
    expect(root.textContent).toContain('Utility'); expect(root.textContent).toContain('Weather'); expect(root.textContent).toContain('Analysis Model');
    expect(root.textContent).toContain('Back to Dashboard');
    expect(component.editor.definition()).toEqual(definition);
  });
  it('uses one portal review and retains invalid input when navigation is canceled', async () => {
    const { component, submit } = setup();
    component.editor.form.controls.name.setValue('');
    const pending = TestBed.inject(UnsavedChangesService).resolveNavigationPreflight();
    await Promise.resolve(); await Promise.resolve();
    expect(TestBed.inject(ModalPortalService).activePortal()).not.toBeNull();
    component.finishLeave(false);
    await expect(pending).resolves.toBe(false);
    expect(component.editor.form.controls.name.value).toBe('');
    expect(component.editor.needsProtection()).toBe(true);
    expect(submit).not.toHaveBeenCalled();
  });
  it('explicit discard restores the saved intent and closes the portal', async () => {
    const { component } = setup();
    component.editor.form.controls.name.setValue('');
    const pending = component.resolveLeave(); await Promise.resolve(); await Promise.resolve();
    component.discardLeave();
    await expect(pending).resolves.toBe(true);
    expect(component.editor.form.controls.name.value).toBe('My energy');
    expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull();
  });
  it('returns through account-isolated browse context', () => {
    const { component } = setup();
    const back = vi.spyOn(TestBed.inject(VisualizationNavigationService), 'returnToLibrary').mockResolvedValue(true);
    component.back(); expect(back).toHaveBeenCalledWith('account-a');
  });
});
