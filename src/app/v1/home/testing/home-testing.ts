import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { HomeCommands } from '@data/account-workspace/home-commands.service';
import { HomeCommandHandler } from '@data/account-workspace/handlers/home-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbHomeDashboard } from '@data/models/idbModels/homeDashboard';
import { homeAccountOwner, homeDefinition } from '@domain/home/testing/home-fixtures';
import { WorkspaceContextService } from '@app/v1/shell/workspace-context.service';
import { parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { HomeModule } from '../home.module';

export function homeSnapshot(): AccountWorkspaceSnapshot {
  const account = { ...getNewIdbAccount(), guid: 'account-a', name: 'Account A' };
  return { account, facilities: [{ ...getNewIdbFacility(account), guid: 'facility-a', name: 'Facility A' }],
    homeDashboards: [], homeOwners: [], savedVisualizations: [], meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
    facilityAnalyses: [], accountAnalyses: [], accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: [] };
}
export function homeRecord(guid: string, name = guid, facilityId?: string) {
  return { ...getNewIdbHomeDashboard('account-a', facilityId ? { kind: 'facility', guid: facilityId } : homeAccountOwner,
    { ...homeDefinition(), name }), guid };
}
export function setupHome() {
  const route = signal(parseWorkspaceRoute('/v1/workspace/account/account-a/home/overview'));
  TestBed.configureTestingModule({ imports: [HomeModule], providers: [provideRouter([]),
    { provide: AccountWorkspaceService, useValue: { reloadActiveWorkspace: async () => 'published' } },
    { provide: WorkspaceContextService, useValue: { routeState: route } },
    { provide: HomeCommands, useFactory: () => new HomeCommands({} as WorkspaceCommandBoundary, {} as HomeCommandHandler, TestBed.inject(AccountWorkspaceStore)) }
  ] });
  const store = TestBed.inject(AccountWorkspaceStore), snapshot = homeSnapshot();
  store.publish(snapshot);
  return { store, snapshot, route };
}
