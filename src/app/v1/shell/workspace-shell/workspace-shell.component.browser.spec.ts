import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavigationMotionDirective } from '@app/v1/shared/navigation/navigation-motion/navigation-motion.directive';
import { NotificationsModule } from '@app/v1/shared/notifications/notifications.module';
import { page } from 'vitest/browser';
import { CommandNotificationBridgeService } from '@app/v1/shared/notifications/command-notification-bridge.service';
import { WorkspaceNavigationService } from '../workspace-navigation.service';
import { WorkspaceShellComponent } from './workspace-shell.component';

@Component({ selector: 'app-primary-rail', template: '', standalone: false })
export class TestPrimaryRail { }
@Component({ selector: 'app-section-nav', template: '', standalone: false })
export class TestSectionNav { }
@Component({ selector: 'app-support-panel', template: '', standalone: false })
export class TestSupportPanel { }
@NgModule({ declarations: [WorkspaceShellComponent, TestPrimaryRail, TestSectionNav, TestSupportPanel],
  imports: [CommonModule, RouterModule, NavigationMotionDirective, NotificationsModule] })
export class WorkspaceShellGeometryModule { }

describe('workspace notification clearance in Chromium', () => {
  let fixture: ComponentFixture<WorkspaceShellComponent>;

  beforeEach(() => {
    TestBed.overrideComponent(WorkspaceShellComponent, { set: { template: `
      <main class="v1-workspace v1-workspace--panel-closed" style="--v1-rail-width:0px;--v1-section-nav-width:0px">
        <section class="v1-workspace__main">
          <div style="display:flex;flex-direction:column;min-height:100%">
            <div style="height:1000px;flex:none">Report document</div>
            <footer class="v1-wizard-actions" style="flex-wrap:wrap">
              <button style="flex:0 0 10rem;min-height:40px">Back to reports</button>
              <button style="flex:0 0 10rem;min-height:40px">Generate PDF</button>
              <button style="flex:0 0 10rem;min-height:40px">Generate PowerPoint</button>
              <button style="flex:0 0 10rem;min-height:40px">Generate Excel</button>
              <button style="flex:0 0 10rem;min-height:40px">Cancel generation</button>
            </footer>
          </div>
        </section>
        <div class="v1-workspace__notifications"><article style="height:80px;background:white;border:1px solid black">Download started</article></div>
      </main>` } });
    TestBed.configureTestingModule({ imports: [WorkspaceShellGeometryModule], providers: [
      { provide: CommandNotificationBridgeService, useValue: {} },
      { provide: WorkspaceNavigationService, useValue: {} }
    ] });
    fixture = TestBed.createComponent(WorkspaceShellComponent);
    const host = fixture.nativeElement as HTMLElement;
    host.classList.add('v1-root');
    host.style.cssText = 'position:fixed;left:20px;top:20px;width:calc(100vw - 40px);height:calc(100vh - 40px)';
  });

  afterEach(async () => {
    fixture.destroy(); TestBed.resetTestingModule();
    await page.viewport(1200, 800);
  });

  it('keeps toasts above the actual footer as controls wrap, resize, scroll, disappear and return', async () => {
    await page.viewport(1200, 800);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const workspace = host.querySelector<HTMLElement>('.v1-workspace')!;
    const content = host.querySelector<HTMLElement>('.v1-workspace__main')!;
    const notifications = host.querySelector<HTMLElement>('.v1-workspace__notifications')!;
    const footer = host.querySelector<HTMLElement>('.v1-wizard-actions')!;
    const clear = () => Number.parseFloat(workspace.style.getPropertyValue('--v1-workspace-footer-clearance'));
    const expectAbove = (element: HTMLElement) => {
      expect(notifications.getBoundingClientRect().bottom).toBeLessThanOrEqual(element.getBoundingClientRect().top - 8);
      expect(notifications.getBoundingClientRect().top).toBeGreaterThanOrEqual(workspace.getBoundingClientRect().top);
    };
    await vi.waitFor(() => { expect(clear()).toBeGreaterThan(0); expectAbove(footer); });
    const wideHeight = footer.getBoundingClientRect().height;
    expect(Number(getComputedStyle(notifications).zIndex)).toBeGreaterThan(Number(getComputedStyle(footer).zIndex));

    await page.viewport(390, 844);
    await vi.waitFor(() => {
      expect(footer.getBoundingClientRect().height).toBeGreaterThan(wideHeight);
      expectAbove(footer);
    });
    const wrappedClearance = clear();
    footer.style.paddingTop = '80px';
    await vi.waitFor(() => { expect(clear()).toBeGreaterThan(wrappedClearance + 50); expectAbove(footer); });
    footer.style.paddingTop = '';
    content.scrollTop = content.scrollHeight;
    await vi.waitFor(() => { expect(clear()).toBeLessThan(wrappedClearance + 2); expectAbove(footer); });

    footer.style.display = 'none';
    await vi.waitFor(() => expect(clear()).toBe(0));
    footer.style.display = '';
    await vi.waitFor(() => { expect(clear()).toBeGreaterThan(0); expectAbove(footer); });
    const parent = footer.parentElement!;
    footer.remove();
    await vi.waitFor(() => expect(clear()).toBe(0));
    expect(workspace.getBoundingClientRect().bottom - notifications.getBoundingClientRect().bottom).toBeLessThan(32);

    const replacement = footer.cloneNode(true) as HTMLElement;
    parent.appendChild(replacement);
    await vi.waitFor(() => { expect(clear()).toBeGreaterThan(0); expectAbove(replacement); });
    await page.viewport(1200, 800);
    await vi.waitFor(() => { expect(replacement.getBoundingClientRect().height).toBeLessThan(wideHeight + 2); expectAbove(replacement); });
  });

  it('disconnects layout observers and cancels pending measurements when the shell is destroyed', async () => {
    await page.viewport(1200, 800);
    fixture.detectChanges();
    const workspace = fixture.nativeElement.querySelector('.v1-workspace') as HTMLElement;
    const footer = fixture.nativeElement.querySelector('.v1-wizard-actions') as HTMLElement;
    await vi.waitFor(() => expect(Number.parseFloat(workspace.style.getPropertyValue('--v1-workspace-footer-clearance'))).toBeGreaterThan(0));
    const writes = vi.spyOn(workspace.style, 'setProperty');
    window.dispatchEvent(new Event('resize'));
    fixture.destroy();
    footer.style.height = '200px';
    window.dispatchEvent(new Event('resize'));
    await nextFrame(); await nextFrame();
    expect(writes).not.toHaveBeenCalled();
  });
});

function nextFrame(): Promise<void> { return new Promise(resolve => requestAnimationFrame(() => resolve())); }
