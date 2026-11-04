import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { page, userEvent } from 'vitest/browser';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { MeterSettingsFormService } from '@app/v1/shared/meter-settings/meter-settings-form.service';
import { FacilityMetersWorkspaceService } from '../../facility-meters-workspace.service';
import { account, facility, group, meter } from '../../facility-meters.testing';
import { MeterActionsService } from '../../meter-actions.service';
import { MetersModule } from '../../meters.module';
import { MeterWorkbenchSettingsComponent } from './meter-workbench-settings.component';

describe('meter source and group settings in Chromium', () => {
  it('retains an incompatible group until a compatible choice saves both settings and supports keyboard focus', async () => {
    await page.viewport(1440, 900);
    const { fixture, selectedMeter, execute, updateMeterWithData } = setup();
    const root = document.createElement('main');
    root.className = 'v1-root'; root.style.cssText = 'width:100%;min-height:0';
    document.body.append(root); root.append(fixture.nativeElement);
    fixture.detectChanges();
    const source = root.querySelector<HTMLSelectElement>('select[formControlName="source"]')!;
    const grouping = () => root.querySelector<HTMLSelectElement>('select[formControlName="groupId"]')!;
    try {
      const core = root.querySelector<HTMLElement>('app-meter-settings-core-form')!;
      const aside = root.querySelector<HTMLElement>('.meter-settings__aside')!;
      const groupSection = grouping().closest('section')!;
      const readingSection = root.querySelector<HTMLElement>('#meter-reading-settings')!;
      expect(aside.contains(grouping())).toBe(true);
      expect(core.contains(grouping())).toBe(false);
      expect(groupSection.getBoundingClientRect().left).toBeGreaterThanOrEqual(core.getBoundingClientRect().right);
      expect(groupSection.getBoundingClientRect().bottom).toBeLessThanOrEqual(readingSection.getBoundingClientRect().top);
      await page.viewport(390, 844); fixture.detectChanges();

      expect(source.disabled).toBe(false);
      expect(grouping().selectedOptions[0].textContent?.trim()).toBe('Energy group');
      expect(grouping().getAttribute('aria-describedby')).toBeNull();
      expect(root.querySelector('#meter-settings-group-help')).toBeNull();
      expect(root.textContent).not.toContain('Source and group changes save together.');
      const waterSource = [...source.options].find(option => option.textContent?.trim() === 'Water Intake')!;
      await page.getByRole('combobox', { name: /^Source/ }).selectOptions(waterSource.value);
      fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();

      expect(fixture.componentInstance.saveState()).toBe('invalid');
      expect(fixture.componentInstance.session.error()).toBeUndefined();
      expect(execute).not.toHaveBeenCalled(); expect(updateMeterWithData).not.toHaveBeenCalled();
      expect(selectedMeter()).toMatchObject({ source: 'Natural Gas', groupId: 'energy-group' });
      expect(fixture.componentInstance.formSignal()!.getRawValue()).toMatchObject({ source: 'Water Intake', groupId: 'energy-group' });
      const groupSelect = grouping();
      expect(groupSelect.selectedOptions[0].textContent?.trim()).toBe('Energy group (incompatible)');
      expect(groupSelect.selectedOptions[0].disabled).toBe(true);
      expect([...groupSelect.options].map(option => option.textContent?.trim())).toEqual([
        'Energy group (incompatible)', 'Ungrouped', 'Water group'
      ]);
      expect(groupSelect.getAttribute('aria-invalid')).toBe('true');
      const explanation = root.querySelector<HTMLElement>('#meter-settings-group-error')!;
      expect(explanation.getAttribute('role')).toBe('alert');
      expect(explanation.textContent).toContain('cannot contain Water Intake meters');
      expect(explanation.textContent).toContain('Choose a compatible group or Ungrouped.');
      expect(groupSelect.getAttribute('aria-describedby')).toBe(explanation.id);
      expect(root.textContent).not.toContain('Settings could not be saved');
      expect(root.textContent).not.toContain('The meter source is incompatible with its group.');
      expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
      expect(groupSelect.getBoundingClientRect().right).toBeLessThanOrEqual(root.getBoundingClientRect().right + 1);
      await page.screenshot({ element: root, path: '../../../../../../../.angular/meter-source-group-review.png' });

      groupSelect.focus();
      expect(document.activeElement).toBe(groupSelect);
      await userEvent.keyboard('{Tab}');
      expect(document.activeElement).toBe(root.querySelector('input[formControlName="canBeNegative"]'));
      await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
      expect(document.activeElement).toBe(groupSelect);
      const waterGroup = [...groupSelect.options].find(option => option.textContent?.trim() === 'Water group')!;
      await page.getByRole('combobox', { name: /^Meter group/ }).selectOptions(waterGroup.value);
      fixture.detectChanges();
      await vi.waitFor(() => expect(updateMeterWithData).toHaveBeenCalledOnce());
      await fixture.whenStable(); fixture.detectChanges();
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
      });

      expect(execute).toHaveBeenCalledOnce();
      expect(updateMeterWithData).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
        guid: 'meter-a', source: 'Water Intake', groupId: 'water-group', startingUnit: 'gal'
      }), [], 'account-a');
      expect(selectedMeter()).toMatchObject({ source: 'Water Intake', groupId: 'water-group' });
      expect(grouping().selectedOptions[0].textContent?.trim()).toBe('Water group');
      expect(root.querySelector('#meter-settings-group-error')).toBeNull();
      expect(grouping().getAttribute('aria-describedby')).toBeNull();
      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
      expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
      await page.screenshot({ element: root, path: '../../../../../../../.angular/meter-source-group-saved.png' });
    } finally {
      fixture.destroy(); root.remove(); await page.viewport(1100, 850);
    }
  });
});

function setup() {
  const activeAccount = signal(account({ assessmentReportVersion: 'AR6' }));
  const selectedFacility = signal(facility({ energyUnit: 'MMBtu', electricityUnit: 'kWh', volumeGasUnit: 'SCF',
    volumeLiquidUnit: 'gal', massUnit: 'lb' }));
  const selectedMeter = signal(meter({ id: 1, name: 'Gas main', source: 'Natural Gas', scope: 1,
    startingUnit: 'SCF', energyUnit: 'MMBtu', heatCapacity: .001, siteToSource: 1.09, groupId: 'energy-group',
    waterIntakeType: 'Municipal (Potable)', charges: [] }));
  const readings = signal([]);
  const canWrite = signal(true);
  const pending = signal<readonly { id: number; label: string; ownerId?: string }[]>([]);
  const hasPending = computed(() => pending().length > 0);
  const updateMeterWithData = vi.fn(async (value: IdbUtilityMeter) => value);
  const execute = vi.fn(async (options: { label: string; ownerId?: string }, persist: () => Promise<IdbUtilityMeter>) => {
    pending.set([{ id: 1, label: options.label, ownerId: options.ownerId }]);
    try {
      const value = await persist(); selectedMeter.set(value); return { value };
    } finally { pending.set([]); }
  });
  TestBed.configureTestingModule({ imports: [MetersModule], providers: [
    provideRouter([]), MeterSettingsFormService,
    { provide: ActivatedRoute, useValue: { snapshot: { fragment: null } } },
    { provide: FacilityMetersWorkspaceService, useValue: {
      account: activeAccount, facility: selectedFacility, selectedMeter, selectedMeterGuid: signal('meter-a'),
      selectedMeterCard: computed(() => ({ meter: selectedMeter(), readingCount: 0 })), selectedMeterData: readings,
      canWrite, hasPending
    } },
    { provide: AccountWorkspaceStore, useValue: {
      account: activeAccount, facilities: computed(() => [selectedFacility()]), selectedFacility,
      meters: computed(() => [selectedMeter()]), meterData: readings,
      meterGroups: signal([
        group({ guid: 'energy-group', name: 'Energy group', groupType: 'Energy' }),
        group({ guid: 'other-energy-group', name: 'Other energy group', groupType: 'Energy' }),
        group({ guid: 'water-group', name: 'Water group', groupType: 'Water' }),
        group({ guid: 'offsite-water-group', name: 'Offsite water group', groupType: 'Water', facilityId: 'facility-b' }),
        group({ guid: 'foreign-water-group', name: 'Other account water group', groupType: 'Water', accountId: 'account-b' })
      ]),
      customFuels: signal([]), customGWPs: signal([]), canWrite, hasPending, pendingOperations: pending
    } },
    { provide: WorkspaceCommandBoundary, useValue: { execute } },
    { provide: MeterCommandHandler, useValue: { updateMeterWithData } },
    { provide: MeterActionsService, useValue: { deleteMeter: vi.fn() } },
    { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } },
    { provide: WorkspaceNavigationService, useValue: { openFacilityInventory: vi.fn() } }
  ] });
  return { fixture: TestBed.createComponent(MeterWorkbenchSettingsComponent), selectedMeter, execute, updateMeterWithData };
}
