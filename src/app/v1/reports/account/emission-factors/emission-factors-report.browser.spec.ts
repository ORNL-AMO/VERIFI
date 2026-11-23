import { Component, inject } from '@angular/core';
import { PortalModule } from '@angular/cdk/portal';
import { TestBed } from '@angular/core/testing';
import { page, userEvent } from 'vitest/browser';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { emissionFactorsRates } from '@domain/reports/testing/emission-factors-fixtures';
import { setupAccountReportWorkbench } from '../testing/account-report-workbench-test-setup';
import { accountEmissionFactorsSnapshot } from './testing/emission-factors-fixtures';
import { AccountEmissionFactorsReportService } from './emission-factors-report.service';

@Component({ standalone: true, imports: [PortalModule], host: { style: 'display:contents' },
  template: '<div class="v1-root v1-palette-blueprint" style="display:contents"><ng-container [cdkPortalOutlet]="modal.activePortal()"/></div>' })
class PresentationPortalHost { readonly modal = inject(ModalPortalService); }

describe('account Emission Factors in Chromium', () => {
  afterEach(async () => { TestBed.resetTestingModule(); vi.restoreAllMocks(); vi.unstubAllGlobals(); await page.viewport(1280, 900); });
  it.each([
    ['light', [], 1280], ['dark', ['v1-theme-dark'], 760], ['high-contrast', ['v1-theme-dark', 'v1-contrast-strong'], 390]
  ] as const)('saves typed setup and groups both factor categories in each facility card in %s', async (theme, classes, width) => {
    vi.stubGlobal('Worker', undefined);
    await page.viewport(width, 1000);
    const snapshot = accountEmissionFactorsSnapshot();
    snapshot.meters[0].name = 'Purchased electricity for the production area with a long descriptive name';
    const view = await setupAccountReportWorkbench(snapshot, [
      { provide: EGridService, useValue: { builtinEmissions: () => emissionFactorsRates() } },
      { provide: WorkspaceCalendarizationService, useClass: WorkspaceCalendarizationService }
    ]);
    const workbench = await view.open();
    const root = view.harness.fixture.nativeElement as HTMLElement;
    root.className = ['v1-root', 'v1-palette-blueprint', ...classes].join(' ');
    Object.assign(root.style, { width: '100%', minWidth: '0', display: 'block' });
    const service = workbench.workbench.session()!.injector.get(AccountEmissionFactorsReportService);
    await vi.waitFor(() => { view.harness.detectChanges(); expect(service.years()).toEqual([2022, 2023, 2024]); });
    expect(view.updateSetup).not.toHaveBeenCalled();
    expect(root.querySelector('app-report-setup-delete')).not.toBeNull();
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Account factors revised');
    const start = root.querySelector<HTMLSelectElement>('#emission-factors-start')!;
    start.focus(); await userEvent.keyboard('{ArrowDown}');
    await page.getByRole('link', { name: 'Continue', exact: true }).click();
    await vi.waitFor(() => { view.harness.detectChanges(); expect(root.querySelectorAll('table')).toHaveLength(3); });
    expect(view.store.accountReports()[0].name).toBe('Account factors revised');
    const portions = [...root.querySelectorAll<HTMLElement>('.report-document')];
    expect(portions).toHaveLength(3); expect(portions[2].textContent).toContain('no meters with applicable emission factors');
    expect(portions.map(portion => portion.querySelectorAll('table').length)).toEqual([2, 1, 0]);
    const facilityHeading = portions[0].querySelector<HTMLElement>('.facility-heading')!;
    const categoryHeading = portions[0].querySelector<HTMLElement>('h3')!;
    expect(parseFloat(getComputedStyle(facilityHeading).fontSize)).toBeGreaterThan(parseFloat(getComputedStyle(categoryHeading).fontSize));
    expect(root.querySelectorAll('.document-title')).toHaveLength(1);
    for (const portion of portions) {
      expect(portion.getBoundingClientRect().right).toBeLessThanOrEqual(width + 1);
      expect(portion.scrollWidth).toBeLessThanOrEqual(portion.clientWidth);
    }
    await view.harness.fixture.whenStable();
    expect(root.querySelector('app-report-output-actions')).not.toBeNull();
    expect(root.querySelector('footer')?.textContent).toContain('Present');
    await page.screenshot({ path: `../../../../../../.angular/account-emission-factors-${theme}.png` });
    await view.open(); expect(workbench.workbench.session()!.injector.get(AccountEmissionFactorsReportService)).toBe(service);
  });
  it('presents the same facility content, restores focus, and closes when readiness is lost', async () => {
    vi.stubGlobal('Worker', undefined);
    vi.spyOn(HTMLElement.prototype, 'requestFullscreen').mockRejectedValue(new Error('Use window fallback'));
    const view = await setupAccountReportWorkbench(accountEmissionFactorsSnapshot(), [
      { provide: EGridService, useValue: { builtinEmissions: () => emissionFactorsRates() } }
    ]);
    await view.open('account-report', 'report');
    const root = view.harness.fixture.nativeElement as HTMLElement, mount = root.parentElement!;
    root.className = 'v1-root v1-palette-blueprint';
    const portal = TestBed.createComponent(PresentationPortalHost); portal.autoDetectChanges();
    mount.appendChild(root); root.appendChild(portal.nativeElement);
    await vi.waitFor(() => { view.harness.detectChanges(); expect(root.querySelector('footer')?.textContent).toContain('Present'); });
    const revision = view.store.revision();
    const present = [...root.querySelectorAll<HTMLButtonElement>('footer button')].find(button => button.textContent?.trim() === 'Present')!;
    present.focus(); present.click(); await portal.whenStable();
    expect(portal.nativeElement.querySelectorAll('table')).toHaveLength(3);
    expect(portal.nativeElement.querySelectorAll('.report-document')).toHaveLength(3);
    await page.getByRole('button', { name: 'Close presentation', exact: true }).click(); await portal.whenStable();
    expect(document.activeElement).toBe(present); expect(view.store.revision()).toBe(revision); expect(view.updateSetup).not.toHaveBeenCalled();
    present.click(); await portal.whenStable();
    view.store.publishCommittedPatch({ collections: [{ collection: 'meters', upsert: view.store.meters().map(meter => ({ ...meter, source: 'Water Intake' as const })) }] });
    view.harness.detectChanges(); await portal.whenStable();
    await vi.waitFor(() => expect(portal.nativeElement.querySelector('[role=dialog]')).toBeNull());
    expect(root.querySelector('footer')?.textContent).not.toContain('Present');
    portal.destroy();
  });
  it('uses account fiscal years and retains unavailable saved periods without writing defaults', async () => {
    vi.stubGlobal('Worker', undefined);
    const snapshot = accountEmissionFactorsSnapshot();
    Object.assign(snapshot.account, { fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: true });
    snapshot.accountReports[0].startYear = 2020;
    const view = await setupAccountReportWorkbench(snapshot, [{ provide: EGridService, useValue: { builtinEmissions: () => emissionFactorsRates() } }]);
    const workbench = await view.open(), service = workbench.workbench.session()!.injector.get(AccountEmissionFactorsReportService);
    await vi.waitFor(() => { view.harness.detectChanges(); expect(service.years()).toEqual([2023, 2024]); });
    const start = view.harness.fixture.nativeElement.querySelector('#emission-factors-start') as HTMLSelectElement;
    expect(start.selectedOptions[0].textContent).toContain('2020 (saved)'); expect(service.editor.setupValid()).toBe(true);
    expect(view.updateSetup).not.toHaveBeenCalled();
  });
});
