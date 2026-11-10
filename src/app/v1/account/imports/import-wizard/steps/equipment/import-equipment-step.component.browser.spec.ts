import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PortalModule } from '@angular/cdk/portal';
import { page, userEvent } from 'vitest/browser';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { energyUseItem, energyUseGroup } from '@app/v1/data/energy-uses/energy-uses.testing';
import { ImportWizardStateService } from '../../import-wizard-state.service';
import { footprintEquipmentLinks, footprintMeterGroupOptions } from '../../footprint-equipment-mapping';
import { createImportWizardStateStub } from '../import-step.test-support';
import { ImportFootprintFacilityStepComponent } from '../footprint-facility/import-footprint-facility-step.component';
import { ImportEquipmentStepComponent } from './import-equipment-step.component';

@Component({ standalone: true, encapsulation: ViewEncapsulation.None, styleUrls: ['../../import-wizard.component.css'], imports: [ImportFootprintFacilityStepComponent, ImportEquipmentStepComponent, PortalModule],
  template: '<main class="v1-root import-page" style="width:100%;min-height:560px;padding:1rem">@if (equipment()) { <app-import-equipment-step/> } @else { <app-import-footprint-facility-step/> }<ng-template [cdkPortalOutlet]="modal.activePortal()"/></main>' })
class FootprintHost { readonly equipment = signal(false); readonly modal = inject(ModalPortalService); }

describe('Footprint import mapping presentation', () => {
  it('uses facility cards and grouped tables with cancelable meter/category slideouts', async () => {
    const state = createImportWizardStateStub();
    state.draft.update(draft => ({ ...draft, kind: 'footprint-tool', facilityEnergyUseGroups: [energyUseGroup({ accountId: 'account-1', facilityId: 'facility-1' })],
      facilityEnergyUseEquipment: [energyUseItem({ guid: 'pump', name: 'Pump', accountId: 'account-1', facilityId: 'facility-1', utilityMeterGroupIds: [] }),
        energyUseItem({ guid: 'boiler', name: 'Boiler', accountId: 'account-1', facilityId: 'facility-1', utilityMeterGroupIds: [], utilityData: [{ energySource: 'Natural Gas' } as never] })] }));
    const groups = ['electric', 'gas', 'gas-alternative'].map(guid => ({ guid, name: guid, accountId: 'account-1', facilityId: 'facility-1', groupType: 'Energy' }));
    const meters = groups.map(group => ({ ...group, groupId: group.guid, source: group.guid.startsWith('gas') ? 'Natural Gas' : 'Electricity' }));
    state.workspace.meterGroups.set(groups as never); state.workspace.meters.set(meters as never);
    state.setFootprintFacility.mockImplementation(guid => state.draft.update(draft => ({ ...draft, selectedFacilityId: guid })));
    state.setFootprintEquipmentMapping.mockImplementation((reviewed, mapping) => {
      const options = footprintMeterGroupOptions('account-1', 'facility-1', reviewed, groups as never, meters as never);
      state.draft.update(draft => ({ ...draft, facilityEnergyUseEquipment: draft.facilityEnergyUseEquipment.map(item => !reviewed.some(row => row.guid === item.guid) ? item :
        'category' in mapping ? { ...item, equipmentType: mapping.category } : { ...item, utilityMeterGroupIds: footprintEquipmentLinks(item, mapping.meterGroupIds, options) }) }));
      return true;
    });
    TestBed.configureTestingModule({ imports: [FootprintHost], providers: [{ provide: ImportWizardStateService, useValue: state.wizardState }] });
    const fixture = TestBed.createComponent(FootprintHost); fixture.detectChanges(); await fixture.whenStable();
    const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); };
    const root = fixture.nativeElement.querySelector('main') as HTMLElement;
    await page.viewport(1100, 850);
    await page.getByRole('button', { name: 'Main Plant', exact: true }).click(); await settle();
    expect(state.draft().selectedFacilityId).toBe('facility-1');
    await page.screenshot({ element: root, path: '../../../../../../../../.angular/phase5/footprint-facility.png' });
    fixture.componentInstance.equipment.set(true); await settle();
    await page.getByRole('button', { name: 'Link meter groups', exact: true }).click(); await settle();
    let dialog = page.getByRole('dialog', { name: 'Select Meter Groups' });
    await dialog.getByRole('checkbox', { name: 'gas', exact: true }).click(); await settle();
    expect(dialog.getByRole('checkbox', { name: 'gas-alternative', exact: true }).element()).toHaveProperty('disabled', true);
    await dialog.getByRole('checkbox', { name: 'electric', exact: true }).click(); await settle();
    expect(state.draft().facilityEnergyUseEquipment.every(item => !item.utilityMeterGroupIds.length)).toBe(true);
    await dialog.getByRole('button', { name: 'Apply', exact: true }).click(); await settle();
    expect(state.draft().facilityEnergyUseEquipment.map(item => item.utilityMeterGroupIds)).toEqual([['electric'], ['gas']]);
    const categoryButton = page.getByRole('button', { name: 'Set category for Boiler', exact: true });
    await categoryButton.click(); await settle();
    dialog = page.getByRole('dialog', { name: 'Select equipment category', exact: true });
    await dialog.getByRole('button', { name: 'Steam', exact: true }).click();
    await userEvent.keyboard('{Escape}'); await settle();
    expect(state.draft().facilityEnergyUseEquipment[1].equipmentType).toBe('Pump');
    expect(document.activeElement).toBe(categoryButton.element());
    await categoryButton.click(); await settle();
    await dialog.getByRole('button', { name: 'Steam', exact: true }).click();
    await dialog.getByRole('button', { name: 'Apply', exact: true }).click(); await settle();
    expect(state.draft().facilityEnergyUseEquipment[1].equipmentType).toBe('Steam');
    state.draft.update(draft => ({ ...draft, facilityEnergyUseGroups: [...draft.facilityEnergyUseGroups, energyUseGroup({ guid: 'other-group', name: 'Other equipment', accountId: 'account-1', facilityId: 'facility-1' })],
      facilityEnergyUseEquipment: [...draft.facilityEnergyUseEquipment, energyUseItem({ guid: 'other', name: 'Other item', energyUseGroupId: 'other-group', utilityMeterGroupIds: [], accountId: 'account-1', facilityId: 'facility-1' })] }));
    await settle();
    const sections = root.querySelectorAll<HTMLElement>('.equipment-group');
    expect(sections[1].getBoundingClientRect().top - sections[0].getBoundingClientRect().bottom).toBeGreaterThanOrEqual(parseFloat(getComputedStyle(document.documentElement).fontSize) - 1);
    const name = sections[0].querySelector('.equipment-name')!;
    expect(name.querySelector('.v1-badge')?.textContent).toBe('New');
    expect(root.textContent).not.toContain('Review equipment by');
    const cell = root.querySelector('tbody td')!;
    expect(getComputedStyle(cell).borderLeftWidth).toBe('0px');
    expect(getComputedStyle(cell).borderRightWidth).toBe('0px');
    for (const [width, theme] of [[1100, ''], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
      await page.viewport(width, 850); root.className = `v1-root import-page ${theme}`; await settle();
      expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
      await page.screenshot({ element: root, path: `../../../../../../../../.angular/phase5/footprint-table-${width}.png` });
    }
    await page.getByRole('button', { name: 'Select meter groups for Boiler', exact: true }).click(); await settle();
    dialog = page.getByRole('dialog', { name: 'Select Meter Groups', exact: true });
    await page.screenshot({ element: dialog.element(), path: '../../../../../../../../.angular/phase5/footprint-meter-slideout.png' });
    await dialog.getByRole('checkbox', { name: 'gas', exact: true }).click();
    await dialog.getByRole('button', { name: 'Apply', exact: true }).click(); await settle();
    expect(state.draft().facilityEnergyUseEquipment.map(item => item.utilityMeterGroupIds)).toEqual([['electric'], [], []]);
    fixture.destroy();
  });
});
