import '@angular/compiler';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Injector, NgModule, Pipe, PipeTransform } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { RegressionModelsService } from '@shared/shared-analysis/calculations/regression-models.service';
import { FacilityReportsDataCheckComponent } from '@v0/data-evaluation/facility/facility-reports/facility-reports-data-check/facility-reports-data-check.component';
import { FacilityReportAnalysisSelectionComponent } from '@v0/data-evaluation/facility/facility-reports/facility-report-setup/facility-report-analysis-selection/facility-report-analysis-selection.component';
import { AccountReportsDataCheckComponent } from './account-reports-data-check.component';

@Pipe({ name: 'invalidAnalysis', standalone: false })
export class ReportMetadataInvalidAnalysisPipe implements PipeTransform {
  transform(_value: string) { return { hasError: false, groupsHaveErrors: false }; }
}

@NgModule({
  declarations: [AccountReportsDataCheckComponent, FacilityReportsDataCheckComponent,
    FacilityReportAnalysisSelectionComponent, ReportMetadataInvalidAnalysisPipe],
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
class ReportAnalysisMetadataTestModule { }

function createHarness() {
  const store = new AccountWorkspaceStore();
  const account = { id: 1, guid: 'account-a' } as any;
  const facility = { id: 2, guid: 'facility-a', accountId: account.guid } as any;
  const facilityAnalysis = {
    id: 3, guid: 'facility-analysis-a', accountId: account.guid, facilityId: facility.guid, name: 'Facility analysis',
    isAnalysisVisited: false, groups: [{ idbGroupId: 'group-a', analysisType: 'absoluteEnergyConsumption',
      regressionConstant: 10, predictorVariables: [] }]
  } as IdbAnalysisItem;
  const accountAnalysis = {
    id: 4, guid: 'account-analysis-a', accountId: account.guid, name: 'Account analysis', isAnalysisVisited: false,
    facilityAnalysisItems: [{ facilityId: facility.guid, analysisItemId: undefined }]
  } as IdbAccountAnalysisItem;
  store.publish({
    account, facilities: [facility], facilityAnalyses: [facilityAnalysis], accountAnalyses: [accountAnalysis],
    meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [], accountReports: [], facilityReports: [],
    customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: [], savedVisualizations: []
  } as unknown as AccountWorkspaceSnapshot, { facility });
  const facilityWrites: IdbAnalysisItem[] = [];
  const accountWrites: IdbAccountAnalysisItem[] = [];
  const handler = new AnalysisCommandHandler(
    { updateWithObservable: vi.fn((value: IdbAnalysisItem) => { facilityWrites.push(structuredClone(value)); return of(value); }) } as any,
    { updateWithObservable: vi.fn((value: IdbAccountAnalysisItem) => { accountWrites.push(structuredClone(value)); return of(value); }) } as any,
    store,
    undefined
  );
  const boundary = new WorkspaceCommandBoundary(store, {} as AccountWorkspaceService);
  const selectFacilityAnalysis = vi.fn();
  const selectAccountAnalysis = vi.fn();
  TestBed.configureTestingModule({
    imports: [ReportAnalysisMetadataTestModule],
    providers: [
      { provide: AccountWorkspaceStore, useValue: store },
      { provide: AccountWorkspaceQueryService, useValue: new AccountWorkspaceQueryService(store) },
      { provide: AccountWorkspaceService, useValue: { selectFacilityAnalysis, selectAccountAnalysis } },
      { provide: WorkspaceCommandBoundary, useValue: boundary },
      { provide: AnalysisCommandHandler, useValue: handler },
      { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      { provide: RegressionModelsService, useValue: {} },
      { provide: AccountStatusCheckService, useValue: { selectedFacilityStatusCheck$: new BehaviorSubject(undefined) } }
    ]
  });
  const injector = TestBed.inject(Injector);
  const accountCheck = TestBed.runInInjectionContext(() => new AccountReportsDataCheckComponent(
    TestBed.inject(Router), TestBed.inject(RegressionModelsService), injector
  ));
  const facilityCheck = TestBed.runInInjectionContext(() => new FacilityReportsDataCheckComponent(
    TestBed.inject(RegressionModelsService), injector
  ));
  const selection = TestBed.runInInjectionContext(() => new FacilityReportAnalysisSelectionComponent());
  selection.facilityReport = { facilityReportType: 'analysis' } as any;
  accountCheck.selectedReport = {
    reportType: 'betterPlants', reportYear: 2024, betterPlantsReportSetup: { analysisItemId: accountAnalysis.guid }
  } as any;
  return { store, handler, boundary, accountCheck, facilityCheck, selection, accountAnalysis, facilityAnalysis,
    facility, accountWrites, facilityWrites, selectFacilityAnalysis, selectAccountAnalysis };
}

function holdQueue(boundary: WorkspaceCommandBoundary) {
  let release!: () => void;
  const blocked = new Promise<void>(resolve => release = resolve);
  const command = boundary.execute(
    { entityKind: 'account', changeKind: 'update', label: 'Earlier command', publication: { mode: 'patch', buildPatch: () => ({ collections: [] }) } },
    () => blocked
  );
  return { release, command };
}

describe('Report analysis metadata writes', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('marks the account analysis checked without replacing a preceding assignment or resaving on publication', async () => {
    const h = createHarness();
    const original = structuredClone(h.accountAnalysis);
    h.accountCheck.selectedAnalysisItem = original;
    const held = holdQueue(h.boundary);
    const assignment = h.boundary.execute(
      { entityKind: 'accountAnalysis', changeKind: 'update', label: 'Assign facility',
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'accountAnalyses', upsert: [value] }] }) } },
      () => h.handler.updateAccountFacilityAssignments(h.accountAnalysis.guid,
        [{ facilityId: h.facility.guid, analysisItemId: h.facilityAnalysis.guid }], 'account-a')
    );
    const checked = h.accountCheck.setAnalysisVisited();
    held.release();
    await Promise.all([held.command, assignment, checked]);
    expect(h.store.accountAnalyses()[0]).toMatchObject({
      isAnalysisVisited: true,
      facilityAnalysisItems: [{ facilityId: h.facility.guid, analysisItemId: h.facilityAnalysis.guid }]
    });
    expect(original.isAnalysisVisited).toBe(false);
    const writeCount = h.accountWrites.length;
    h.accountCheck.setFacilityItems([...h.store.facilityAnalyses()]);
    await h.accountCheck.setAnalysisVisited();
    expect(h.accountWrites).toHaveLength(writeCount);
    expect(h.selectAccountAnalysis).not.toHaveBeenCalled();
  });

  it('marks facility data checked without replacing a preceding model edit', async () => {
    const h = createHarness();
    const original = structuredClone(h.facilityAnalysis);
    h.facilityCheck.analysisItem = original;
    const held = holdQueue(h.boundary);
    const edit = h.boundary.execute(
      { entityKind: 'facilityAnalysis', changeKind: 'update', label: 'Edit model',
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'facilityAnalyses', upsert: [value] }] }) } },
      () => h.handler.updateFacilityAnalysisGroup(h.facilityAnalysis.guid, 'group-a', { regressionConstant: 42 }, 'account-a')
    );
    const checked = h.facilityCheck.setAnalysisVisited();
    held.release();
    await Promise.all([held.command, edit, checked]);
    const stored = h.store.facilityAnalyses()[0];
    expect(stored.groups[0].regressionConstant).toBe(42);
    expect(stored.isAnalysisVisited).toBe(true);
    expect(stored.dataCheckedDate).toBeInstanceOf(Date);
    expect(original.isAnalysisVisited).toBe(false);
    expect(original.dataCheckedDate).toBeUndefined();
    const writeCount = h.facilityWrites.length;
    await h.facilityCheck.setAnalysisVisited();
    expect(h.facilityWrites).toHaveLength(writeCount);
    expect(h.selectFacilityAnalysis).not.toHaveBeenCalled();
  });

  it('invalidates checked status without changing the input object or a preceding model edit', async () => {
    const h = createHarness();
    const original = { ...structuredClone(h.facilityAnalysis), isAnalysisVisited: true };
    const held = holdQueue(h.boundary);
    const edit = h.boundary.execute(
      { entityKind: 'facilityAnalysis', changeKind: 'update', label: 'Edit model',
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'facilityAnalyses', upsert: [value] }] }) } },
      () => h.handler.updateFacilityAnalysisGroup(h.facilityAnalysis.guid, 'group-a', { regressionConstant: 42 }, 'account-a')
    );
    const invalidated = h.selection.saveAnalysisVisitedData(original);
    held.release();
    await Promise.all([held.command, edit, invalidated]);
    expect(h.store.facilityAnalyses()[0].groups[0].regressionConstant).toBe(42);
    expect(h.store.facilityAnalyses()[0].isAnalysisVisited).toBe(false);
    expect(original.isAnalysisVisited).toBe(true);
    expect(h.selectFacilityAnalysis).not.toHaveBeenCalled();
  });

  it('does not write metadata whose checked status is already current', async () => {
    const h = createHarness();
    h.accountCheck.selectedAnalysisItem = { ...h.accountAnalysis, isAnalysisVisited: true };
    h.facilityCheck.analysisItem = { ...h.facilityAnalysis, isAnalysisVisited: true, dataCheckedDate: new Date() };
    await h.accountCheck.setAnalysisVisited();
    await h.facilityCheck.setAnalysisVisited();
    await h.selection.saveAnalysisVisitedData({ ...h.facilityAnalysis, isAnalysisVisited: false });
    expect(h.accountWrites).toHaveLength(0);
    expect(h.facilityWrites).toHaveLength(0);
  });
});
