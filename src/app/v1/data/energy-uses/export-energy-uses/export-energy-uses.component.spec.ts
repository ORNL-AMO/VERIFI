import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { EnergyUsesExcelExportService, prepareEnergyUsesExportData } from '@shared/energy-uses-excel/energy-uses-excel-export.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { NotificationService } from '@app/v1/shared/notifications/notification.service';
import { EnergyUsesModule } from '../energy-uses.module';
import { energyUseItem, energyUsesSnapshot } from '../energy-uses.testing';
import { ExportEnergyUsesComponent } from './export-energy-uses.component';

function setup() {
  const store = new AccountWorkspaceStore();
  store.publish(energyUsesSnapshot([energyUseItem(), energyUseItem({ guid: 'other', facilityId: 'facility-b', energyUseGroupId: 'other-group' })]));
  const exporter = { prepareExportData: (year: number, selected: ReadonlySet<string>) => prepareEnergyUsesExportData(store.snapshot()!, year, selected),
    createExport: vi.fn(async () => new Blob(['workbook'])), download: vi.fn() };
  const edits = { flushPendingChanges: vi.fn(async () => true), hasUnsavedChanges: vi.fn(() => false) };
  TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [
    { provide: AccountWorkspaceStore, useValue: store }, { provide: EnergyUsesExcelExportService, useValue: exporter },
    { provide: UnsavedChangesService, useValue: edits }, { provide: NotificationService, useValue: { success: vi.fn() } }
  ] });
  const fixture = TestBed.createComponent(ExportEnergyUsesComponent);
  fixture.componentRef.setInput('initialFacilityGuid', 'facility-a');
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, store, exporter, edits };
}

describe('Energy Uses export panel', () => {
  it('defaults to the scoped facility and latest saved year and includes all selected facility rows', () => {
    const { fixture, component } = setup();
    expect(component.year.value).toBe(2024);
    expect(component.data()?.rows).toHaveLength(1);
    component.facilityControls.controls['facility-b'].setValue(true);
    fixture.detectChanges();
    expect(component.data()?.rows).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('2 equipment rows');
    expect(fixture.nativeElement.querySelector('select').classList.contains('v1-select')).toBe(true);
  });

  it('retains selection and explains unresolved drafts without generating a stale workbook', async () => {
    const { fixture, component, exporter, edits } = setup();
    edits.hasUnsavedChanges.mockReturnValue(true);
    await component.export();
    fixture.detectChanges();
    expect(exporter.createExport).not.toHaveBeenCalled();
    expect(component.error()).toContain('resolve pending edits');
    expect(component.year.value).toBe(2024);
    edits.hasUnsavedChanges.mockReturnValue(false);
    await component.export();
    expect(exporter.download).toHaveBeenCalledTimes(1);
  });

  it('prevents duplicate generation and ignores delivery after account switches', async () => {
    const { fixture, component, exporter, store } = setup();
    let resolve!: (blob: Blob) => void;
    exporter.createExport.mockImplementation(() => new Promise<Blob>(done => resolve = done));
    const first = component.export();
    await Promise.resolve();
    await component.export();
    expect(exporter.createExport).toHaveBeenCalledTimes(1);
    store.publish({ ...store.snapshot()!, account: { ...store.account()!, guid: 'different-account' } });
    fixture.detectChanges();
    resolve(new Blob());
    await first;
    expect(exporter.download).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('retains failed download options for retry and disables empty selections', async () => {
    const { fixture, component, exporter } = setup();
    exporter.createExport.mockRejectedValueOnce(new Error('Template unavailable'));
    await component.export();
    expect(component.error()).toBe('Template unavailable');
    expect(component.selectedFacilities()).toEqual(new Set(['facility-a']));
    component.facilityControls.controls['facility-a'].setValue(false);
    fixture.detectChanges();
    expect(component.canExport()).toBe(false);
  });
});
