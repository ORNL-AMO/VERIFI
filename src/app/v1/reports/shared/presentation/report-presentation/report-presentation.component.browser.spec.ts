import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PortalModule } from '@angular/cdk/portal';
import { page, userEvent } from 'vitest/browser';
import * as echarts from 'echarts/core';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { ReportsSharedModule } from '../../reports-shared.module';
import { ReportPresentationController } from '../report-presentation-controller';

@Component({ standalone: true, imports: [ReportsSharedModule, PortalModule, EChartsChartDirective], providers: [ReportPresentationController],
  styleUrls: ['../../document/report-document-surface.css'], template: `
  <div class="v1-root v1-palette-blueprint" [class.v1-theme-dark]="dark()">
    <button>Application header</button>
    <div class="background" style="height:400px;overflow:auto" [attr.inert]="modal.workspaceBlocked() ? '' : null">
      <app-report-presentation title="Analysis report" [content]="content" [available]="ready()"/>
      <ng-template #content>
        <article class="paper report-document">
          <h2>Facility annual analysis</h2>
          <div class="table-scroll" tabindex="0" role="region" aria-label="Annual results" style="overflow:auto;max-width:100%">
            <table style="width:1600px"><caption>Annual results</caption><tr><th>Year</th><th>Consumption</th></tr><tr><td>2023</td><td>100</td></tr></table>
          </div>
          <div style="height:1500px">Report sections</div>
          <h3>Deep report chart</h3>
          <div class="deep-chart" style="height:300px;width:100%" [appV1ECharts]="option" [deferUntilVisible]="true"></div>
        </article>
      </ng-template>
      <footer>@if (controller.available()) { <button (click)="controller.present()">Present</button> }</footer>
    </div>
    <ng-container [cdkPortalOutlet]="modal.activePortal()"/>
  </div>` })
class PresentationBrowserHost {
  readonly controller = inject(ReportPresentationController);
  readonly modal = inject(ModalPortalService);
  readonly ready = signal(true);
  readonly dark = signal(false);
  readonly option = { xAxis: { type: 'category' as const, data: ['2023'] }, yAxis: { type: 'value' as const }, series: [{ type: 'bar' as const, data: [100] }] };
}

describe('report presentation in Chromium', () => {
  afterEach(async () => {
    TestBed.resetTestingModule(); vi.restoreAllMocks();
    if (document.fullscreenElement) await document.exitFullscreen();
    await page.viewport(1280, 900);
  });

  async function setup() {
    TestBed.configureTestingModule({ imports: [PresentationBrowserHost] });
    const fixture = TestBed.createComponent(PresentationBrowserHost); fixture.autoDetectChanges(); await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); };
    const opener = root.querySelector<HTMLButtonElement>('footer button')!;
    return { fixture, root, settle, opener, host: fixture.componentInstance };
  }

  function expectControlsAtScreenEdges(root: HTMLElement) {
    const surface = root.querySelector<HTMLElement>('[role=dialog]')!;
    const close = surface.querySelector<HTMLButtonElement>('.report-presentation__close')!;
    const zoom = surface.querySelector<HTMLElement>('[aria-label="Report zoom"]')!;
    const footer = surface.querySelector<HTMLElement>('.report-presentation__footer')!;
    const scroll = surface.querySelector<HTMLElement>('.report-presentation__scroll')!;
    const bounds = surface.getBoundingClientRect(), footerStyle = getComputedStyle(footer);
    expect(close.textContent?.trim()).toBe('');
    expect(close.getAttribute('aria-label')).toBe('Close presentation');
    expect(close.getBoundingClientRect().top).toBeGreaterThanOrEqual(bounds.top);
    expect(close.getBoundingClientRect().bottom).toBeLessThanOrEqual(scroll.getBoundingClientRect().top);
    expect(zoom.getBoundingClientRect().right).toBeCloseTo(bounds.right - parseFloat(footerStyle.paddingRight), 0);
    expect(zoom.getBoundingClientRect().bottom).toBeCloseTo(bounds.bottom - parseFloat(footerStyle.paddingBottom), 0);
    expect(scroll.getBoundingClientRect().bottom).toBeLessThanOrEqual(zoom.getBoundingClientRect().top);
  }

  function luminanceOnBlack(color: string): number {
    const channels = color.match(/[\d.]+/g)!.map(Number), alpha = channels[3] ?? 1;
    const linear = channels.slice(0, 3).map(channel => {
      const value = channel * alpha / 255;
      return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    });
    return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
  }

  it.each(['fullscreen', 'window'] as const)('keeps the report scrollbar visible while scrolling down and back up in %s mode', async mode => {
    if (mode === 'window') vi.spyOn(HTMLElement.prototype, 'requestFullscreen').mockRejectedValue(new Error('Denied'));
    const { root, settle, host } = await setup();
    const background = root.querySelector<HTMLElement>('.background')!;
    await page.getByRole('button', { name: 'Present', exact: true }).click(); await settle();
    if (mode === 'fullscreen') await vi.waitFor(() => expect(document.fullscreenElement).not.toBeNull());
    const scroll = root.querySelector<HTMLElement>('.report-presentation__scroll')!;
    const pageTop = document.scrollingElement!.scrollTop, backgroundTop = background.scrollTop;
    for (const dark of [false, true]) {
      host.dark.set(dark); await settle();
      const thumb = getComputedStyle(scroll, '::-webkit-scrollbar-thumb');
      const track = getComputedStyle(scroll, '::-webkit-scrollbar-track');
      const contrast = (luminanceOnBlack(thumb.backgroundColor) + .05) / (luminanceOnBlack(track.backgroundColor) + .05);
      expect(contrast).toBeGreaterThanOrEqual(3);
      scroll.focus(); await userEvent.keyboard('{Home}');
      await vi.waitFor(() => expect(scroll.scrollTop).toBe(0));
      await userEvent.keyboard('{PageDown}');
      await vi.waitFor(() => expect(scroll.scrollTop).toBeGreaterThan(0));
      await userEvent.keyboard('{End}');
      await vi.waitFor(() => expect(Math.abs(scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop)).toBeLessThanOrEqual(1));
      const bottom = scroll.scrollTop;
      await userEvent.keyboard('{PageUp}');
      await vi.waitFor(() => expect(scroll.scrollTop).toBeLessThan(bottom));
      expect(document.scrollingElement!.scrollTop).toBe(pageTop);
      expect(background.scrollTop).toBe(backgroundTop);
    }
    for (let step = 0; step < 10; step++) {
      await page.getByRole('button', { name: 'Zoom in', exact: true }).click(); await settle();
    }
    expect(scroll.scrollWidth).toBeGreaterThan(scroll.clientWidth);
    expect(getComputedStyle(scroll, '::-webkit-scrollbar-corner').backgroundColor).toBe(getComputedStyle(root.querySelector('[role=dialog]')!).backgroundColor);
    expect(getComputedStyle(root.querySelector('[role=dialog] .table-scroll')!).scrollbarColor).toBe('auto');
    expectControlsAtScreenEdges(root);
  });

  it('enters native fullscreen, initializes deep charts on scroll, and restores the footer and scroll position', async () => {
    const { fixture, root, settle, opener } = await setup();
    const background = root.querySelector<HTMLElement>('.background')!;
    opener.scrollIntoView(); const before = background.scrollTop;
    await page.getByRole('button', { name: 'Present', exact: true }).click(); await settle();
    await vi.waitFor(() => expect(document.fullscreenElement).toBe(root.querySelector('[role=dialog]')));
    expect(root.querySelectorAll('article.paper')).toHaveLength(1);
    const scroll = root.querySelector<HTMLElement>('.report-presentation__scroll')!;
    expect(scroll.scrollTop).toBe(0);
    const canvas = root.querySelector<HTMLElement>('[role=dialog] .deep-chart')!;
    expect(canvas.querySelector('canvas')).toBeNull();
    scroll.focus(); await userEvent.keyboard('{PageDown}');
    await vi.waitFor(() => expect(scroll.scrollTop).toBeGreaterThan(0));
    canvas.scrollIntoView(); await vi.waitFor(() => expect(canvas.querySelector('canvas')).not.toBeNull());
    const chart = echarts.getInstanceByDom(canvas)!;
    const close = root.querySelector<HTMLButtonElement>('.report-presentation__close')!;
    expect(close.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
    expect(close.getBoundingClientRect().bottom).toBeLessThan(window.innerHeight);
    expectControlsAtScreenEdges(root);
    await document.exitFullscreen(); await settle();
    await vi.waitFor(() => expect(root.querySelector('[role=dialog]')).toBeNull());
    expect(document.activeElement).toBe(opener);
    expect(background.scrollTop).toBe(before);
    expect(chart.isDisposed()).toBe(true);
    expect(root.querySelectorAll('article.paper')).toHaveLength(1);
    await page.getByRole('button', { name: 'Present', exact: true }).click(); await settle();
    await vi.waitFor(() => expect(document.fullscreenElement).not.toBeNull());
    await page.getByRole('button', { name: 'Close presentation', exact: true }).click(); await settle();
    await vi.waitFor(() => expect(document.fullscreenElement).toBeNull());
    expect(document.activeElement).toBe(opener); fixture.destroy();
  });

  it('provides a black full-window fallback with native focus containment, wide-table scrolling, and Escape', async () => {
    vi.spyOn(HTMLElement.prototype, 'requestFullscreen').mockRejectedValue(new Error('Denied'));
    const { root, settle, opener, host } = await setup();
    await page.getByRole('button', { name: 'Present', exact: true }).click(); await settle();
    const dialog = root.querySelector<HTMLElement>('[role=dialog]')!;
    const close = root.querySelector<HTMLButtonElement>('.report-presentation__close')!;
    expect(document.activeElement).toBe(close);
    expect(getComputedStyle(dialog).backgroundColor).toBe('rgb(0, 0, 0)');
    expect(root.querySelector('.background')?.hasAttribute('inert')).toBe(true);
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    const table = root.querySelector<HTMLElement>('[role=dialog] .table-scroll')!;
    expect(dialog.contains(document.activeElement)).toBe(true);
    const focused: (Element | null)[] = [];
    for (let index = 0; index < 8; index++) {
      await userEvent.keyboard('{Tab}');
      expect(dialog.contains(document.activeElement)).toBe(true);
      focused.push(document.activeElement);
    }
    expect(focused).toContain(close);
    table.focus(); await userEvent.keyboard('{ArrowRight}');
    await vi.waitFor(() => expect(table.scrollLeft).toBeGreaterThan(0));
    for (const dark of [false, true]) {
      host.dark.set(dark); await settle();
      for (const width of [1280, 390]) {
        await page.viewport(width, 900); await new Promise(requestAnimationFrame);
        expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth);
        expect(root.querySelector<HTMLElement>('[role=dialog] article')!.getBoundingClientRect().width).toBeLessThanOrEqual(dialog.clientWidth);
        expect(close.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
        expectControlsAtScreenEdges(root);
        if ((!dark && width === 1280) || (dark && width === 390)) {
          await page.screenshot({ element: dialog, path: `./__screenshots__/presentation-${dark ? 'dark' : 'light'}-${width}.png` });
        }
      }
    }
    await userEvent.keyboard('{Escape}'); await settle();
    expect(root.querySelector('[role=dialog]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('widens presentation without changing the inline report and scrolls horizontally only when needed', async () => {
    vi.spyOn(HTMLElement.prototype, 'requestFullscreen').mockRejectedValue(new Error('Denied'));
    await page.viewport(1920, 900);
    const { root, settle } = await setup();
    const inlineWidth = root.querySelector<HTMLElement>('article.paper')!.getBoundingClientRect().width;
    await page.getByRole('button', { name: 'Present', exact: true }).click(); await settle();
    const scroll = root.querySelector<HTMLElement>('.report-presentation__scroll')!;
    const paper = root.querySelector<HTMLElement>('[role=dialog] article')!;
    const originalWidth = paper.getBoundingClientRect().width;
    expect(originalWidth).toBeCloseTo(inlineWidth * 1.2, 0);
    expect(root.querySelector('[aria-label="Reset zoom to 100%"]')?.textContent).toContain('100%');
    const expectFits = () => {
      expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth + 1);
      expect(scroll.scrollLeft).toBe(0);
      const style = getComputedStyle(scroll), bounds = scroll.getBoundingClientRect(), report = paper.getBoundingClientRect();
      const contentLeft = bounds.left + scroll.clientLeft + parseFloat(style.paddingLeft);
      const contentWidth = scroll.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      expect(report.left + report.width / 2).toBeCloseTo(contentLeft + contentWidth / 2, 0);
    };
    expectFits();
    for (let step = 1; step <= 5; step++) {
      await page.getByRole('button', { name: 'Zoom in', exact: true }).click(); await settle();
      expect(paper.getBoundingClientRect().width).toBeCloseTo(originalWidth * (1 + step / 10), 0);
      expectFits();
    }
    scroll.scrollTop = 0;
    await page.screenshot({ element: root.querySelector<HTMLElement>('[role=dialog]')!, path: './__screenshots__/presentation-zoom-wide-fits.png' });
    // Put the viewport just above the magnified report's width to exercise the overflow boundary.
    await page.viewport(Math.ceil(originalWidth * 1.5) + 100, 900); await settle(); await new Promise(requestAnimationFrame);
    expectFits();
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click(); await settle();
    expect(scroll.scrollWidth).toBeGreaterThan(scroll.clientWidth);
    scroll.focus(); await userEvent.keyboard('{ArrowRight}');
    await vi.waitFor(() => expect(scroll.scrollLeft).toBeGreaterThan(0));
    await page.getByRole('button', { name: 'Zoom out', exact: true }).click(); await settle();
    expectFits();
    await page.viewport(390, 900); await settle(); await new Promise(requestAnimationFrame);
    expect(scroll.scrollWidth).toBeGreaterThan(scroll.clientWidth);
    scroll.scrollTop = 0;
    await page.screenshot({ element: root.querySelector<HTMLElement>('[role=dialog]')!, path: './__screenshots__/presentation-zoom-narrow-overflow.png' });
    await page.getByRole('button', { name: 'Reset zoom to 100%', exact: true }).click(); await settle();
    expectFits();
    const table = paper.querySelector<HTMLElement>('.table-scroll')!;
    table.focus(); await userEvent.keyboard('{ArrowRight}');
    await vi.waitFor(() => expect(table.scrollLeft).toBeGreaterThan(0));
    expectFits();
    expectControlsAtScreenEdges(root);
    await page.viewport(1920, 900); await settle(); await new Promise(requestAnimationFrame);
    expectFits();
    await page.getByRole('button', { name: 'Close presentation', exact: true }).click(); await settle();
    expect(root.querySelector<HTMLElement>('article.paper')!.getBoundingClientRect().width).toBeCloseTo(inlineWidth, 0);
  });

  it.each(['fullscreen', 'window'] as const)('magnifies the document in %s mode while keeping controls reachable and charts mounted', async mode => {
    if (mode === 'window') vi.spyOn(HTMLElement.prototype, 'requestFullscreen').mockRejectedValue(new Error('Denied'));
    const { root, settle } = await setup();
    await page.getByRole('button', { name: 'Present', exact: true }).click(); await settle();
    if (mode === 'fullscreen') await vi.waitFor(() => expect(document.fullscreenElement).not.toBeNull());
    const scroll = root.querySelector<HTMLElement>('.report-presentation__scroll')!;
    const paper = root.querySelector<HTMLElement>('[role=dialog] article')!;
    const close = root.querySelector<HTMLButtonElement>('.report-presentation__close')!;
    const chartElement = paper.querySelector<HTMLElement>('.deep-chart')!;
    chartElement.scrollIntoView(); await vi.waitFor(() => expect(chartElement.querySelector('canvas')).not.toBeNull());
    const chart = echarts.getInstanceByDom(chartElement)!;
    const originalWidth = paper.getBoundingClientRect().width, originalHeight = paper.getBoundingClientRect().height;
    const closeWidth = close.getBoundingClientRect().width;
    const beforeTop = scroll.scrollTop, beforeHeight = scroll.clientHeight;
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click(); await settle();
    expect(paper.getBoundingClientRect().width).toBeCloseTo(originalWidth * 1.1, 0);
    expect(paper.getBoundingClientRect().height).toBeCloseTo(originalHeight * 1.1, 0);
    expect(scroll.scrollTop).toBeCloseTo((beforeTop + beforeHeight / 2 - parseFloat(getComputedStyle(scroll).paddingTop)) * 1.1
      + parseFloat(getComputedStyle(scroll).paddingTop) - beforeHeight / 2, 0);
    expect(close.getBoundingClientRect().width).toBeCloseTo(closeWidth, 0);
    expectControlsAtScreenEdges(root);
    expect(echarts.getInstanceByDom(chartElement)).toBe(chart);
    expect(root.querySelectorAll('article.paper')).toHaveLength(1);
    expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth + 1);
    for (let step = 0; step < 9; step++) {
      await page.getByRole('button', { name: 'Zoom in', exact: true }).click(); await settle();
    }
    expect(paper.getBoundingClientRect().width).toBeCloseTo(originalWidth * 2, 0);
    expect(scroll.scrollWidth).toBeGreaterThan(scroll.clientWidth);
    scroll.scrollLeft = scroll.scrollWidth;
    expect(scroll.scrollLeft).toBeGreaterThan(0);
    expect(close.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
    await page.getByRole('button', { name: 'Reset zoom to 100%', exact: true }).click(); await settle();
    expect(paper.getBoundingClientRect().width).toBeCloseTo(originalWidth, 0);
    await page.getByRole('button', { name: 'Zoom out', exact: true }).click(); await settle();
    expect(paper.getBoundingClientRect().width).toBeCloseTo(originalWidth * .9, 0);
    if (mode === 'window') {
      await page.viewport(390, 900); await settle(); await new Promise(requestAnimationFrame);
      expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth + 1);
      expect(close.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
      await page.getByRole('button', { name: 'Zoom in', exact: true }).click(); await settle();
      await page.getByRole('button', { name: 'Zoom in', exact: true }).click(); await settle();
      expect(scroll.scrollWidth).toBeGreaterThan(scroll.clientWidth);
      expect(close.getBoundingClientRect().bottom).toBeLessThan(window.innerHeight);
      expectControlsAtScreenEdges(root);
      await page.screenshot({ element: root.querySelector<HTMLElement>('[role=dialog]')!, path: './__screenshots__/presentation-zoom-narrow.png' });
    }
    await page.getByRole('button', { name: 'Close presentation', exact: true }).click(); await settle();
    expect(root.querySelector('article.paper')?.getBoundingClientRect().width).toBeGreaterThan(0);
  });
});
