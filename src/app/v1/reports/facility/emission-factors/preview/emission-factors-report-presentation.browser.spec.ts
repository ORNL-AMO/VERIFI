import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PortalModule } from '@angular/cdk/portal';
import { page, userEvent } from 'vitest/browser';
import { of } from 'rxjs';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { emissionFactorsRates, emissionFactorsSnapshot } from '@domain/reports/testing/emission-factors-fixtures';
import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';
import { EmissionFactorsReportService } from '../emission-factors-report.service';

@Component({ standalone: true, imports: [PortalModule], host: { style: 'display:contents' },
  template: '<div class="v1-root v1-palette-blueprint" style="display:contents"><ng-container [cdkPortalOutlet]="modal.activePortal()"/></div>' })
class EmissionFactorsPortalHost { readonly modal = inject(ModalPortalService); }

describe('Emission Factors Present mode in Chromium', () => {
  afterEach(async () => {
    TestBed.resetTestingModule(); vi.restoreAllMocks();
    if (document.fullscreenElement) await document.exitFullscreen();
    await page.viewport(1280, 900);
  });
  it.each(['fullscreen', 'window'] as const)('presents both categories in %s mode without saving or recalculating', async mode => {
    await page.viewport(mode === 'window' ? 390 : 1280, 900);
    if (mode === 'window') vi.spyOn(HTMLElement.prototype, 'requestFullscreen').mockRejectedValue(new Error('Denied'));
    const snapshot = emissionFactorsSnapshot();
    const view = await setupReportWorkbench(snapshot.facilityReports, [
      { provide: EGridService, useValue: { builtinEmissions: () => emissionFactorsRates() } },
      { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase: () => of({ state: 'idle', meters: [] }), retry: vi.fn() } }
    ], snapshot);
    const workbench = await view.open('report-a', 'report'), root = view.harness.fixture.nativeElement as HTMLElement;
    root.className = 'v1-root v1-palette-blueprint';
    const session = workbench.workbench.session()!, report = session.injector.get(EmissionFactorsReportService);
    await vi.waitFor(() => { view.harness.detectChanges(); expect(report.state().state).toBe('ready'); });
    await view.harness.fixture.whenStable();
    const result = report.state().value, saved = structuredClone(view.store.facilityReports());
    const preview = root.querySelector<HTMLElement>('app-emission-factors-report-preview')!;
    const contents = [...preview.querySelectorAll('article')].map(article => article.textContent);
    const mount = root.parentElement!, portal = TestBed.createComponent(EmissionFactorsPortalHost); portal.autoDetectChanges();
    mount.appendChild(root); root.appendChild(portal.nativeElement); await portal.whenStable();
    const present = [...root.querySelectorAll<HTMLButtonElement>('footer button')].find(button => button.textContent?.trim() === 'Present')!;
    expect(present).toBeDefined(); expect(session.runtime.output!.formats).toEqual(['pdf']);
    await page.getByRole('button', { name: 'Present', exact: true }).click(); await portal.whenStable();
    const dialog = (portal.nativeElement as HTMLElement).querySelector<HTMLElement>('[role=dialog]')!;
    expect(dialog).not.toBeNull();
    if (mode === 'fullscreen') await vi.waitFor(() => expect(document.fullscreenElement).toBe(dialog));
    else expect(dialog.querySelector('[role=status]')?.textContent).toContain('Fullscreen is unavailable');
    expect(preview.querySelector('article')).toBeNull();
    expect([...dialog.querySelectorAll('article')].map(article => article.textContent)).toEqual(contents);
    const width = dialog.querySelector('article')!.getBoundingClientRect().width;
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click(); await portal.whenStable();
    expect(dialog.querySelector('article')!.getBoundingClientRect().width).toBeCloseTo(width * 1.1, 0);
    await page.getByRole('button', { name: 'Close presentation', exact: true }).click(); await portal.whenStable();
    await vi.waitFor(() => expect(document.fullscreenElement).toBeNull());
    expect(preview.querySelectorAll('article')).toHaveLength(2); expect(document.activeElement).toBe(present);
    expect(report.state().value).toBe(result); expect(view.store.facilityReports()).toEqual(saved);
    expect(view.updateSetup).not.toHaveBeenCalled();
    await page.getByRole('button', { name: 'Present', exact: true }).click(); await portal.whenStable();
    if (mode === 'fullscreen') {
      view.store.setPending({ id: 701, label: 'Pending source data' }); view.harness.detectChanges(); await portal.whenStable();
      await vi.waitFor(() => expect((portal.nativeElement as HTMLElement).querySelector('[role=dialog]')).toBeNull());
      view.store.clearPending(701);
    } else { await view.open('report-a', 'setup'); await portal.whenStable(); }
    expect(session.runtime.presentation!.available()).toBe(false);
    portal.destroy();
  });
});
