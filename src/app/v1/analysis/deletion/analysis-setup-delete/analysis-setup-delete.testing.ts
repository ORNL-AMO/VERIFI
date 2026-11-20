import { PortalModule } from '@angular/cdk/portal';
import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AccountAnalysisActionsService } from '@app/v1/analysis/account/account-analysis-actions.service';
import { FacilityAnalysisActionsService } from '@app/v1/analysis/facility/facility-analysis-actions.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AnalysisDeletionScope } from '../analysis-deletion';
import { AnalysisSetupDeleteComponent } from './analysis-setup-delete.component';

@Component({ standalone: true, host: { class: 'v1-root' }, encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/foundation.css'], imports: [AnalysisSetupDeleteComponent, PortalModule], template: `
  <main><app-analysis-setup-delete [scope]="scope()" [analysisGuid]="guid()" [autosave]="editor" /></main>
  <ng-template [cdkPortalOutlet]="modal.activePortal()" />
` })
export class DeleteTestHost {
  readonly modal = inject(ModalPortalService);
  readonly scope = signal<AnalysisDeletionScope>('facility');
  readonly guid = signal('analysis');
  readonly editor = {
    isDirty: signal(true), beginDeletion: vi.fn(async () => true),
    cancelDeletion: vi.fn(), completeDeletion: vi.fn()
  };
}

export function setupDeletion(scope: AnalysisDeletionScope = 'facility') {
  const snapshot = signal({
    account: { guid: 'account', name: 'Company' },
    facilities: [{ guid: 'facility', accountId: 'account', name: 'Plant', selectedEnergyAnalysisId: 'analysis' }],
    facilityAnalyses: [{ guid: 'analysis', accountId: 'account', facilityId: 'facility', name: 'Saved facility analysis' }],
    accountAnalyses: [{ guid: 'analysis', accountId: 'account', name: 'Saved account analysis', facilityAnalysisItems: [] }],
    accountReports: [], facilityReports: []
  } as unknown as AccountWorkspaceSnapshot);
  const accountActions = { deleteAnalysis: vi.fn(async () => undefined) };
  const facilityActions = { deleteAnalysis: vi.fn(async () => undefined) };
  const recover = vi.fn(async () => undefined);
  const pending = signal(false);
  const canWrite = signal(true);
  TestBed.configureTestingModule({ imports: [DeleteTestHost], providers: [
    provideRouter([]),
    { provide: AccountWorkspaceStore, useValue: { snapshot, account: () => snapshot().account, selectedFacility: () => snapshot().facilities[0], canWrite, hasPending: pending } },
    { provide: AccountAnalysisActionsService, useValue: accountActions },
    { provide: FacilityAnalysisActionsService, useValue: facilityActions },
    { provide: WorkspaceCommandBoundary, useValue: { recoverCommittedPublication: recover } },
    { provide: WorkspaceNavigationService, useValue: {
      facilityInventoryLink: (guid: string) => ({ route: ['/analyses'], queryParams: { facility: guid } }),
      accountAnalysisRoute: () => ['/analyses']
    } }
  ] });
  const fixture = TestBed.createComponent(DeleteTestHost);
  fixture.componentInstance.scope.set(scope);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  fixture.detectChanges();
  const control = fixture.debugElement.query(By.directive(AnalysisSetupDeleteComponent)).componentInstance as AnalysisSetupDeleteComponent;
  const root = fixture.nativeElement as HTMLElement;
  const opener = () => root.querySelector<HTMLButtonElement>('main button')!;
  const confirm = () => root.querySelector<HTMLButtonElement>('.v1-modal__footer .v1-btn--danger')!;
  const cancel = () => root.querySelector<HTMLButtonElement>('.v1-modal__footer .v1-btn--quiet')!;
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  return { fixture, host: fixture.componentInstance, root, control, opener, confirm, cancel, settle, navigate, snapshot, pending, canWrite, accountActions, facilityActions, recover };
}
