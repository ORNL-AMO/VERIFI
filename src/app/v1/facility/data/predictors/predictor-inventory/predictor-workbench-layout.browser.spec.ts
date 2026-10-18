import { computed } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { SessionStorageService } from 'ngx-webstorage';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { PredictorWorkbenchComponent } from '../predictor-workbench/predictor-workbench.component';
import { PredictorWorkbenchContextService } from '../predictor-workbench/predictor-workbench-context.service';
import { WeatherPredictorWorkbenchComponent } from '../weather-predictor-workbench/weather-predictor-workbench.component';
import { WeatherPredictorWorkbenchContextService } from '../weather-predictor-workbench/weather-predictor-workbench-context.service';
import { inventoryNavigation, inventoryWorkspace } from './predictor-inventory.testing';

describe('Predictor workbench identity and sticky facts in Chromium', () => {
  for (const weather of [false, true]) it(`keeps ${weather ? 'weather' : 'standard'} identity and tabs connected as facts collapse`, async () => {
    const workspace = inventoryWorkspace();
    const context = { predictor: computed(() => workspace.predictors()[0]), card: computed(() => workspace.predictorCards()[0]),
      group: computed(() => workspace.weatherStationGroups()[0]), predictors: computed(() => workspace.weatherStationGroups()[0].predictors),
      findings: () => [], notFound: () => false, creating: () => false };
    const component = weather ? WeatherPredictorWorkbenchComponent : PredictorWorkbenchComponent;
    TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { firstChild: { snapshot: { data: {} } }, snapshot: { data: {} } } },
      { provide: SessionStorageService, useValue: { retrieve: () => null, store: vi.fn() } },
      { provide: FacilityPredictorsWorkspaceService, useValue: { ...workspace, standardPredictorCards: computed(() => workspace.predictorCards().filter(item => item.predictor.predictorType !== 'Weather')) } },
      { provide: WorkspaceNavigationService, useValue: inventoryNavigation }] });
    if (weather) TestBed.overrideComponent(WeatherPredictorWorkbenchComponent, { set: { providers: [{ provide: WeatherPredictorWorkbenchContextService, useValue: context }] } });
    else TestBed.overrideComponent(PredictorWorkbenchComponent, { set: { providers: [{ provide: PredictorWorkbenchContextService, useValue: context }] } });
    const root = document.createElement('main'); root.className = 'v1-root'; Object.assign(root.style, { height: '420px', width: '1000px', overflow: 'auto', minHeight: '0' }); document.body.append(root);
    const fixture = weather ? TestBed.createComponent(WeatherPredictorWorkbenchComponent) : TestBed.createComponent(PredictorWorkbenchComponent);
    root.append(fixture.nativeElement); fixture.detectChanges();
    const filler = document.createElement('div'); filler.style.height = '1200px'; fixture.nativeElement.append(filler);
    const facts = root.querySelector<HTMLElement>(weather ? '#v1-weather-workbench-facts' : '#v1-predictor-workbench-facts')!;
    const toggle = root.querySelector<HTMLButtonElement>('app-data-workbench-facts-toggle button')!;
    expect(facts.hidden).toBe(true); expect(root.querySelectorAll('app-page-identity nav a')).toHaveLength(2);
    expect(root.querySelector('app-data-workbench-tabs')).not.toBeNull();
    toggle.click(); fixture.detectChanges(); expect(facts.hidden).toBe(false);
    root.scrollTop = 150; await vi.waitFor(() => { fixture.detectChanges(); expect(facts.hidden).toBe(true); });
    expect(TestBed.inject(WorkbenchLayoutService).factsExpanded()).toBe(false);
    toggle.click(); fixture.detectChanges(); expect(facts.hidden).toBe(false);
    fixture.destroy(); root.remove();
  });
});
