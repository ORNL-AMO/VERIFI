import { ImportUploadComponent } from '@app/v1/account/imports/import-upload/import-upload.component';
import { importSessionGuard } from '@app/v1/account/imports/import-session.guard';
import { PortalModule } from '@angular/cdk/portal';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { Component, inject } from '@angular/core';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { page, userEvent } from 'vitest/browser';
import { ImportWizardComponent } from '@app/v1/account/imports/import-wizard/import-wizard.component';
import { ImportReviewStepComponent } from '@app/v1/account/imports/import-wizard/steps/review/import-review-step.component';
import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';
import * as XLSX from 'xlsx';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { getNewIdbFacilityEnergyUseEquipment, IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { EnergyUsesExcelExportService } from '@shared/energy-uses-excel/energy-uses-excel-export.service';
import { ENERGY_USES_HEADERS, ENERGY_USES_SHEET } from '@shared/energy-uses-excel/energy-uses-excel-format';
import { ImportSessionService } from '@app/v1/account/imports/import-session.service';
import { ImportWizardDraftStore } from '@app/v1/account/imports/import-wizard/import-wizard-draft.store';
import { EnergyUsesImportStateService } from '@app/v1/account/imports/import-wizard/energy-uses-import-state.service';
import { SpreadsheetImportDraftService } from '../spreadsheet-import-draft.service';
import { EnergyUsesExcelImportService } from './energy-uses-excel-import.service';

const account = { ...getNewIdbAccount(), id: 1, guid: 'template-account' };
const facility = { ...getNewIdbFacility(account), id: 2, guid: 'template-facility', name: 'Plant' };
const group = { ...getNewIdbFacilityEnergyUseGroup(account.guid, facility.guid), id: 3, guid: 'template-group', name: 'Production' };
const meterGroup = { ...getNewIdbUtilityMeterGroup('Energy', 'Gas; boilers', facility.guid, account.guid), id: 4, guid: 'template-meter-group' };
const item: IdbFacilityEnergyUseEquipment = { ...getNewIdbFacilityEnergyUseEquipment(group, 2025), id: 5, guid: 'template-equipment',
  name: 'Heater', equipmentType: 'Process Heating', utilityMeterGroupIds: [meterGroup.guid],
  utilityData: [{ energySource: 'Natural Gas', size: 100, units: 'kJh', numberOfEquipment: 1,
    energyUse: [{ year: 2024, energyUse: 3, energyUseUnit: 'kWh', overrideEnergyUse: true },
      { year: 2025, energyUse: 5, energyUseUnit: 'kWh', overrideEnergyUse: true }] }] };

function workbook(rows: unknown[][]): XLSX.WorkBook {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([ENERGY_USES_HEADERS, ...rows]), ENERGY_USES_SHEET);
  return book;
}

@Component({ standalone: true, imports: [RouterOutlet, PortalModule], template: '<main class="v1-root"><router-outlet/><ng-template [cdkPortalOutlet]="modal.activePortal()"/></main>' })
class TemplateImportHost { readonly modal = inject(ModalPortalService); }
@Component({ standalone: true, template: 'Energy Uses inventory' })
class InventoryDestination {}

describe('Energy Uses template import and native recovery', () => {
  let harness: IndexedDbTestHarness;
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [ImportWizardDraftStore, EnergyUsesImportStateService,
      provideRouter([
        { path: 'v1/workspace/account/:accountGuid/imports/upload', component: ImportUploadComponent },
        { path: 'v1/workspace/account/:accountGuid/imports/file/:fileId', component: ImportWizardComponent, canActivateChild: [importSessionGuard], children: [
          { path: 'energy-use-year', pathMatch: 'full', redirectTo: 'review' },
          { path: 'energy-use-equipment', pathMatch: 'full', redirectTo: 'review' },
          { path: 'review', component: ImportReviewStepComponent, data: { importStep: 'review' } }
        ] },
        { path: 'v1/workspace/account/:accountGuid/data/portfolio/energy-uses', component: InventoryDestination }
      ]),
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }] });
    harness = await IndexedDbTestHarness.create('energy-uses-template');
    await harness.seed({ accounts: [account], facilities: [facility], facilityEnergyUseGroups: [group],
      utilityMeterGroups: [meterGroup], facilityEnergyUseEquipment: [{ ...item }] });
    await TestBed.inject(AccountWorkspaceService).selectAccount(account.guid);
  });
  afterEach(async () => { vi.restoreAllMocks(); await harness.destroy(); });

  function setup(rows?: unknown[][]) {
    const exporter = TestBed.inject(EnergyUsesExcelExportService);
    const savedRows = exporter.prepareExportData(2025, new Set([facility.guid])).rows;
    const changed = [...savedRows[0]]; changed[14] = 0;
    const draft = TestBed.inject(SpreadsheetImportDraftService).createDraft(new File([], 'VERIFI-Energy-Uses-2025.xlsx'), workbook(rows ?? [changed]));
    expect(draft.kind).toBe('energy-uses-template');
    TestBed.inject(ImportWizardDraftStore).initialize(draft);
    const state = TestBed.inject(EnergyUsesImportStateService);
    state.review();
    return { state, draft, exporter, savedRows };
  }

  it('imports an exported workbook through v1, retains zero overrides/history/links, and reopens unchanged', async () => {
    const { state, exporter } = setup();
    expect(state.preview()?.rows[0].action).toBe('Update');
    const published = vi.fn();
    const subscription = TestBed.inject(WorkspaceCommandBoundary).committedChange$.subscribe(published);
    const summary = await state.commit();
    subscription.unsubscribe();
    expect(summary.updated.energyUseEquipment).toBe(1);
    expect(summary.affectedFacilityGuids).toEqual([facility.guid]);
    expect(published).toHaveBeenCalledTimes(1);
    const saved = TestBed.inject(AccountWorkspaceStore).energyUseEquipment()[0];
    expect(saved.guid).toBe(item.guid);
    expect(saved.utilityMeterGroupIds).toEqual([meterGroup.guid]);
    expect(saved.utilityData[0].energyUse).toEqual([item.utilityData[0].energyUse[0], { ...item.utilityData[0].energyUse[1], energyUse: 0 }]);
    const exported = exporter.prepareExportData(2025, new Set([facility.guid]));
    const importer = TestBed.inject(EnergyUsesExcelImportService);
    const repeat = importer.preparePreview(importer.parseSheetWorkbook(workbook(exported.rows), 'VERIFI-Energy-Uses-2025.xlsx'), 2025);
    expect(repeat.rows[0].action).toBe('Unchanged');
    expect(repeat.canImport).toBe(false);
    await harness.reopen();
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([saved]);
  });

  it('removes queue entries with keyboard focus recovery while leaving saved equipment untouched', async () => {
    const { draft } = setup();
    const session = TestBed.inject(ImportSessionService);
    session.addDrafts([{ ...draft, id: 'cooling-file', name: 'Cooling.xlsx' }]);
    const view = TestBed.createComponent(TemplateImportHost); view.detectChanges();
    await TestBed.inject(Router).navigateByUrl(`/v1/workspace/account/${account.guid}/imports/upload`);
    view.detectChanges(); await view.whenStable();
    expect(view.nativeElement.querySelectorAll('.queue-process app-ui-icon[name="chevronRight"]')).toHaveLength(2);
    const first = page.getByRole('button', { name: 'Remove VERIFI-Energy-Uses-2025.xlsx from upload queue', exact: true });
    session.setPending(true); view.detectChanges();
    await expect.element(first).toBeDisabled();
    session.setPending(false); view.detectChanges();
    const root = view.nativeElement.querySelector('main') as HTMLElement;
    for (const [width, theme, label] of [[1200, '', 'wide'], [390, 'v1-theme-dark', 'narrow-dark']] as const) {
      await page.viewport(width, 850); root.className = `v1-root ${theme}`;
      view.detectChanges(); await view.whenStable();
      const queue = root.querySelector<HTMLElement>('[aria-labelledby="queue-title"]')!;
      expect(queue.scrollWidth).toBeLessThanOrEqual(queue.clientWidth + 1);
      await page.screenshot({ element: queue, path: `../../../../../.angular/phase5/upload-queue-${label}.png` });
    }
    (first.element() as HTMLButtonElement).focus();
    await userEvent.keyboard('{Enter}'); view.detectChanges(); await view.whenStable();
    expect(session.draft(draft.id)).toBeUndefined();
    const remaining = page.getByRole('button', { name: 'Remove Cooling.xlsx from upload queue', exact: true });
    expect(document.activeElement).toBe(remaining.element());
    await userEvent.keyboard('{Enter}'); view.detectChanges(); await view.whenStable();
    expect(session.drafts()).toEqual([]);
    expect(session.hasUnsavedChanges()).toBe(false);
    expect(document.activeElement).toBe(page.getByRole('button', { name: 'Browse files', exact: true }).element());
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([item]);
    view.destroy();
  });

  it('reviews fiscal year, summary, row details and skips on one page before atomic import', async () => {
    const exporter = TestBed.inject(EnergyUsesExcelExportService);
    const rows = exporter.prepareExportData(2025, new Set([facility.guid])).rows;
    rows[0][14] = 9;
    const invalid = [...rows[0]]; invalid[2] = 'Bad row'; invalid[13] = 1.5;
    const book = workbook([...rows, invalid]);
    const file = new File([XLSX.write(book, { type: 'array', bookType: 'xlsx' })], 'VERIFI-Energy-Uses-2025.xlsx');
    const draft = await TestBed.inject(SpreadsheetImportDraftService).readFile(file);
    TestBed.inject(ImportSessionService).addDrafts([draft]);
    const view = TestBed.createComponent(TemplateImportHost);
    view.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl(`/v1/workspace/account/${account.guid}/imports/file/${draft.id}/energy-use-year`);
    view.detectChanges(); await view.whenStable();
    expect(router.url).toContain('/review');
    await expect.element(page.getByRole('button', { name: 'Continue', exact: true })).not.toBeInTheDocument();
    const year = page.getByRole('spinbutton', { name: 'Fiscal year', exact: true });
    await year.fill('');
    view.detectChanges(); await view.whenStable();
    await expect.element(page.getByRole('button', { name: 'Import', exact: true })).toBeDisabled();
    await year.fill('2025');
    view.detectChanges(); await view.whenStable();
    await expect.element(page.getByRole('table').first()).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Import', exact: true })).toBeDisabled();
    const root = view.nativeElement.querySelector('main') as HTMLElement;
    for (const [width, theme, label] of [[1200, '', 'wide'], [390, 'v1-theme-dark', 'narrow-dark'], [390, 'v1-theme-dark v1-contrast-strong', 'narrow-contrast']] as const) {
      await page.viewport(width, 850);
      root.className = `v1-root ${theme}`;
      view.detectChanges(); await view.whenStable();
      expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
      await page.screenshot({ element: root, path: `../../../../../.angular/phase5/import-single-page-${label}.png` });
    }
    const changesButton = page.getByRole('button', { name: 'Show changes for Heater', exact: true });
    await changesButton.click();
    view.detectChanges(); await view.whenStable();
    const changesDialog = page.getByRole('dialog', { name: 'Changes for Heater', exact: true });
    await expect.element(changesDialog).toBeVisible();
    await expect.element(changesDialog.getByRole('table', { name: 'Changes for Heater', exact: true })).toBeVisible();
    await page.screenshot({ element: changesDialog.element(), path: '../../../../../.angular/phase5/import-change-slideout-narrow.png' });
    await userEvent.keyboard('{Escape}');
    view.detectChanges(); await view.whenStable();
    await expect.element(changesDialog).not.toBeInTheDocument();
    expect(document.activeElement).toBe(changesButton.element());
    await page.getByRole('checkbox', { name: 'Skip row 3: Bad row', exact: true }).click();
    view.detectChanges(); await view.whenStable();
    await expect.element(page.getByRole('button', { name: 'Import', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    view.detectChanges(); await view.whenStable();
    await expect.element(page.getByRole('heading', { name: 'Upload complete' })).toBeVisible();
    expect((await harness.getAll('facilityEnergyUseEquipment'))[0].utilityData).toEqual([
      { ...item.utilityData[0], energyUse: [item.utilityData[0].energyUse[0], { ...item.utilityData[0].energyUse[1], energyUse: 9 }] }
    ]);
    await page.getByRole('button', { name: 'View uploaded data' }).click();
    view.detectChanges(); await view.whenStable();
    expect(router.url).toBe(`/v1/workspace/account/${account.guid}/data/portfolio/energy-uses?facility=${facility.guid}`);
    view.destroy();
  });

  it('keeps a committed import on its recovery review when another queued file is selected', async () => {
    const { draft } = setup();
    const view = TestBed.createComponent(TemplateImportHost);
    view.detectChanges();
    const router = TestBed.inject(Router);
    const url = `/v1/workspace/account/${account.guid}/imports/file/${draft.id}/review`;
    await router.navigateByUrl(url);
    view.detectChanges(); await view.whenStable();
    const apply = vi.spyOn(TestBed.inject(EnergyUsesExcelImportService), 'apply');
    vi.spyOn(TestBed.inject(AccountWorkspaceService), 'reloadActiveWorkspace').mockRejectedValueOnce(new Error('Refresh interrupted'));
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    view.detectChanges(); await view.whenStable();
    const session = TestBed.inject(ImportSessionService);
    expect(session.navigationBlocked()).toBe(true);
    await router.navigateByUrl(`/v1/workspace/account/${account.guid}/imports/file/another-file/energy-use-year`);
    view.detectChanges(); await view.whenStable();
    expect(router.url).toBe(url);
    await page.getByRole('button', { name: 'Refresh saved changes', exact: true }).click();
    view.detectChanges(); await view.whenStable();
    await expect.element(page.getByRole('heading', { name: 'Upload complete' })).toBeVisible();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(session.navigationBlocked()).toBe(false);
    view.destroy();
  });

  it('requires row errors to be explicitly skipped and never creates groups belonging only to skipped rows', async () => {
    const rows = TestBed.inject(EnergyUsesExcelExportService).prepareExportData(2025, new Set([facility.guid])).rows;
    const changed = [...rows[0]]; changed[14] = 7;
    const invalid = [...rows[0]]; invalid[1] = 'New group'; invalid[2] = 'Invalid heater'; invalid[6] = 'not a number';
    const { state } = setup([changed, invalid]);
    expect(state.preview()?.canImport).toBe(false);
    const session = TestBed.inject(ImportSessionService);
    session.setPending(true);
    state.setYear(2026);
    state.skipRow(3, true);
    expect(state.draft()?.energyUses.year).toBe(2025);
    expect(state.preview()?.canImport).toBe(false);
    session.setPending(false);
    state.skipRow(3, true);
    expect(state.preview()?.canImport).toBe(true);
    expect(state.preview()?.newGroups).toEqual([]);
    await state.commit();
    expect(await harness.getAll('facilityEnergyUseGroups')).toEqual([group]);
    expect((await harness.getAll('facilityEnergyUseEquipment'))).toHaveLength(1);
  });

  it('rolls back a new group and every equipment row when one native request fails', async () => {
    const rows = TestBed.inject(EnergyUsesExcelExportService).prepareExportData(2025, new Set([facility.guid])).rows;
    const added = [...rows[0]]; added[1] = 'New group'; added[2] = 'Another heater';
    const { state } = setup([added]);
    const original = IndexedDbTransactionContext.prototype.add;
    vi.spyOn(IndexedDbTransactionContext.prototype, 'add').mockImplementation(function(store, value) {
      if (store === 'facilityEnergyUseEquipment') throw new Error('Injected import failure');
      return original.call(this, store, value);
    });
    await expect(state.commit()).rejects.toMatchObject({ persistenceCommitted: false });
    expect(await harness.getAll('facilityEnergyUseGroups')).toEqual([group]);
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([item]);
  });

  it('refreshes and reviews a cross-window conflict in the rendered workflow without losing the workbook or skips', async () => {
    const rows = TestBed.inject(EnergyUsesExcelExportService).prepareExportData(2025, new Set([facility.guid])).rows;
    const changedRow = [...rows[0]]; changedRow[14] = 0;
    const invalid = [...rows[0]]; invalid[2] = 'Bad row'; invalid[13] = 1.5;
    const { draft } = setup([changedRow, invalid]);
    const view = TestBed.createComponent(TemplateImportHost); view.detectChanges();
    await TestBed.inject(Router).navigateByUrl(`/v1/workspace/account/${account.guid}/imports/file/${draft.id}/review`);
    view.detectChanges(); await view.whenStable();
    await page.getByRole('checkbox', { name: 'Skip row 3: Bad row', exact: true }).click();
    view.detectChanges(); await view.whenStable();
    const changed = { ...item, notes: 'Another window saved this' };
    const workspace = TestBed.inject(AccountWorkspaceStore), revision = workspace.revision();
    await TestBed.inject(IndexedDbTransactionService).runTransaction(['facilityEnergyUseEquipment'], 'readwrite', tx => tx.put('facilityEnergyUseEquipment', changed));
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    view.detectChanges(); await view.whenStable();
    expect(workspace.revision()).toBe(revision);
    await expect.element(page.getByRole('button', { name: 'Import', exact: true })).toBeDisabled();
    await expect.element(page.getByRole('spinbutton', { name: 'Fiscal year', exact: true })).toBeDisabled();
    const current = TestBed.inject(ImportSessionService).draft(draft.id);
    expect(current.kind).toBe('energy-uses-template');
    if (current.kind !== 'energy-uses-template') throw new Error('Wrong draft kind');
    expect(current.energyUses.skippedRows).toEqual([3]);
    const savedWorkbook = current.energyUses.workbook;
    const reload = vi.spyOn(TestBed.inject(AccountWorkspaceService), 'reloadActiveWorkspace');
    reload.mockRejectedValueOnce(new Error('Refresh temporarily failed'));
    await page.getByRole('button', { name: 'Review saved data again', exact: true }).click();
    view.detectChanges(); await view.whenStable();
    await expect.element(page.getByRole('button', { name: 'Import', exact: true })).toBeDisabled();
    expect(current.energyUses.requiresWorkspaceRefresh).toBe(true);
    await page.getByRole('button', { name: 'Review saved data again', exact: true }).click();
    view.detectChanges(); await view.whenStable();
    await vi.waitFor(() => expect(current.energyUses.requiresWorkspaceRefresh).toBe(false));
    view.detectChanges(); await view.whenStable();
    expect(current.energyUses.workbook).toBe(savedWorkbook);
    expect(current.energyUses.skippedRows).toEqual([3]);
    expect(workspace.energyUseEquipment()[0].notes).toBe(changed.notes);
    await expect.element(page.getByRole('checkbox', { name: 'Skip row 3: Bad row', exact: true })).toBeChecked();
    await expect.element(page.getByRole('button', { name: 'Import', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    view.detectChanges(); await view.whenStable();
    await expect.element(page.getByRole('heading', { name: 'Upload complete' })).toBeVisible();
    expect((await harness.getAll('facilityEnergyUseEquipment'))).toHaveLength(1);
    expect((await harness.getAll<IdbFacilityEnergyUseEquipment & { [key: string]: unknown }>('facilityEnergyUseEquipment'))[0].utilityData[0].energyUse[1].energyUse).toBe(0);
    view.destroy();
  });

  it('recovers publication after a committed import without repeating persistence', async () => {
    const { state } = setup();
    const importer = TestBed.inject(EnergyUsesExcelImportService);
    const apply = vi.spyOn(importer, 'apply');
    vi.spyOn(TestBed.inject(AccountWorkspaceService), 'reloadActiveWorkspace').mockRejectedValueOnce(new Error('Refresh failed'));
    await expect(state.commit()).rejects.toMatchObject({ persistenceCommitted: true });
    expect(state.needsRefresh()).toBe(true);
    const summary = await state.commit();
    expect(summary.updated.energyUseEquipment).toBe(1);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(state.needsRefresh()).toBe(false);
    expect(TestBed.inject(AccountWorkspaceStore).energyUseEquipment()[0].utilityData[0].energyUse[1].energyUse).toBe(0);
  });
});
