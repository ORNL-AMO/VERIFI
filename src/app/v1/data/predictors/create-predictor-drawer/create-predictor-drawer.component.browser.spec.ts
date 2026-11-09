import { PortalModule } from '@angular/cdk/portal';
import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { page, userEvent } from 'vitest/browser';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WeatherStationLookupService } from '@platform/weather/weather-station-lookup.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { DataModule } from '@app/v1/data/data.module';
import { DataInventoryComponent } from '@app/v1/data/inventory/data-inventory.component';
import { account, facility } from '@app/v1/data/meters/facility-meters.testing';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { PredictorWeatherWorkflowService } from '../predictor-weather-workflow.service';
import { PredictorWorkspaceActionsService } from '../predictor-workspace-actions.service';
import { WeatherPredictorWorkbenchContextService } from '../weather-predictor-workbench/weather-predictor-workbench-context.service';
import { WeatherPredictorSetupComponent } from '../weather-predictor-workbench/setup/weather-predictor-setup.component';
import { CreatePredictorDrawerComponent } from './create-predictor-drawer.component';

@Component({ standalone: true, imports: [DataModule, RouterOutlet, PortalModule],
  template: '<main class="v1-root"><router-outlet/><ng-template [cdkPortalOutlet]="modal.activePortal()"/></main>' })
class PredictorCreationHost { readonly modal = inject(ModalPortalService); }

describe('Predictor creation through inventory and Weather setup', () => {
  it('creates Standard with production, carries checked Weather types, and opens station lookup once', async () => {
    await page.viewport(1200, 800);
    const activeAccount = signal(account());
    const revision = signal(1);
    const owner = signal(facility({ guid: 'facility-b', name: 'Beta', city: 'Oak Ridge', state: 'TN' }));
    const actions = { createPredictor: vi.fn().mockResolvedValue({ guid: 'new-standard', accountId: 'account-a', facilityId: 'facility-b' }) };
    const workflow = { state: signal({ status: 'idle', message: '' }), busy: signal(false), reset: vi.fn(),
      previewStationSelection: vi.fn(), previewStationGroup: vi.fn(), commitStationGroup: vi.fn() };
    const lookup = { getStation: vi.fn(), searchLocations: vi.fn(), findStations: vi.fn() };
    // Register the portal-created drawer directly so TestBed applies its provider override.
    TestBed.configureTestingModule({ imports: [PredictorCreationHost, CreatePredictorDrawerComponent], providers: [
      provideRouter([
        { path: '', pathMatch: 'full', component: DataInventoryComponent },
        { path: 'v1/workspace/facility/:facilityGuid/data/predictors/weather/new', component: WeatherPredictorSetupComponent }
      ]), ModalPortalService,
      { provide: AccountWorkspaceStore, useValue: { account: activeAccount, facilities: signal([facility(), owner()]),
        canWrite: signal(true), hasPending: signal(false) } },
      { provide: FacilityPredictorsWorkspaceService, useValue: { account: activeAccount, facility: owner, revision,
        weatherStationGroups: signal([]), predictorReadings: signal([]), defaultWeatherRange: signal(undefined),
        canWrite: signal(true), hasPending: signal(false) } },
      { provide: PredictorWeatherWorkflowService, useValue: workflow },
      { provide: WeatherStationLookupService, useValue: lookup },
      { provide: UnsavedChangesService, useValue: { register: vi.fn(() => vi.fn()), protectBeforeUnload: vi.fn(() => vi.fn()), confirmDiscard: vi.fn(() => true) } },
      { provide: WorkspaceNavigationService, useValue: {
        activeEnergyUseGroupGuid: () => undefined,
        isSingleSiteWorkspace: () => false, inventoryFacilityGuid: () => undefined, activePortfolioTab: signal('predictors'), uploadQuery: () => ({}),
        accountSettingsRoute: () => ['/settings'],
        facilityPredictorRoute: (facilityGuid: string, predictorGuid: string, tab: string) => ['/v1', 'workspace', 'facility', facilityGuid, 'data', 'predictors', predictorGuid, tab],
        facilityWeatherPredictorCreateRoute: (facilityGuid: string) => ['/v1', 'workspace', 'facility', facilityGuid, 'data', 'predictors', 'weather', 'new']
      } }
    ] }).overrideComponent(CreatePredictorDrawerComponent, { set: { providers: [{ provide: PredictorWorkspaceActionsService, useValue: actions }] } })
      .overrideComponent(WeatherPredictorSetupComponent, { set: { providers: [WeatherPredictorWorkbenchContextService] } });
    const fixture = TestBed.createComponent(PredictorCreationHost);
    const router = TestBed.inject(Router);
    const navigate = router.navigate.bind(router);
    const navigation = vi.spyOn(router, 'navigate').mockImplementation((commands, extras) =>
      commands.includes('new-standard') ? Promise.resolve(true) : navigate(commands, extras));
    await router.navigateByUrl('/'); fixture.detectChanges(); await fixture.whenStable();
    const root = fixture.nativeElement.querySelector('main') as HTMLElement;
    const choose = async (name: string) => {
      await page.getByRole('button', { name, exact: false }).click(); fixture.detectChanges(); await fixture.whenStable();
    };
    const screenshot = async (stage: string) => {
      for (const [width, theme] of [[1200, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
        await page.viewport(width, 800); root.className = `v1-root ${theme}`; fixture.detectChanges(); await fixture.whenStable();
        const panel = root.querySelector<HTMLElement>('[role="dialog"]')!;
        const body = panel.querySelector<HTMLElement>('.v1-workspace-slideout__body')!;
        expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth + 1);
        expect(getComputedStyle(panel.querySelector('.creation-selections')!).position).toBe('sticky');
        expect(panel.querySelector('.v1-workspace-slideout__footer')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(800);
        await page.screenshot({ element: panel, path: `../../../../../../.angular/predictor-${stage}-${width}-${theme.includes('contrast') ? 'contrast' : theme ? 'dark' : 'light'}.png` });
      }
    };
    try {
      await choose('Add predictor'); await choose('Beta');
      await screenshot('type');
      page.getByRole('button', { name: 'Standard predictor Enter monthly values directly.', exact: true }).element().focus();
      await userEvent.keyboard('{Enter}'); await fixture.whenStable();
      expect(document.activeElement?.id).toBe('predictor-name');
      await page.getByRole('textbox', { name: 'Predictor name', exact: true }).fill('Production');
      await page.getByRole('checkbox', { name: 'Is production?', exact: true }).click();
      await screenshot('standard');
      root.querySelector<HTMLButtonElement>('button[type="submit"][form="predictor-draft"]')!.click(); await fixture.whenStable(); fixture.detectChanges();
      expect(actions.createPredictor).toHaveBeenCalledExactlyOnceWith({ name: 'Production', production: true, predictorType: 'Standard' }, 'facility-b');
      expect(navigation).toHaveBeenCalledWith(['/v1', 'workspace', 'facility', 'facility-b', 'data', 'predictors', 'new-standard', 'settings']);
      expect(root.querySelector('[role="dialog"]')).toBeNull();
      await choose('Add predictor'); await choose('Beta'); await choose('Weather predictors Calculate values from weather data.');
      await page.getByRole('checkbox', { name: 'Heating degree days', exact: true }).click();
      const continueButton = page.getByRole('button', { name: 'Continue to setup', exact: true });
      expect((continueButton.element() as HTMLButtonElement).disabled).toBe(true);
      await page.getByRole('checkbox', { name: 'Cooling degree days', exact: true }).click();
      await page.getByRole('checkbox', { name: 'Relative humidity', exact: true }).click();
      await screenshot('weather');
      await continueButton.click(); await fixture.whenStable(); fixture.detectChanges(); await fixture.whenStable();
      expect(router.url).toContain('weatherType=CDD'); expect(router.url).toContain('weatherType=relativeHumidity');
      expect(router.url).not.toContain('weatherType=HDD');
      expect(root.querySelector('[role="dialog"]')?.textContent).toContain('Choose weather station');
      const types = [...root.querySelectorAll<HTMLSelectElement>('.weather-setup__definition select')].map(select => select.value);
      expect(types).toEqual(['CDD', 'relativeHumidity']);
      const search = root.querySelector<HTMLInputElement>('#weather-location-search')!;
      expect(search.value).toBe('Oak Ridge, TN');
      expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull();
      await userEvent.keyboard('{Escape}'); fixture.detectChanges(); await fixture.whenStable();
      expect(root.querySelector('[role="dialog"]')).toBeNull();
      expect(document.activeElement?.textContent).toContain('Choose station');
      const name = root.querySelector<HTMLInputElement>('.weather-setup__definition input[type="text"]')!;
      name.value = 'Custom cooling'; name.dispatchEvent(new Event('input', { bubbles: true })); fixture.detectChanges();
      await router.navigateByUrl(router.url.replace('weatherType=CDD&weatherType=relativeHumidity', 'weatherType=precipitation'));
      revision.set(2); fixture.detectChanges(); await fixture.whenStable();
      expect([...root.querySelectorAll<HTMLSelectElement>('.weather-setup__definition select')].map(select => select.value)).toEqual(['CDD', 'relativeHumidity']);
      expect(name.value).toBe('Custom cooling'); expect(root.querySelector('[role="dialog"]')).toBeNull();
      expect(workflow.previewStationSelection).not.toHaveBeenCalled(); expect(workflow.commitStationGroup).not.toHaveBeenCalled();
      expect(lookup.searchLocations).not.toHaveBeenCalled(); expect(actions.createPredictor).toHaveBeenCalledOnce();
    } finally { fixture.destroy(); vi.restoreAllMocks(); await page.viewport(1200, 800); }
  });
});
