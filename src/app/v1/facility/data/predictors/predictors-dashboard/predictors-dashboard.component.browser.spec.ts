import { PortalModule } from '@angular/cdk/portal';
import { Component, computed, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { cdp, page, userEvent } from 'vitest/browser';
import * as echarts from 'echarts/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { AccountDataModule } from '@app/v1/account/data/account-data.module';
import { AccountPortfolioPredictorsTabComponent } from '@app/v1/account/data/portfolio/account-portfolio-predictors-tab/account-portfolio-predictors-tab.component';
import { PORTFOLIO_PALETTES, textContrast } from '@app/v1/account/data/portfolio/portfolio-browser-test.helpers';
import { PredictorDeletionPreview } from '@data/account-workspace/handlers/predictor-command-handler.service';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { PredictorWorkspaceActionsService } from '../predictor-workspace-actions.service';
import { inventoryNavigation, inventoryReading, inventoryWorkspace } from '../predictor-inventory/predictor-inventory.testing';
import { PredictorsDashboardComponent } from './predictors-dashboard.component';

@Component({ standalone: true, imports: [PredictorsDashboardComponent, PortalModule], template: '<div class="v1-root"><main style="height:500px;overflow:auto"><app-predictors-dashboard/></main><ng-template [cdkPortalOutlet]="portal.activePortal()"/></div>' })
class DashboardHost { readonly portal = inject(ModalPortalService); }

describe('compact Predictor journey in Chromium', () => {
  it('renders a large mixed inventory, previews stored values, manages selection, and adapts to themes and window sizes', async () => {
    await page.viewport(1600, 900);
    const workspace = inventoryWorkspace(64);
    workspace.predictors.update(items => items.map((item, index) => ({ ...item, name: index === 0 ? 'A long production predictor name for line one and several factory wing identifiers' : item.name })));
    workspace.predictorReadings.set(workspace.predictors().flatMap((item, index) => Array.from({ length: 24 - index % 5 }, (_, month) => inventoryReading(item.guid, { id: index * 100 + month + 1, guid: `${item.guid}-${month}`, year: 2024 + Math.floor(month / 12), month: month % 12 + 1, amount: month % 3 === 0 ? 0 : index + month - 5 }))));
    const originalCards = workspace.predictorCards;
    workspace.predictorCards = computed(() => originalCards().map((card, index) => ({ ...card, statusTone: (index % 3 === 0 ? 'danger' : index % 3 === 1 ? 'warning' : 'success') as 'danger' | 'warning' | 'success' })));
    const actions = { createPredictor: vi.fn(), copyPredictor: vi.fn(), deletePredictors: vi.fn(), previewDeletion: vi.fn((guids: readonly string[]): PredictorDeletionPreview => structuredClone({ facilityGuid: 'facility', predictors: workspace.predictors().filter(item => guids.includes(item.guid)), predictorData: workspace.predictorReadings().filter(item => guids.includes(item.predictorId)), facilityAnalyses: [] })) };
    TestBed.configureTestingModule({ imports: [DashboardHost], providers: [provideRouter([]), ModalPortalService,
      { provide: FacilityPredictorsWorkspaceService, useValue: workspace }, { provide: WorkspaceNavigationService, useValue: inventoryNavigation }, { provide: PredictorWorkspaceActionsService, useValue: actions }] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(DashboardHost); fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('.v1-root') as HTMLElement;
    const component = fixture.debugElement.query(By.directive(PredictorsDashboardComponent)).componentInstance as PredictorsDashboardComponent;
    await vi.waitFor(() => expect(root.querySelector('canvas')).not.toBeNull());
    expect(root.querySelectorAll('.predictor-directory__open')).toHaveLength(8);
    const columns = root.querySelector('.facility-predictors__columns')!;
    expect(getComputedStyle(columns).gridTemplateColumns.split(' ')).toHaveLength(2);
    await page.screenshot({ element: root, path: '../../../../../../../.angular/predictors-dashboard-wide.png' });
    const firstGuid = component.visible()[0].guid;
    await page.getByRole('button', { name: `Preview ${component.visible()[1].card.predictor.name}`, exact: true }).click(); fixture.detectChanges();
    expect(component.previewGuid()).not.toBe(firstGuid);
    expect(root.querySelector('.predictor-preview h2')?.textContent).toContain(component.preview()!.card.predictor.name);
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click(); fixture.detectChanges(); expect(component.zoom()).toEqual({ start: 20, end: 80 });
    const chart = echarts.getInstanceByDom(root.querySelector<HTMLElement>('.v1-meter-results-chart__chart')!)!;
    expect((chart.getOption() as any).series[0].data).toContain(0);
    await page.getByRole('button', { name: 'Select predictors', exact: true }).click(); fixture.detectChanges();
    await page.getByRole('button', { name: 'Select all matching', exact: true }).click(); fixture.detectChanges(); expect(component.selected()).toHaveLength(64);
    await page.getByRole('button', { name: 'Next predictor page', exact: true }).click(); fixture.detectChanges(); expect(component.selected()).toHaveLength(64);
    await page.getByRole('button', { name: 'Delete selected', exact: true }).click(); fixture.detectChanges();
    expect(root.querySelector('[role="dialog"]')?.textContent).toContain('64 predictors');
    expect(root.querySelector('[role="dialog"]')?.textContent).toContain('analysis references');
    await userEvent.keyboard('{Escape}'); fixture.detectChanges(); expect(component.selected()).toHaveLength(64);
    await page.getByRole('button', { name: 'Cancel selection', exact: true }).click(); fixture.detectChanges();
    await page.getByRole('button', { name: 'Expand list', exact: true }).click(); fixture.detectChanges(); expect(root.querySelectorAll('.predictor-directory__open')).toHaveLength(64);
    expect(root.querySelector('app-predictor-preview')).toBeNull();
    await page.getByRole('button', { name: 'Return to list and charts', exact: true }).click(); fixture.detectChanges();
    expect(document.activeElement?.textContent).toContain('Expand list');
    const search = page.getByRole('searchbox', { name: 'Find predictor, type, station, unit, or status' });
    await search.fill('p2'); fixture.detectChanges(); expect(component.matching().every(item => item.card.predictor.name.includes('p2'))).toBe(true);
    await search.fill(''); fixture.detectChanges();
    const scroll = root.querySelector('main')!; scroll.scrollTop = 300;
    await vi.waitFor(() => {
      const header = root.querySelector('.facility-predictors__sticky')!.getBoundingClientRect(), toolbar = root.querySelector('.facility-predictors__toolbar')!.getBoundingClientRect();
      expect(toolbar.top).toBeCloseTo(header.bottom, 0);
    });
    scroll.scrollTop = 0;
    for (const palette of PORTFOLIO_PALETTES) for (const dark of [false, true]) for (const contrast of [false, true]) {
      root.className = `v1-root v1-palette-${palette}${dark ? ' v1-theme-dark' : ''}${contrast ? ' v1-contrast-strong' : ''}`;
      for (const status of root.querySelectorAll<HTMLElement>('.predictor-directory__status')) {
        const probe = document.createElement('span'); probe.style.color = getComputedStyle(status).color;
        probe.style.background = status.closest('[data-tone="danger"], [data-tone="warning"]') ? getComputedStyle(root).getPropertyValue('--v1-surface') : getComputedStyle(status.closest('li')!).backgroundColor;
        document.body.append(probe); expect(textContrast(probe)).toBeGreaterThanOrEqual(status.closest('[data-tone="success"]') ? 3 : 4.5); probe.remove();
      }
    }
    root.className = 'v1-root'; await page.viewport(390, 700); fixture.detectChanges();
    await vi.waitFor(() => expect(getComputedStyle(columns).gridTemplateColumns.split(' ')).toHaveLength(1));
    expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    await page.screenshot({ element: root, path: '../../../../../../../.angular/predictors-dashboard-narrow.png' });
    workspace.predictors.update(items => items.slice(0, 3)); fixture.detectChanges();
    expect(root.querySelector('[aria-label="Predictor list display"]')).toBeNull();
    const open = root.querySelector<HTMLButtonElement>('.predictor-directory__open')!; open.focus(); await userEvent.keyboard('{Enter}'); expect(navigate).toHaveBeenCalled();
    const client = cdp() as { send(command: string, params: { media: string }): Promise<void> };
    await client.send('Emulation.setEmulatedMedia', { media: 'print' }); expect(getComputedStyle(root.querySelector('.facility-predictors__toolbar')!).display).toBe('none');
    await client.send('Emulation.setEmulatedMedia', { media: '' }); fixture.destroy(); await page.viewport(1600, 900);
  });
  it('keeps 60-plus facility sections distinct when stations and predictor names repeat', async () => {
    const workspace = inventoryWorkspace(3), facilities = Array.from({ length: 64 }, (_, index) => ({ ...workspace.facility()!, guid: `f${index}`, name: `Facility ${index}` }));
    const predictors = facilities.flatMap(facility => workspace.predictors().map(item => ({ ...item, guid: `${facility.guid}-${item.guid}`, facilityId: facility.guid })));
    TestBed.configureTestingModule({ imports: [AccountDataModule], providers: [provideRouter([]),
      { provide: AccountWorkspaceStore, useValue: { ...workspace, facilities: signal(facilities), predictors: signal(predictors), predictorData: signal([]) } },
      { provide: WorkspaceNavigationService, useValue: inventoryNavigation }, { provide: WorkspaceStatusService, useValue: { items: signal([]), state: signal('ready') } }] });
    const fixture = TestBed.createComponent(AccountPortfolioPredictorsTabComponent); fixture.nativeElement.classList.add('v1-root'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.portfolio-predictors__facility')).toHaveLength(64);
    expect(fixture.nativeElement.querySelectorAll('.predictor-directory__open')).toHaveLength(192);
    const stationIds = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.predictor-directory__station button')).map(item => item.dataset['browseId']);
    expect(new Set(stationIds).size).toBe(64);
    fixture.componentInstance.filtersForm.controls.search.setValue('Facility 63'); fixture.detectChanges(); expect(fixture.componentInstance.filteredEntries()).toHaveLength(3);
    fixture.destroy();
  });
});
