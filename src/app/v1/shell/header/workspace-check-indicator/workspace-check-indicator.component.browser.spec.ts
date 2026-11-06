import { Component, NgModule, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { cdp, page, userEvent } from 'vitest/browser';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { AppearanceService } from '@app/v1/appearance/appearance.service';
import { ManualBackupDownloadService } from '@app/v1/shared/backup/manual-backup-download.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { PORTFOLIO_PALETTES, textContrast } from '@app/v1/shared/inventory/inventory-browser-test.helpers';
import { StatusEvaluationMessageComponent } from '@app/v1/shared/status/status-evaluation-message/status-evaluation-message.component';
import { StatusFindingActionComponent } from '@app/v1/shared/status/status-finding-action/status-finding-action.component';
import { setupSectionNavTest } from '../../section-nav/section-nav-test.helpers';
import { SectionNavModule } from '../../section-nav/section-nav.module';
import { SupportPanelComponent } from '../../support-panel/support-panel.component';
import { SUPPORT_PANEL_TABS } from '../../support-panel/workspace-support-panel.view';
import { WorkspaceNavigationService } from '../../workspace-navigation.service';
import { ShellHeaderTestModule } from '../shell-header.testing';

@Component({
  standalone: false,
  template: `<app-shell-header/>
    <div style="position:relative;min-height:25rem;display:flex;align-items:flex-start">
      <app-section-nav style="width:220px;flex-shrink:0"/>
      @if (navigation.isSupportPanelOpen()) { <app-support-panel/> }
    </div>`
})
class CheckFeedbackHost {
  readonly navigation = inject(WorkspaceNavigationService);
}

@NgModule({
  declarations: [CheckFeedbackHost, SupportPanelComponent],
  imports: [CommonModule, ShellHeaderTestModule, SectionNavModule, IconComponent, StatusEvaluationMessageComponent, StatusFindingActionComponent]
})
class CheckFeedbackTestModule {}

describe('workspace data-check feedback in Chromium', () => {
  it('keeps navigation and header controls still, with accessible themed feedback and focused To-dos', async () => {
    const state = setupSectionNavTest();
    const backups = { available: signal(true), preparing: signal(false), reminder: signal({ tone: 'recommended', label: 'Backup recommended', detail: '' }) };
    TestBed.configureTestingModule({ imports: [CheckFeedbackTestModule], providers: [
      { provide: AppearanceService, useValue: {} },
      { provide: ManualBackupDownloadService, useValue: backups }
    ] });
    const navigation = TestBed.inject(WorkspaceNavigationService);
    const open = signal(true);
    const tab = signal('help');
    const revealed = signal(false);
    const requested = signal(false);
    Object.assign(navigation, {
      isWorkspaceRoute: () => true, dataCheckState: state.statusState,
      headerFacility: () => undefined, scopeChangePending: () => false, scopeAvailability: () => '', scopeNotice: () => '',
      isSupportPanelOpen: open, supportPanelRequested: revealed, activePanelTab: tab, todosFocusRequested: requested,
      completeTodosFocus: () => requested.set(false), panelTabs: () => SUPPORT_PANEL_TABS,
      panelContent: () => ({ help: [], todos: [], discardedWarnings: [], results: [], details: [] }),
      openTodos: () => { open.set(true); revealed.set(true); tab.set('todos'); requested.set(true); },
      toggleSupportPanel: vi.fn((visible: boolean) => { open.set(!visible); revealed.set(!visible); }),
      hideSupportPanel: () => { open.set(false); revealed.set(false); }
    });
    // The base status mock supplies the same state to navigation and To-dos.
    Object.assign(TestBed.inject(WorkspaceStatusService), {
      warningActionError: () => undefined, canManageWarnings: () => true
    });
    await page.viewport(390, 850);
    const fixture = TestBed.createComponent(CheckFeedbackHost);
    const root = fixture.nativeElement as HTMLElement;
    root.className = 'v1-root';
    root.style.width = '100%';
    const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
    const indicator = () => root.querySelector<HTMLButtonElement>('app-workspace-check-indicator button');
    const toggle = () => root.querySelector<HTMLButtonElement>('[aria-label="Toggle support panel"]')!;
    const change = async (value: 'idle' | 'ready' | 'evaluating' | 'error') => { state.statusState.set(value); await settle(); };
    const client = cdp() as { send(method: string, parameters: Record<string, unknown>): Promise<void> };
    try {
      state.activeSection.set('data'); state.activeDetail.set('portfolio'); await settle();
      expect(toggle().getAttribute('aria-pressed')).toBe('false');
      expect(getComputedStyle(root.querySelector('app-support-panel')!).display).toBe('none');
      toggle().click(); await settle();
      expect(toggle().getAttribute('aria-pressed')).toBe('true');
      expect(root.querySelector('app-support-panel')!.getBoundingClientRect().width).toBeGreaterThan(0);
      toggle().click(); await settle(); expect(open()).toBe(false);
      await page.viewport(1200, 850); open.set(true); revealed.set(false);
      await vi.waitFor(() => { fixture.detectChanges(); expect(toggle().getAttribute('aria-pressed')).toBe('true'); });
      toggle().click(); await settle(); expect(open()).toBe(false);
      for (const width of [1200, 390]) {
        await page.viewport(width, 850); await change('ready');
        const header = root.querySelector<HTMLElement>('header')!;
        const headerHeight = header.getBoundingClientRect().height;
        const toggleLeft = toggle().getBoundingClientRect().left;
        const backupLeft = root.querySelector('.v1-header-backup')!.getBoundingClientRect().left;
        for (const section of ['data', 'analysis']) {
          state.activeSection.set(section); await settle();
          const link = root.querySelector<HTMLElement>('app-section-nav .v1-nav__link')!;
          const top = link.getBoundingClientRect().top;
          for (const value of ['idle', 'evaluating', 'error', 'ready'] as const) {
            await change(value);
            expect(link.getBoundingClientRect().top).toBeCloseTo(top, 3);
            expect(header.getBoundingClientRect().height).toBeCloseTo(headerHeight, 3);
            expect(toggle().getBoundingClientRect().left).toBeCloseTo(toggleLeft, 3);
            expect(root.querySelector('.v1-header-backup')!.getBoundingClientRect().left).toBeCloseTo(backupLeft, 3);
            expect(root.querySelector('app-section-nav app-status-evaluation-message')).toBeNull();
            expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth + 1);
          }
        }
      }
      await change('evaluating'); expect(indicator()).toBeNull();
      await vi.waitFor(() => { fixture.detectChanges(); expect(indicator()).not.toBeNull(); }, { timeout: 2000, interval: 20 });
      const left = toggle().getBoundingClientRect().left;
      indicator()!.focus(); await settle();
      const tooltip = () => root.querySelector<HTMLElement>('#workspace-check-tooltip')!;
      expect(tooltip().hidden).toBe(false);
      expect(tooltip().getBoundingClientRect().left).toBeGreaterThanOrEqual(0);
      expect(tooltip().getBoundingClientRect().right).toBeLessThanOrEqual(390);
      for (const palette of PORTFOLIO_PALETTES) {
        for (const mode of ['', 'v1-theme-dark', 'v1-contrast-strong', 'v1-theme-dark v1-contrast-strong']) {
          root.className = `v1-root v1-palette-${palette} ${mode}`;
          expect(textContrast(tooltip().querySelector<HTMLElement>('.check-indicator__description')!)).toBeGreaterThanOrEqual(4.5);
          expect(toggle().getBoundingClientRect().left).toBeCloseTo(left, 3);
        }
      }
      root.className = 'v1-root';
      toggle().focus(); await settle();
      await page.getByRole('button', { name: 'Updating data checks. Open To-dos' }).hover(); await settle();
      await page.getByRole('tooltip').hover(); await settle(); expect(tooltip().hidden).toBe(false);
      await page.getByRole('button', { name: 'Toggle support panel' }).hover(); await settle(); expect(tooltip().hidden).toBe(true);
      indicator()!.focus(); await settle(); expect(tooltip().hidden).toBe(false);
      await userEvent.keyboard('{Escape}'); await settle(); expect(tooltip().hidden).toBe(true);
      await change('ready'); expect(indicator()).toBeNull();
      expect(document.activeElement).toBe(toggle());
      await change('evaluating');
      await vi.waitFor(() => { fixture.detectChanges(); expect(indicator()).not.toBeNull(); }, { timeout: 2000, interval: 20 });
      await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      expect(getComputedStyle(indicator()!.querySelector('app-ui-icon')!).animationName).toBe('none');
      await client.send('Emulation.setEmulatedMedia', { media: 'print' });
      expect(getComputedStyle(root.querySelector('app-workspace-check-indicator')!).display).toBe('none');
      await client.send('Emulation.setEmulatedMedia', { media: '', features: [] });
      indicator()!.focus(); await userEvent.keyboard('{Enter}'); await settle();
      expect(tab()).toBe('todos'); expect(open()).toBe(true);
      await vi.waitFor(() => expect(document.activeElement).toBe(root.querySelector('[aria-labelledby="v1-todo-heading"]')));
      expect(root.querySelector('app-support-panel')!.textContent).toContain('Updating data checks…');
      expect(root.querySelector('app-workspace-check-indicator [role=status]')!.textContent).toBe('');
      await change('error');
      expect(root.querySelector('app-support-panel [role=alert]')!.textContent).toContain('Data checks are unavailable.');
      expect(root.querySelector('app-support-panel')!.textContent).not.toContain('No data issues need attention.');
      toggle().click(); await settle(); expect(open()).toBe(false);
      root.querySelector('.check-indicator__target')!.dispatchEvent(new MouseEvent('mouseenter')); await settle(); expect(tooltip().hidden).toBe(false);
      indicator()!.focus(); await userEvent.keyboard(' '); await settle();
      expect(open()).toBe(true);
      await vi.waitFor(() => expect(document.activeElement).toBe(root.querySelector('[aria-labelledby="v1-todo-heading"]')));
      const todoRegion = document.activeElement;
      await change('ready'); expect(indicator()).toBeNull();
      expect(document.activeElement).toBe(todoRegion);
      expect(root.querySelector('app-support-panel')!.textContent).toContain('No data issues need attention.');
    } finally {
      await client.send('Emulation.setEmulatedMedia', { media: '', features: [] });
      fixture.destroy(); await page.viewport(1100, 850);
    }
  });
});
