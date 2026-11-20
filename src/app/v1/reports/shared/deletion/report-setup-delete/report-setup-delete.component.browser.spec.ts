import { PortalModule } from '@angular/cdk/portal';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { page, userEvent } from 'vitest/browser';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { setupAccountReportWorkbench } from '../../../account/testing/account-report-workbench-test-setup';
import { setupReportWorkbench } from '../../../facility/testing/report-workbench-test-setup';
import { reportFixture } from '../../../facility/testing/report-test-fixtures';

@Component({ standalone: true, imports: [PortalModule], host: { class: 'v1-root' },
  template: '<ng-template [cdkPortalOutlet]="modal.activePortal()"/>' })
class DeletePortalHost { readonly modal = inject(ModalPortalService); }

describe('report Setup deletion keyboard and layout', () => {
  afterEach(async () => { TestBed.resetTestingModule(); await page.viewport(1280, 720); });

  for (const scope of ['account', 'facility'] as const) {
    it.each([
      ['light', [], 1100], ['dark', ['v1-theme-dark'], 390],
      ['high contrast', ['v1-theme-dark', 'v1-contrast-strong'], 390]
    ] as const)(`${scope} keeps deletion aligned, themed, and keyboard accessible in %s`, async (_theme, classes, width) => {
      await page.viewport(width, 900);
      TestBed.configureTestingModule({ imports: [DeletePortalHost] });
      const view = scope === 'account' ? await setupAccountReportWorkbench()
        : await setupReportWorkbench([reportFixture({ facilityReportType: 'emissionFactors' })]);
      await view.open();
      const host = view.harness.fixture.nativeElement as HTMLElement;
      host.classList.add('v1-root', ...classes);
      Object.assign(host.style, { display: 'block', width: `${width}px`, height: '850px', overflow: 'auto' });
      Object.assign(host.querySelector<HTMLElement>(`app-${scope}-report-workbench`)!.style,
        { display: 'flex', overflow: 'visible', minHeight: '100%' });
      const portal = TestBed.createComponent(DeletePortalHost);
      (portal.nativeElement as HTMLElement).classList.add(...classes);
      // Creating a second TestBed root detaches the harness root; restore both live surfaces.
      document.body.append(host);
      const settle = async () => {
        view.harness.detectChanges(); portal.detectChanges();
        await view.harness.fixture.whenStable(); await portal.whenStable();
        view.harness.detectChanges(); portal.detectChanges();
      };
      await settle();
      const action = host.querySelector<HTMLElement>('app-report-setup-delete')!;
      const button = action.querySelector<HTMLButtonElement>('button')!;
      button.scrollIntoView();
      const bounds = action.getBoundingClientRect(), buttonBounds = button.getBoundingClientRect();
      expect(buttonBounds.right).toBeLessThanOrEqual(width);
      expect(buttonBounds.left).toBeGreaterThanOrEqual(0);
      expect(buttonBounds.left - bounds.left).toBeGreaterThan(bounds.right - buttonBounds.right);
      expect(action.querySelectorAll('h2, p')).toHaveLength(0);
      expect(action.getBoundingClientRect().top).toBeCloseTo(host.querySelector('.report-setup')!.getBoundingClientRect().bottom, 0);
      expect(host.scrollWidth).toBeLessThanOrEqual(width + 1);
      expect(getComputedStyle(button).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      button.focus(); await userEvent.keyboard('{Enter}'); await settle();
      const dialog = (portal.nativeElement as HTMLElement).querySelector<HTMLElement>('[role="dialog"]')!;
      expect(dialog.contains(document.activeElement)).toBe(true);
      const confirm = dialog.querySelector<HTMLButtonElement>('.v1-modal__footer .v1-btn--danger')!;
      confirm.focus(); await userEvent.keyboard('{Tab}');
      expect(dialog.contains(document.activeElement)).toBe(true);
      const dialogBounds = dialog.getBoundingClientRect();
      expect(dialogBounds.left).toBeGreaterThanOrEqual(0); expect(dialogBounds.right).toBeLessThanOrEqual(width);
      expect(confirm.getBoundingClientRect().bottom).toBeLessThanOrEqual(900);
      expect(TestBed.inject(ModalPortalService).workspaceBlocked()).toBe(true);
      await userEvent.keyboard('{Escape}'); await settle();
      expect((portal.nativeElement as HTMLElement).querySelector('[role="dialog"]')).toBeNull();
      expect(document.activeElement).toBe(button);
      expect(view.deleteReport).not.toHaveBeenCalled();
    });
  }
});
