import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PortalModule } from '@angular/cdk/portal';
import { page, userEvent } from 'vitest/browser';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { echarts } from '@app/v1/shared/charts/echarts';
import { setupReportWorkbench } from '../../testing/report-workbench-test-setup';
import { dataQualityPredictorReadingsSnapshot } from '../testing/data-quality-report-test-fixtures';
import { DataQualityReportService } from '../data-quality-report.service';

@Component({ standalone: true, imports: [PortalModule], host: { style: 'display:contents' },
  template: `<div class="v1-root v1-palette-blueprint" [class.v1-theme-dark]="dark()" style="display:contents">
    <ng-container [cdkPortalOutlet]="modal.activePortal()"/>
  </div>` })
class DataQualityPresentationPortalHost {
  readonly modal = inject(ModalPortalService);
  readonly dark = signal(false);
}

describe('Data Quality report presentation in Chromium', () => {
  afterEach(async () => {
    TestBed.resetTestingModule(); vi.restoreAllMocks();
    if (document.fullscreenElement) await document.exitFullscreen();
    await page.viewport(1280, 720);
  });

  it.each(['fullscreen', 'window'] as const)('presents current meter and predictor content in %s mode without recalculating or saving', async mode => {
    await page.viewport(mode === 'window' ? 390 : 1280, 900);
    if (mode === 'window') vi.spyOn(HTMLElement.prototype, 'requestFullscreen').mockRejectedValue(new Error('Denied'));
    const snapshot = dataQualityPredictorReadingsSnapshot();
    snapshot.facilityReports[0].name = 'Facility Data Quality';
    const view = await setupReportWorkbench(snapshot.facilityReports, [], snapshot);
    const workbench = await view.open('report-a', 'report');
    const root = view.harness.fixture.nativeElement as HTMLElement;
    root.classList.add('v1-root');
    Object.assign(root.style, { display: 'block', height: '600px', overflow: 'auto',
      '--v1-rail-width': '0px', '--v1-section-nav-width': '0px', '--v1-support-panel-width': '0px', '--v1-header-height': '0px' });
    Object.assign(root.querySelector<HTMLElement>('app-facility-report-workbench')!.style,
      { display: 'flex', overflow: 'visible', minHeight: '100%' });
    const session = workbench.workbench.session()!;
    const results = session.injector.get(DataQualityReportService);
    await vi.waitFor(() => { view.harness.detectChanges(); expect(results.state().state).toBe('ready'); });
    await view.harness.fixture.whenStable();
    const preview = root.querySelector<HTMLElement>('app-data-quality-report-preview')!;
    const papers = Array.from(preview.querySelectorAll<HTMLElement>('article.report-document'));
    expect(papers).toHaveLength(2);
    const contents = papers.map(paper => paper.textContent), resultBefore = results.state().value;
    const saved = structuredClone(view.store.facilityReports()), revision = view.store.committedRevision();
    const mount = root.parentElement!;
    const portal = TestBed.createComponent(DataQualityPresentationPortalHost); portal.autoDetectChanges();
    // Keep the routed workbench connected when TestBed creates a second fixture root.
    mount.appendChild(root); root.appendChild(portal.nativeElement);
    portal.componentInstance.dark.set(mode === 'window'); await portal.whenStable();
    const actions = Array.from(root.querySelectorAll<HTMLButtonElement>('footer.v1-wizard-actions button'));
    expect(actions.map(button => button.textContent?.trim())).toEqual(['PDF', 'Present']);
    const present = actions[1]; expect(present.disabled).toBe(false);
    present.scrollIntoView(); const previousTop = root.scrollTop;
    await page.getByRole('button', { name: 'Present', exact: true }).click(); await portal.whenStable();
    const dialog = (portal.nativeElement as HTMLElement).querySelector<HTMLElement>('[role=dialog]')!;
    expect(dialog.getAttribute('aria-label')).toBe('Facility Data Quality presentation');
    if (mode === 'fullscreen') await vi.waitFor(() => expect(document.fullscreenElement).toBe(dialog));
    else expect(dialog.querySelector('[role=status]')?.textContent).toContain('Fullscreen is unavailable');
    expect(preview.querySelector('article')).toBeNull();
    const presented = Array.from(dialog.querySelectorAll<HTMLElement>('article.report-document'));
    expect(presented.map(paper => paper.textContent)).toEqual(contents);
    expect(presented.map(paper => paper.querySelector('h3')?.textContent?.trim())).toEqual(['Meter a', 'Predictor a']);
    expect(dialog.querySelector('[aria-label="Reset zoom to 100%"]')?.textContent).toContain('100%');
    const scroll = dialog.querySelector<HTMLElement>('.report-presentation__scroll')!;
    expect(scroll.scrollTop).toBe(0);
    const lockedTop = root.scrollTop;
    const chartElement = dialog.querySelector<HTMLElement>('.v1-meter-quality__chart, .quality-dot-plot__chart')!;
    chartElement.scrollIntoView();
    await vi.waitFor(() => expect(echarts.getInstanceByDom(chartElement)?.getWidth()).toBeGreaterThan(0));
    const chart = echarts.getInstanceByDom(chartElement)!;
    const paperWidth = presented[0].getBoundingClientRect().width;
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click(); await portal.whenStable();
    expect(presented[0].getBoundingClientRect().width).toBeCloseTo(paperWidth * 1.1, 0);
    expect(echarts.getInstanceByDom(chartElement)).toBe(chart);
    presented[1].scrollIntoView(); expect(scroll.scrollTop).toBeGreaterThan(0);
    expect(root.scrollTop).toBe(lockedTop);
    const close = dialog.querySelector<HTMLButtonElement>('.report-presentation__close')!;
    expect(dialog.scrollTop).toBe(0);
    expect(close.getBoundingClientRect().top).toBeGreaterThanOrEqual(dialog.getBoundingClientRect().top);
    expect(close.getBoundingClientRect().bottom).toBeLessThanOrEqual(scroll.getBoundingClientRect().top);
    await page.screenshot({ element: dialog, path: `../../../../../../../.angular/data-quality-presentation-${mode}.png` });
    if (mode === 'window') await userEvent.keyboard('{Escape}');
    else await page.getByRole('button', { name: 'Close presentation', exact: true }).click();
    await portal.whenStable(); await vi.waitFor(() => expect(document.fullscreenElement).toBeNull());
    expect(preview.querySelectorAll('article.report-document')).toHaveLength(2);
    expect(document.activeElement).toBe(present); expect(root.scrollTop).toBe(previousTop);
    expect(results.state().value).toBe(resultBefore);
    expect(workbench.workbench.session()).toBe(session);
    expect(view.store.facilityReports()).toEqual(saved); expect(view.store.committedRevision()).toBe(revision);
    expect(view.updateName).not.toHaveBeenCalled(); expect(view.updateSetup).not.toHaveBeenCalled();
    const generate = vi.spyOn(session.runtime.output!, 'generate').mockResolvedValue();
    actions[0].click(); expect(generate).toHaveBeenCalledExactlyOnceWith('pdf');
    await page.getByRole('button', { name: 'Present', exact: true }).click(); await portal.whenStable();
    if (mode === 'fullscreen') {
      await vi.waitFor(() => expect(document.fullscreenElement).not.toBeNull());
      view.store.setPending({ id: 701, label: 'Pending report data' });
      view.harness.detectChanges(); await portal.whenStable();
      await vi.waitFor(() => expect(document.fullscreenElement).toBeNull());
      expect((portal.nativeElement as HTMLElement).querySelector('[role=dialog]')).toBeNull();
      expect(session.runtime.presentation!.available()).toBe(false);
      expect(preview.querySelector('article')).toBeNull();
      expect(preview.textContent).toContain('Waiting for saved report settings');
      view.store.clearPending(701);
    } else {
      await view.open('report-a', 'setup'); await portal.whenStable();
      expect((portal.nativeElement as HTMLElement).querySelector('[role=dialog]')).toBeNull();
      expect(session.runtime.presentation!.available()).toBe(false);
    }
    portal.destroy();
  });
});
