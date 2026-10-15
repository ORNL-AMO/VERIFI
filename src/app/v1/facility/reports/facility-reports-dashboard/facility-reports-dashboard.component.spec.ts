import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { FacilityReportsModule } from '../facility-reports.module';
import { FacilityReportActionsService } from '../facility-report-actions.service';
import { reportFacility, reportFixture, reportSnapshot } from '../testing/report-test-fixtures';
import { FacilityReportsDashboardComponent } from './facility-reports-dashboard.component';

describe('FacilityReportsDashboardComponent', () => {
  let fixture: ComponentFixture<FacilityReportsDashboardComponent>;
  let component: FacilityReportsDashboardComponent;
  let store: AccountWorkspaceStore;
  let navigate: ReturnType<typeof vi.fn>;
  let actions: { create: ReturnType<typeof vi.fn>; copy: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  const status = signal<'ready' | 'error' | 'evaluating'>('ready');

  beforeEach(async () => {
    status.set('ready');
    store = new AccountWorkspaceStore();
    store.publish(reportSnapshot(), { facility: reportFacility });
    actions = { create: vi.fn(async () => reportFixture({ guid: 'created' })), copy: vi.fn(), delete: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [FacilityReportsModule], providers: [provideRouter([]),
        { provide: AccountWorkspaceStore, useValue: store },
        { provide: WorkspaceStatusService, useValue: { state: status, items: signal([]) } },
        { provide: WorkspaceNavigationService, useValue: {
          routeState: signal({ facilityGuid: 'facility-a' }),
          facilityReportWorkbenchRoute: (facilityGuid: string, reportGuid: string) => ['/v1', facilityGuid, reportGuid, 'setup']
        } }, { provide: FacilityReportActionsService, useValue: actions }
      ]
    }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(FacilityReportsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders saved cards, filtered empty results, and a distinct empty inventory', () => {
    expect(fixture.nativeElement.textContent).toContain('Saved report');
    expect(component.cardActions().map(action => action.id)).toEqual(['copy', 'delete']);
    expect(fixture.nativeElement.textContent).not.toContain('Rename report');
    component.filtersForm.controls.search.setValue('no match');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No reports match these filters');
    store.publish(reportSnapshot([]), { facility: reportFacility });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No reports');
    expect(fixture.nativeElement.querySelector('app-resource-browse-card')).toBeNull();
  });

  it('keeps lifecycle actions available when validation fails but disables them for pending workspace writes', () => {
    status.set('error');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Setup status is unavailable');
    expect(component.canAct()).toBe(true);
    store.setPending({ id: 1, label: 'Other change' });
    fixture.detectChanges();
    expect(component.canAct()).toBe(false);
    component.openCreate();
    expect(component.editor()).toBeUndefined();
  });

  it('hides Emission Factors cards and choices unless account Other Impacts is checked, preserving saved reports', () => {
    const snapshot = reportSnapshot([reportFixture(), reportFixture({ guid: 'factors', id: 11, facilityReportType: 'emissionFactors', name: 'Saved factors' })]);
    store.publish(snapshot, { facility: reportFacility });
    component.filtersForm.controls.type.setValue('emissionFactors');
    fixture.detectChanges();
    expect(component.visibleCards().map(card => card.report.guid)).toEqual(['factors']);
    store.publish({ ...snapshot, account: { ...snapshot.account, displayEmissions: false } }, { facility: reportFacility });
    fixture.detectChanges();
    expect(component.reportTypes().some(option => option.value === 'emissionFactors')).toBe(false);
    expect(component.filtersForm.controls.type.value).toBe('all');
    expect(component.cards().map(card => card.report.guid)).toEqual(['report-a']);
    expect(fixture.nativeElement.textContent).not.toContain('Saved factors');
    component.openCreate();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-report-draft-slideout option').length).toBe(6);
    expect(store.facilityReports()).toHaveLength(2);
    component.cancelEditor();
    store.publish(snapshot, { facility: reportFacility });
    fixture.detectChanges();
    expect(component.cards()).toHaveLength(2);
  });

  it('blocks dirty editor navigation, validates names, and cancels explicitly', () => {
    component.openCreate();
    component.editorForm.controls.name.setValue('   ');
    expect(component.canSave()).toBe(false);
    expect(component.isNavigationBlocked()).toBe(true);
    expect(TestBed.inject(UnsavedChangesService).confirmDiscard()).toBe(false);
    component.cancelEditor();
    expect(component.hasUnsavedChanges()).toBe(false);
    expect(component.isNavigationBlocked()).toBe(false);
    expect(actions.create).not.toHaveBeenCalled();
  });

  it('retains failed drafts for retry and navigates only after successful creation', async () => {
    actions.create.mockRejectedValueOnce(new Error('Storage unavailable. Try again.'));
    component.openCreate();
    component.editorForm.controls.name.setValue('Annual report');
    await component.submitEditor();
    fixture.detectChanges();
    expect(component.editorForm.controls.name.value).toBe('Annual report');
    expect(component.editor()).toBeDefined();
    expect(fixture.nativeElement.textContent).toContain('Storage unavailable');
    expect(navigate).not.toHaveBeenCalled();
    await component.submitEditor();
    expect(component.editor()).toBeUndefined();
    expect(component.isNavigationBlocked()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/v1', 'facility-a', 'created', 'setup']);
  });

  it('prevents duplicate submissions and suppresses late navigation after a context change', async () => {
    let resolve!: (value: ReturnType<typeof reportFixture>) => void;
    actions.create.mockImplementation(() => new Promise(done => { resolve = done; }));
    component.openCreate();
    const first = component.submitEditor();
    await component.submitEditor();
    expect(actions.create).toHaveBeenCalledTimes(1);
    store.publish({ ...reportSnapshot(), account: { ...reportSnapshot().account, guid: 'account-b' } });
    fixture.detectChanges();
    resolve(reportFixture());
    await first;
    expect(navigate).not.toHaveBeenCalled();
    expect(component.editor()).toBeUndefined();
  });

  it('opens portal-hosted delete/discard confirmations and retains a failed deletion for retry', async () => {
    const modal = TestBed.inject(ModalPortalService);
    component.action(component.cards()[0], 'delete');
    expect(modal.activePortal()).not.toBeNull();
    component.cancelConfirmation();
    expect(actions.delete).not.toHaveBeenCalled();
    component.action(component.cards()[0], 'delete');
    actions.delete.mockRejectedValueOnce(new Error('Could not delete'));
    await component.confirmDelete();
    expect(component.deleteCandidate()).toBeDefined();
    expect(component.actionError()).toContain('Could not delete');
    await component.confirmDelete();
    expect(modal.activePortal()).toBeNull();
    component.openCreate();
    component.editorForm.controls.name.setValue('Changed');
    component.requestCloseEditor();
    expect(modal.activePortal()).not.toBeNull();
    component.discardEditor();
    expect(component.editor()).toBeUndefined();
  });
});
