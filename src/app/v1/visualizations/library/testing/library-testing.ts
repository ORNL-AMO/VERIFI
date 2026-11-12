import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { VisualizationNavigationService } from '../../visualization-navigation.service';
import { LibraryLifecycle } from '../lifecycle/library-lifecycle.service';

export function librarySnapshot(): AccountWorkspaceSnapshot {
  return { account: { guid: 'account-a', name: 'Account A' }, facilities: [{ guid: 'facility-a', accountId: 'account-a', name: 'Facility A' }],
    meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [], facilityAnalyses: [], accountAnalyses: [], accountReports: [],
    facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: [], savedVisualizations: [] } as unknown as AccountWorkspaceSnapshot;
}
export function libraryRecord(name = 'Saved visualization', guid = 'visualization-a') {
  return getNewIdbSavedVisualization(createVisualizationDefinition(name, 'account-a', { kind: 'portfolio' }, 'utility'),
    { guid, createdDate: new Date('2026-01-01'), modifiedDate: new Date('2026-01-01') });
}
export function configureLibraryTest(imports: unknown[] = []) {
  const workspace = new AccountWorkspaceStore(); workspace.publish(librarySnapshot());
  let nextGuid = 0;
  const commands = {
    prepareCreate: vi.fn(definition => ({ kind: 'create', accountGuid: definition.accountGuid, guid: `created-${++nextGuid}`, definition, createdDate: new Date().toISOString() })),
    prepareDuplicate: vi.fn(record => ({ kind: 'duplicate', accountGuid: record.accountId, guid: `copy-${++nextGuid}`, definition: record.definition,
      sourceGuid: record.guid, expectedRevision: record.revision, createdDate: new Date().toISOString() })),
    submit: vi.fn(async command => ({ state: 'committed', command, referenceIssues: [], value: command.kind === 'delete' ? undefined : libraryRecord() })),
    recover: vi.fn(async () => ({ state: 'setup-required', definition: libraryRecord().definition, record: libraryRecord(), issues: [] }))
  };
  const facility = signal<string | undefined>(undefined);
  const routeState = signal({ accountGuid: 'account-a' });
  const navigation = { inventoryFacilityGuid: facility, routeState, changeFacilityScope: vi.fn(),
    isSingleSiteWorkspace: computed(() => workspace.account()?.isSingleFacilityCompany === true && workspace.facilities().length === 1) };
  const visualizations = { rememberReturn: vi.fn(), open: vi.fn(async () => true),
    workbenchRoute: (accountGuid: string, guid: string) => ['/v1', 'workspace', 'account', accountGuid, 'visualization', 'workbench', guid],
    libraryRoute: (accountGuid: string) => ['/v1', 'workspace', 'account', accountGuid, 'visualization', 'library'] };
  TestBed.configureTestingModule({ imports, providers: [provideRouter([]), LibraryLifecycle,
    { provide: AccountWorkspaceService, useValue: { selectAccount: vi.fn(async () => 'published') } },
    { provide: AccountWorkspaceStore, useValue: workspace }, { provide: SavedVisualizationCommands, useValue: commands },
    { provide: WorkspaceNavigationService, useValue: navigation }, { provide: VisualizationNavigationService, useValue: visualizations }
  ] });
  return { workspace, commands, facility, routeState, navigation, visualizations };
}
