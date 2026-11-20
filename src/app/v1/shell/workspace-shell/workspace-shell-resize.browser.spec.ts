import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterModule } from '@angular/router';
import { LocalStorageService } from 'ngx-webstorage';
import { cdp, page, userEvent } from 'vitest/browser';
import { vi } from 'vitest';
import { CommandNotificationBridgeService } from '@app/v1/shared/notifications/command-notification-bridge.service';
import { VisualizationImportNotificationBridgeService } from '@app/v1/shared/notifications/visualization-import-notification-bridge.service';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { echarts, V1EChartsOption } from '@app/v1/shared/charts/echarts';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { HomeContext } from '@app/v1/home/home-context.service';
import { HomeEditor } from '@app/v1/home/home-editor.service';
import { WORKSPACE_SECTIONS } from '../primary-rail/workspace-sections';
import { SUPPORT_PANEL_TABS } from '../support-panel/workspace-support-panel.view';
import { WorkspaceNavigationService } from '../workspace-navigation.service';
import { WorkspaceLayoutService } from '../workspace-layout.service';
import { WorkspaceShellComponent } from './workspace-shell.component';
import { WorkspaceShellBrowserTestModule } from './workspace-shell.testing';

@Component({ standalone: true, imports: [EChartsChartDirective], template: '<div class="resize-test-chart" style="height:300px;width:100%" [appV1ECharts]="option"></div>' })
class ChartContent {
  readonly option: V1EChartsOption = { animation: false, xAxis: { type: 'category', data: ['A', 'B', 'C', 'D'] },
    yAxis: { type: 'value' }, dataZoom: [{ type: 'inside', start: 20, end: 80 }], series: [{ type: 'line', data: [1, 3, 2, 4] }] };
}
describe('workspace panel resizing in Chromium', () => {
  let fixture: ComponentFixture<WorkspaceShellComponent>, root: HTMLElement, layout: WorkspaceLayoutService;
  let open: ReturnType<typeof signal<boolean>>, requested: ReturnType<typeof signal<boolean>>;
  let stored: unknown, store: ReturnType<typeof vi.fn>;
  let previousFontSize: string;

  beforeEach(async () => {
    previousFontSize = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '16px';
    await page.viewport(1600, 900);
    open = signal(true); requested = signal(false); stored = null;
    store = vi.fn((_key: string, value: unknown) => { stored = value; });
    TestBed.configureTestingModule({
      imports: [ChartContent, WorkspaceShellBrowserTestModule,
        RouterModule.forRoot([{ path: 'resize-test', component: ChartContent }, { path: 'resize-next', component: ChartContent }])], providers: [
      { provide: LocalStorageService, useValue: { retrieve: () => stored, store } },
      { provide: CommandNotificationBridgeService, useValue: {} },
      { provide: VisualizationImportNotificationBridgeService, useValue: {} },
      { provide: HomeEditor, useValue: { canStart: () => false } },
      { provide: HomeContext, useValue: {
        entries: () => [{ record: { guid: 'long-dashboard' }, route: ['/resize-test'],
          name: 'A long dashboard name that wraps naturally when the navigation sidebar becomes narrow' }],
        selectedGuid: () => undefined, configuredDefaultGuid: () => undefined, owner: () => ({ kind: 'account', guid: 'a' }),
        ownerRoute: () => ['/resize-test'], view: () => undefined
      } },
      { provide: WorkspaceStatusService, useValue: { state: () => 'ready', warningActionError: () => undefined } },
      { provide: WorkspaceNavigationService, useValue: {
        sections: () => WORKSPACE_SECTIONS, activeSection: () => 'home', activeDetail: () => 'dashboard',
        account: () => ({ guid: 'a', name: 'An account with a long descriptive name' }),
        hasSingleSiteRecovery: () => false, singleSiteWorkspaceState: () => 'none', isSingleSiteWorkspace: () => false,
        inventoryScopeQuery: () => ({}), contextMode: () => 'account', routeMotion: () => 'none', routeMotionKey: () => 'resize',
        isSupportPanelOpen: open, supportPanelRequested: requested, todosFocusRequested: () => false,
        activePanelTab: () => 'help', panelTabs: () => SUPPORT_PANEL_TABS,
        panelContent: () => ({ help: ['Support content should wrap and remain readable while resizing.'], todos: [], discardedWarnings: [], results: [], details: [] }),
        hideSupportPanel: () => open.set(false)
      } }
    ] });
    fixture = TestBed.createComponent(WorkspaceShellComponent); root = fixture.nativeElement;
    root.classList.add('v1-root'); root.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh';
    layout = TestBed.inject(WorkspaceLayoutService);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/resize-test');
    await settle();
    await vi.waitFor(() => expect(layout.navigationBounds().enabled).toBe(true));
  });
  afterEach(async () => {
    fixture?.destroy(); TestBed.resetTestingModule(); vi.restoreAllMocks();
    document.documentElement.style.fontSize = previousFontSize;
    await page.viewport(1200, 800);
  });

  function element(selector: string): HTMLElement { return root.querySelector<HTMLElement>(selector)!; }
  function handle(side: 'nav' | 'support'): HTMLElement { return element(`.v1-workspace__${side}-resize`); }
  function width(selector: string): number { return element(selector).getBoundingClientRect().width; }
  async function settle(): Promise<void> {
    if (!fixture.componentRef.hostView.destroyed) { fixture.detectChanges(); await fixture.whenStable(); }
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  }

  async function dragStart(source: HTMLElement, pointerType: 'mouse' | 'pen' = 'mouse'): Promise<(type: string, dx: number, dy?: number) => Promise<void>> {
    const frame = window.frameElement?.getBoundingClientRect(), rect = source.getBoundingClientRect();
    const scaleX = frame ? frame.width / window.innerWidth : 1, scaleY = frame ? frame.height / window.innerHeight : 1;
    const start = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const client = cdp() as { send(method: string, params: unknown): Promise<void> };
    let pressed = false;
    const send = async (type: string, dx: number, dy = 0) => {
      if (type === 'mousePressed') pressed = true;
      if (type === 'mouseReleased') pressed = false;
      // Captured movement must retain the held button, matching Chromium's real mouse input.
      await client.send('Input.dispatchMouseEvent', { type, pointerType, x: (start.x + dx) * scaleX + (frame?.left ?? 0),
        y: (start.y + dy) * scaleY + (frame?.top ?? 0), button: type === 'mouseMoved' && !pressed ? 'none' : 'left',
        buttons: pressed ? 1 : 0, clickCount: 1 });
      await settle();
    };
    await send('mouseMoved', 0); await send('mousePressed', 0);
    expect(layout.resizing()).toBe(true);
    return send;
  }
  async function drag(side: 'nav' | 'support', delta: number): Promise<void> {
    const send = await dragStart(handle(side)); await send('mouseMoved', delta); await send('mouseReleased', delta);
  }

  it('drags both boundaries outside their handles, commits once per release and retains chart zoom and instance', async () => {
    const railWidth = width('app-primary-rail'), chartHost = element('.resize-test-chart');
    await vi.waitFor(() => expect(echarts.getInstanceByDom(chartHost)).toBeDefined());
    const chart = echarts.getInstanceByDom(chartHost)!;
    const getZoom = () => (chart.getOption()['dataZoom'] as { start: number; end: number }[]).map(({ start, end }) => ({ start, end }));
    const zoom = getZoom();
    await drag('nav', 60);
    expect(width('app-section-nav')).toBeCloseTo(332, 0);
    expect(width('app-support-panel')).toBeCloseTo(352, 0);
    await drag('support', -80);
    expect(width('app-support-panel')).toBeCloseTo(432, 0);
    expect(width('app-section-nav')).toBeCloseTo(332, 0);
    expect(store).toHaveBeenCalledTimes(2);
    expect(echarts.getInstanceByDom(chartHost)).toBe(chart); expect(getZoom()).toEqual(zoom);
    await vi.waitFor(() => expect(chart.getWidth()).toBeCloseTo(chartHost.clientWidth, 0));
    await drag('nav', -60); await drag('support', 80);
    expect(width('app-section-nav')).toBeCloseTo(272, 0); expect(width('app-support-panel')).toBeCloseTo(352, 0);
    expect(width('app-primary-rail')).toBe(railWidth);
    expect(element('.v1-workspace__main').getBoundingClientRect().right).toBeCloseTo(element('app-support-panel').getBoundingClientRect().left, 0);
  });

  it('uses keyboard limits and reset, preserves widths across routes and support close/reopen', async () => {
    handle('nav').focus(); await userEvent.keyboard('{ArrowRight}'); await settle();
    expect(document.activeElement).toBe(handle('nav')); expect(width('app-section-nav')).toBeCloseTo(280, 0);
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}'); await settle();
    expect(width('app-section-nav')).toBeCloseTo(312, 0);
    await userEvent.keyboard('{Home}'); await settle(); expect(width('app-section-nav')).toBe(0);
    await userEvent.keyboard('{ArrowRight}'); await settle(); expect(width('app-section-nav')).toBeCloseTo(312, 0);
    const longLink = element('app-home-nav a');
    expect(longLink.scrollWidth).toBeLessThanOrEqual(longLink.clientWidth + 1);
    await userEvent.keyboard('{End}'); await settle(); expect(width('app-section-nav')).toBeCloseTo(416, 0);
    expect(width('.v1-workspace__main')).toBeGreaterThanOrEqual(384);
    await userEvent.keyboard('{Enter}'); await settle(); expect(width('app-section-nav')).toBeCloseTo(272, 0);
    await drag('support', -60);
    await page.getByRole('button', { name: 'Hide support panel', exact: true }).click(); await settle();
    expect(root.querySelector('app-support-panel')).toBeNull();
    open.set(true); await settle(); expect(width('app-support-panel')).toBeCloseTo(412, 0);
    await TestBed.inject(Router).navigateByUrl('/resize-next'); await settle();
    expect(width('app-support-panel')).toBeCloseTo(412, 0);
    await page.getByRole('separator', { name: 'Resize support panel', exact: true }).dblClick(); await settle();
    expect(width('app-support-panel')).toBeCloseTo(352, 0);
    // A newly created service reads the same device preferences on restart.
    const restarted = TestBed.runInInjectionContext(() => new WorkspaceLayoutService());
    expect(restarted.preferredWidths()).toEqual(layout.preferredWidths());
  });

  it('supports pen and touch without scrolling the workspace', async () => {
    const pen = await dragStart(handle('support'), 'pen');
    await pen('mouseMoved', -40); await pen('mouseReleased', -40);
    expect(width('app-support-panel')).toBeCloseTo(392, 0);
    const source = handle('nav'), rect = source.getBoundingClientRect(), frame = window.frameElement?.getBoundingClientRect();
    const scaleX = frame ? frame.width / window.innerWidth : 1, scaleY = frame ? frame.height / window.innerHeight : 1;
    const x = (rect.left + rect.width / 2) * scaleX + (frame?.left ?? 0), y = (rect.top + rect.height / 2) * scaleY + (frame?.top ?? 0);
    const client = cdp() as { send(method: string, params: unknown): Promise<void> };
    try {
      await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 7 }] }); await settle();
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 40 * scaleX, y, id: 7 }] }); await settle();
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await settle();
      expect(width('app-section-nav')).toBeCloseTo(312, 0);
      expect(element('.v1-workspace__main').scrollTop).toBe(0); expect(store).toHaveBeenCalledTimes(2);
    } finally { await client.send('Emulation.setTouchEmulationEnabled', { enabled: false }); }
  });

  it('snaps each sidebar closed past its threshold and restores navigation from its edge and support from its toggle', async () => {
    await drag('nav', 60); // Remember 332px, then retain that width when closing.
    const saved = stored;
    let send = await dragStart(handle('nav'));
    await send('mouseMoved', -221); // 111px: just below half of the 224px expanded minimum.
    expect(width('app-section-nav')).toBe(0);
    expect(element('app-section-nav').inert).toBe(true);
    expect(getComputedStyle(element('app-section-nav')).visibility).toBe('hidden');
    await userEvent.keyboard('{Escape}'); await send('mouseReleased', -221);
    expect(width('app-section-nav')).toBeCloseTo(332, 0);
    await drag('nav', -221); expect(width('app-section-nav')).toBe(0); expect(stored).toEqual(saved);
    expect(width('.v1-workspace__main')).toBeCloseTo(1600 - width('app-primary-rail') - 352, 0);
    await drag('nav', 160); expect(width('app-section-nav')).toBeCloseTo(224, 0);
    handle('nav').focus(); await userEvent.keyboard('{Home}'); await settle();
    await userEvent.keyboard('{ArrowRight}'); await settle(); expect(width('app-section-nav')).toBeCloseTo(224, 0);

    const toggle = document.createElement('button'); toggle.setAttribute('aria-label', 'Toggle support panel');
    toggle.addEventListener('click', () => open.set(true)); document.body.append(toggle);
    try {
      await drag('support', 209); // 143px: just below half of its 288px minimum.
      expect(open()).toBe(false); expect(root.querySelector('app-support-panel')).toBeNull();
      expect(document.activeElement).toBe(toggle);
      toggle.click(); await settle(); expect(width('app-support-panel')).toBeCloseTo(352, 0);
      handle('support').focus(); await userEvent.keyboard('{Home}'); await settle();
      expect(open()).toBe(false); expect(document.activeElement).toBe(toggle);
    } finally { toggle.remove(); }
  });

  it('cancels captured drags with Escape, breakpoint changes and destruction without persisting', async () => {
    let send = await dragStart(handle('nav')); await send('mouseMoved', 80);
    expect(width('app-section-nav')).toBeCloseTo(352, 0);
    await userEvent.keyboard('{Escape}'); await send('mouseReleased', 80);
    expect(width('app-section-nav')).toBeCloseTo(272, 0); expect(store).not.toHaveBeenCalled();
    send = await dragStart(handle('support')); await send('mouseMoved', -80);
    await page.viewport(1000, 900); await settle(); await send('mouseReleased', -80);
    expect(layout.resizing()).toBe(false); expect(getComputedStyle(handle('support')).display).toBe('none');
    expect(store).not.toHaveBeenCalled();
    await page.viewport(1600, 900); await settle(); expect(width('app-support-panel')).toBeCloseTo(352, 0);
    send = await dragStart(handle('nav')); await send('mouseMoved', 30);
    fixture.destroy(); await send('mouseReleased', 30);
    expect(document.documentElement.style.userSelect).toBe(''); expect(store).not.toHaveBeenCalled();
  });

  it('fits remembered widths, preserves narrow overlay sizing and provides themed focus without layout gaps', async () => {
    layout.setWidth('navigation', 416); layout.setWidth('support', 576); await settle();
    const saved = stored, writes = store.mock.calls.length;
    await page.viewport(1200, 900); await settle();
    expect(width('.v1-workspace__main')).toBeGreaterThanOrEqual(383.5);
    expect(width('app-section-nav')).toBeGreaterThanOrEqual(224); expect(width('app-support-panel')).toBeGreaterThanOrEqual(288);
    expect(stored).toEqual(saved); expect(store).toHaveBeenCalledTimes(writes);
    await page.viewport(1000, 900); await settle();
    expect(getComputedStyle(handle('support')).display).toBe('none');
    requested.set(true); await settle();
    expect(width('app-support-panel')).toBeCloseTo(352, 0);
    expect(element('app-support-panel').getBoundingClientRect().right).toBeCloseTo(element('.v1-workspace').getBoundingClientRect().right, 0);
    await page.viewport(820, 900); await settle();
    expect(getComputedStyle(handle('nav')).display).toBe('none');
    expect(element('.v1-workspace__main').getBoundingClientRect().top).toBeGreaterThanOrEqual(element('app-section-nav').getBoundingClientRect().bottom);
    await page.viewport(1600, 900); await settle();
    expect(width('app-section-nav')).toBeCloseTo(416, 0); expect(width('app-support-panel')).toBeCloseTo(576, 0);
    for (const theme of ['', 'v1-theme-dark', 'v1-contrast-strong']) {
      root.className = `v1-root ${theme}`; handle('nav').focus(); await userEvent.keyboard('{ArrowLeft}'); await settle();
      expect(getComputedStyle(handle('nav')).outlineStyle).toBe('solid');
      expect(getComputedStyle(handle('nav')).outlineColor).not.toBe('rgba(0, 0, 0, 0)');
      for (const tab of root.querySelectorAll<HTMLElement>('[role="tab"]')) expect(tab.scrollWidth).toBeLessThanOrEqual(tab.clientWidth + 1);
    }
    const client = cdp() as { send(method: string, params: unknown): Promise<void> };
    try {
      await client.send('Emulation.setEmulatedMedia', { media: 'print' });
      expect(getComputedStyle(handle('nav')).display).toBe('none'); expect(getComputedStyle(handle('support')).display).toBe('none');
    } finally { await client.send('Emulation.setEmulatedMedia', { media: '' }); }
  });
});
