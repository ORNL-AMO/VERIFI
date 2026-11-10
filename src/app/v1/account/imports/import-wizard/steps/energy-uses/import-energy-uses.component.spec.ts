import { By } from '@angular/platform-browser';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { PortalModule } from '@angular/cdk/portal';
import { Component, computed, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { EnergyUsesExcelImportService, EnergyUsesImportPreview } from '@data/import/energy-uses/energy-uses-excel-import.service';
import { getEmptyFileReference, EnergyUsesTemplateImportFileDraft } from '@data/import/spreadsheet-import.models';
import { ImportSessionService } from '../../../import-session.service';
import { EnergyUsesImportStateService } from '../../energy-uses-import-state.service';
import { ImportWizardDraftStore } from '../../import-wizard-draft.store';
import { ImportWizardStateService } from '../../import-wizard-state.service';
import { ImportEnergyUsesComponent } from './import-energy-uses.component';

@Component({ standalone: true, imports: [ImportEnergyUsesComponent, PortalModule],
  template: '<app-import-energy-uses/><ng-template [cdkPortalOutlet]="modal.activePortal()"/>' })
class ImportReviewHost { readonly modal = inject(ModalPortalService); }

function setup(year: number | null = 2025) {
  const revision = signal(1), committed = signal(false), error = signal<string | undefined>(undefined);
  const originalRows = [
    { importedRow: 2, facility: 'Plant', group: 'Production', equipment: 'Pump', industrialSystem: 'Pump', action: 'Update' as const,
      errors: [], changes: [{ field: 'Energy use', before: '5', after: '0' }] },
    { importedRow: 3, facility: 'Plant', group: 'Production', equipment: 'Bad row', industrialSystem: 'Pump', action: 'Error' as const,
      errors: ['Enter a whole equipment count of at least 1.'], changes: [] },
    { importedRow: 4, facility: 'Plant', group: 'Production', equipment: 'Unchanged pump', industrialSystem: 'Pump', action: 'Unchanged' as const, errors: [], changes: [] }
  ];
  const preparePreview = vi.fn((_workbook, selectedYear: number, skipped: ReadonlySet<number> = new Set()) => ({
    filename: 'equipment.xlsx', accountGuid: 'account-a', revision: revision(), year: selectedYear,
    rows: originalRows.map(row => ({ ...row, skipped: skipped.has(row.importedRow) })), newGroups: [], created: 0,
    updated: skipped.has(2) ? 0 : 1, unchanged: 1, errorRows: skipped.has(3) ? 0 : 1, canImport: !skipped.has(2) && skipped.has(3)
  } satisfies EnergyUsesImportPreview));
  TestBed.configureTestingModule({ imports: [ImportReviewHost], providers: [
    ImportWizardDraftStore, EnergyUsesImportStateService,
    { provide: EnergyUsesExcelImportService, useValue: { preparePreview } },
    { provide: WorkspaceCommandBoundary, useValue: {} },
    { provide: AccountWorkspaceStore, useValue: { account: () => ({ guid: 'account-a' }), revision } },
    { provide: ImportWizardStateService, useFactory: () => {
      const session = inject(ImportSessionService);
      return { energyUses: inject(EnergyUsesImportStateService), session, error, committed,
        isNavigationBlocked: computed(() => session.navigationBlocked()) };
    } }
  ] });
  const draft: EnergyUsesTemplateImportFileDraft = { ...getEmptyFileReference(), id: 'file-a', name: 'equipment.xlsx', kind: 'energy-uses-template',
    status: 'ready', findings: [], completedSteps: [], invalidMeterReadingsAcknowledged: false, excludedMeterReadingIds: [],
    skipExistingPredictorIds: [], invalidPredictorReadingsAcknowledged: false, excludedPredictorReadingIds: [],
    energyUses: { workbook: { filename: 'equipment.xlsx', year, rows: [] }, year, skippedRows: [] } };
  TestBed.inject(ImportWizardDraftStore).initialize(draft);
  const view = TestBed.createComponent(ImportReviewHost); view.detectChanges();
  return { view, component: view.debugElement.query(By.directive(ImportEnergyUsesComponent)).componentInstance as ImportEnergyUsesComponent, state: TestBed.inject(EnergyUsesImportStateService), preparePreview,
    session: TestBed.inject(ImportSessionService), revision, error };
}

describe('single-page Energy Uses import', () => {
  it('automatically reviews a valid fiscal year and renders counts, changed rows, errors and before/after values in a slideout', () => {
    const { view, component, preparePreview } = setup();
    expect(preparePreview).toHaveBeenCalledTimes(1);
    const host: HTMLElement = view.nativeElement;
    expect(host.querySelector('input[type="number"]')).not.toBeNull();
    expect(host.querySelector('dl[aria-label="Import summary"]')).not.toBeNull();
    expect(host.querySelector('thead')?.textContent).toContain('FacilityGroupEquipmentStatusErrorsSkip');
    expect(host.textContent).toContain('Enter a whole equipment count');
    expect(host.textContent).not.toContain('Unchanged pump');
    expect(host.querySelector('[aria-label="Changes for Pump"]')).toBeNull();
    component.openDetails(component.rows()[0].row); view.detectChanges();
    const details = host.querySelector('[aria-label="Changes for Pump"]');
    expect(details?.textContent).toContain('Current value');
    expect(details?.textContent).toContain('Imported value');
    expect(details?.textContent).toContain('Energy use50');
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    expect(host.querySelector('app-import-energy-uses .energy-use-import__table tbody')?.children).toHaveLength(2);
    component.closeDetails(); view.detectChanges();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });

  it('keeps import unavailable without a fiscal year, recalculates after typed year edits, and validates integer years', () => {
    const { view, component, preparePreview, state } = setup(null);
    expect(preparePreview).not.toHaveBeenCalled();
    expect(view.nativeElement.querySelector('table')).toBeNull();
    component.year.setValue(2024); view.detectChanges();
    expect(state.preview()?.year).toBe(2024);
    expect(preparePreview).toHaveBeenCalledTimes(1);
    component.year.setValue(2024.5); view.detectChanges();
    expect(component.year.invalid).toBe(true);
    expect(state.preview()).toBeUndefined();
    expect(state.canImport()).toBe(false);
    expect(preparePreview).toHaveBeenCalledTimes(1);
  });

  it('updates skip decisions and summary counts on the same page and disables editing during persistence', () => {
    const { view, component, state, session } = setup();
    expect(state.canImport()).toBe(false);
    component.rows().find(entry => entry.row.importedRow === 3)!.skip.setValue(true);
    view.detectChanges();
    expect(state.canImport()).toBe(true);
    expect(component.skippedCount()).toBe(1);
    expect(view.nativeElement.textContent).toContain('Skipped');
    session.setPending(true); view.detectChanges();
    expect(component.year.disabled).toBe(true);
    expect(component.rows().every(entry => entry.skip.disabled)).toBe(true);
  });

  it('requires an explicit review after saved data changes and keeps stale skip decisions unchanged', () => {
    const { view, component, state, revision, error } = setup();
    revision.set(2); view.detectChanges();
    expect(state.reviewStale()).toBe(true);
    component.rows()[0].skip.setValue(true); view.detectChanges();
    expect(component.rows()[0].skip.value).toBe(false);
    expect(error()).toContain('Saved data changed');
    component.review(); view.detectChanges();
    expect(state.reviewStale()).toBe(false);
    expect(state.preview()?.revision).toBe(2);
  });
});
