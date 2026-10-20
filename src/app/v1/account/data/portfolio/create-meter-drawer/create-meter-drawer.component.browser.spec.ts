import { PortalModule } from '@angular/cdk/portal';
import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { page, userEvent } from 'vitest/browser';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { account, facility, group } from '@app/v1/facility/data/meters/facility-meters.testing';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { MeterGroupCommandHandler } from '@data/account-workspace/handlers/meter-group-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountDataModule } from '../../account-data.module';

@Component({
  standalone: true,
  imports: [AccountDataModule, PortalModule],
  template: '<div class="v1-root"><app-account-portfolio/><ng-template [cdkPortalOutlet]="modal.activePortal()"/></div>'
})
class MeterCreationHost {
  readonly modal = inject(ModalPortalService);
}

describe('portfolio meter creation in the shell portal', () => {
  it('uses native facility selection, traps and restores focus, and opens the created meter settings', async () => {
    await page.viewport(390, 740);
    const handler = { addMeter: vi.fn().mockImplementation(async value => ({ ...value, guid: 'new-meter' })) };
    TestBed.configureTestingModule({
      imports: [MeterCreationHost],
      providers: [
        provideRouter([]), ModalPortalService,
        { provide: MeterCommandHandler, useValue: handler },
        { provide: MeterGroupCommandHandler, useValue: {} },
        { provide: WorkspaceCommandBoundary, useValue: {
          execute: vi.fn().mockImplementation(async (_options, persist) => ({ value: await persist() }))
        } },
        { provide: WorkspaceNavigationService, useValue: {
          activePortfolioTab: signal('meters'),
          facilityMeterRoute: (facilityGuid: string, meterGuid: string, tab: string) => ['/v1', 'workspace', 'facility', facilityGuid, 'data', 'meters', meterGuid, tab]
        } },
        { provide: AccountWorkspaceStore, useValue: {
          account: signal(account()), facilities: signal([facility(), facility({ guid: 'facility-b', name: 'Beta' })]),
          meterGroups: signal([group({ guid: 'beta-group', facilityId: 'facility-b', name: 'Beta group' })]),
          accountAnalyses: signal([]), facilityAnalyses: signal([]), canWrite: signal(true), hasPending: signal(false)
        } }
      ]
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(MeterCreationHost);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const opener = page.getByRole('button', { name: 'Add meter', exact: true });
    await opener.click();
    fixture.detectChanges();
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    await vi.waitFor(() => expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull());
    const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.getBoundingClientRect().width).toBeLessThanOrEqual(390);
    const cancel = page.getByRole('button', { name: 'Cancel', exact: true });
    await cancel.click();
    fixture.detectChanges();
    expect(document.activeElement?.textContent).toContain('Add meter');
    await opener.click();
    fixture.detectChanges();
    await page.getByRole('combobox', { name: 'Facility', exact: true }).selectOptions('facility-b');
    await page.getByRole('textbox', { name: 'Meter name', exact: true }).fill('Main Electric');
    fixture.detectChanges();
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain('Beta group');
    const submit = host.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(submit.disabled).toBe(false);
    submit.focus();
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close panel');
    await userEvent.keyboard('{Escape}');
    fixture.detectChanges();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    await opener.click();
    fixture.detectChanges();
    await page.getByRole('combobox', { name: 'Facility', exact: true }).selectOptions('facility-b');
    await page.getByRole('textbox', { name: 'Meter name', exact: true }).fill('Main Electric');
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(handler.addMeter).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ name: 'Main Electric', source: 'Electricity', facilityId: 'facility-b', accountId: 'account-a' }), 'account-a');
    expect(navigate).toHaveBeenCalledWith(['/v1', 'workspace', 'facility', 'facility-b', 'data', 'meters', 'new-meter', 'settings']);
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    fixture.destroy();
    await page.viewport(1600, 1000);
  });
});
