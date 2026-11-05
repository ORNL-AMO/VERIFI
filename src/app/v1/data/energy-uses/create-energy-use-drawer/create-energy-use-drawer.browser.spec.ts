import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { page, userEvent } from 'vitest/browser';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { EnergyUsesModule } from '../energy-uses.module';
import { EnergyUseActionsService } from '../energy-use-actions.service';
import { energyUseFacility, energyUseGroup, energyUseItem } from '../energy-uses.testing';
import { CreateEnergyUseDrawerComponent } from './create-energy-use-drawer.component';

function setup(initialFacility?: string, single = false) {
  const north = { ...energyUseFacility(), fiscalYear: 'calendarYear' as const, energyUnit: 'kWh' };
  const store = { account: signal({ guid: 'account-a' }), canWrite: signal(true), hasPending: signal(false),
    facilities: signal(single ? [north] : [north, { ...north, guid: 'facility-b', name: 'South plant' }]),
    energyUseGroups: signal([energyUseGroup(), energyUseGroup({ guid: 'group-b', facilityId: 'facility-b', name: 'Boilers' })]) };
  const actions = { create: vi.fn<EnergyUseActionsService['create']>(async () => energyUseItem()) };
  TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [{ provide: AccountWorkspaceStore, useValue: store }, { provide: EnergyUseActionsService, useValue: actions }] });
  const fixture = TestBed.createComponent(CreateEnergyUseDrawerComponent);
  if (initialFacility) fixture.componentRef.setInput('initialFacilityGuid', initialFacility);
  fixture.componentRef.setInput('singleFacility', single);
  const root = document.createElement('main'); root.className = 'v1-root'; root.style.height = '100vh';
  for (const variable of ['--v1-header-height', '--v1-rail-width', '--v1-section-nav-width', '--v1-support-panel-width']) root.style.setProperty(variable, '0px');
  root.append(fixture.nativeElement); document.body.append(root);
  return { fixture, root, actions, component: fixture.componentInstance };
}
async function settle(fixture: ComponentFixture<unknown>) { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); }

describe('simple Energy Use creation in Chromium', () => {
  it('selects facility and group, focuses the name, and creates from the keyboard', async () => {
    const view = setup();
    try {
      await settle(view.fixture);
      const dialog = page.getByRole('dialog', { name: 'Add energy use', exact: true });
      expect(view.root.querySelector('#energy-use-name')).toBeNull();
      await dialog.getByRole('button', { name: 'North plant', exact: true }).click(); await settle(view.fixture);
      await dialog.getByRole('button', { name: 'Production', exact: true }).click(); await settle(view.fixture);
      expect(document.activeElement?.id).toBe('energy-use-name');
      await dialog.getByRole('textbox', { name: 'Energy use name', exact: true }).fill('Process pump');
      await userEvent.keyboard('{Enter}'); await settle(view.fixture);
      expect(view.actions.create).toHaveBeenCalledTimes(1);
      expect(view.actions.create.mock.calls[0]).toEqual([expect.objectContaining({ group: { kind: 'existing', guid: 'group-a' }, settings: expect.objectContaining({ name: 'Process pump' }) }), 'account-a', 'facility-a', expect.any(Object)]);
    } finally { view.fixture.destroy(); view.root.remove(); }
  });

  it('pins facility context, names a new group without saving early, and protects the draft on Escape', async () => {
    const view = setup('facility-a', true);
    try {
      await settle(view.fixture);
      const dialog = page.getByRole('dialog', { name: 'Add energy use', exact: true });
      expect(view.root.querySelector('#energy-use-facility-search')).toBeNull();
      await dialog.getByRole('button', { name: 'Create energy-use group', exact: true }).click(); await settle(view.fixture);
      expect(document.activeElement?.id).toBe('energy-use-group-name');
      await dialog.getByRole('textbox', { name: 'Group name', exact: true }).fill('Roasting');
      await userEvent.keyboard('{Enter}'); await settle(view.fixture);
      expect(view.actions.create).not.toHaveBeenCalled();
      await dialog.getByRole('textbox', { name: 'Energy use name', exact: true }).fill('Burner train');
      await userEvent.keyboard('{Escape}'); await settle(view.fixture);
      const discard = page.getByRole('dialog', { name: 'Discard energy use?', exact: true });
      expect(discard.element().contains(document.activeElement)).toBe(true);
      await userEvent.keyboard('{Tab}{Shift>}{Tab}{/Shift}');
      expect(discard.element().contains(document.activeElement)).toBe(true);
      await userEvent.keyboard('{Escape}'); await settle(view.fixture);
      expect(view.root.querySelectorAll('[role="dialog"]')).toHaveLength(1);
      expect((dialog.getByRole('textbox', { name: 'Energy use name', exact: true }).element() as HTMLInputElement).value).toBe('Burner train');
      await dialog.getByRole('button', { name: 'Create energy use', exact: true }).click(); await settle(view.fixture);
      expect(view.actions.create).toHaveBeenCalledTimes(1);
      expect(view.actions.create.mock.calls[0][0]).toMatchObject({ group: { kind: 'new', name: 'Roasting' }, settings: { name: 'Burner train' } });
    } finally { view.fixture.destroy(); view.root.remove(); }
  });

  it('fits the progressive choices and pinned selections in light, dark, and high-contrast windows', async () => {
    for (const [width, theme, label] of [[1200, '', 'light'], [390, 'v1-theme-dark', 'dark'], [390, 'v1-theme-dark v1-contrast-strong', 'contrast']] as const) {
      await page.viewport(width, 850);
      const view = setup(); view.root.className = `v1-root ${theme}`;
      try {
        await settle(view.fixture);
        const dialog = page.getByRole('dialog', { name: 'Add energy use', exact: true });
        for (const step of ['facility', 'group', 'name'] as const) {
          const panel = dialog.element() as HTMLElement;
          expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth + 1);
          expect(view.root.querySelectorAll('select,input[type="number"],textarea,app-energy-use-settings-fields')).toHaveLength(0);
          await page.screenshot({ element: panel, path: `./__screenshots__/creation-${step}-${width}-${label}.png` });
          if (step === 'facility') await dialog.getByRole('button', { name: 'North plant', exact: true }).click();
          if (step === 'group') await dialog.getByRole('button', { name: 'Production', exact: true }).click();
          await settle(view.fixture);
        }
      } finally { view.fixture.destroy(); view.root.remove(); TestBed.resetTestingModule(); }
    }
  });
});
