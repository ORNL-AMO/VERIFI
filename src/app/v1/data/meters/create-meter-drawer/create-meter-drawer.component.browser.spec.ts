import { PortalModule } from '@angular/cdk/portal';
import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { page, userEvent } from 'vitest/browser';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { account, facility, group } from '../facility-meters.testing';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { MeterGroupCommandHandler } from '@data/account-workspace/handlers/meter-group-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { DataModule } from '@app/v1/data/data.module';

@Component({
  standalone: true,
  imports: [DataModule, PortalModule],
  template: '<div class="v1-root"><app-data-inventory/><ng-template [cdkPortalOutlet]="modal.activePortal()"/></div>'
})
class MeterCreationHost {
  readonly modal = inject(ModalPortalService);
}

describe('portfolio meter creation in the shell portal', () => {
  it('uses selection cards, traps and restores focus, and opens the created meter settings', async () => {
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
          isSingleSiteWorkspace: () => false, inventoryFacilityGuid: () => undefined, uploadQuery: () => ({}), activePortfolioTab: signal('meters'),
          accountSettingsRoute: (guid: string, detail: string) => ['/v1', 'workspace', 'account', guid, 'settings', detail],
          facilityMeterRoute: (facilityGuid: string, meterGuid: string, tab: string) => ['/v1', 'workspace', 'facility', facilityGuid, 'data', 'meters', meterGuid, tab]
        } },
        { provide: AccountWorkspaceStore, useValue: {
          account: signal(account()), facilities: signal([facility(), facility({ guid: 'facility-b', name: 'Beta' })]),
          meterGroups: signal([group({ guid: 'beta-group', facilityId: 'facility-b', name: 'Beta group' })]),
          customFuels: signal([]),
          accountAnalyses: signal([]), facilityAnalyses: signal([]), canWrite: signal(true), hasPending: signal(false)
        } }
      ]
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(MeterCreationHost);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const checkChoices = async (step: string) => {
      const root = host.querySelector<HTMLElement>('.v1-root')!;
      for (const [width, theme] of [[1200, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
        await page.viewport(width, 740);
        root.className = `v1-root ${theme}`;
        fixture.detectChanges(); await fixture.whenStable();
        const panel = host.querySelector<HTMLElement>('.v1-workspace-slideout')!;
        const body = panel.querySelector<HTMLElement>('.v1-workspace-slideout__body')!;
        expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth + 1);
        expect(panel.querySelector('.v1-workspace-slideout__footer')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(740);
        if (step !== 'name') expect(getComputedStyle(panel.querySelector('.meter-choices')!).gridTemplateColumns.split(' ')).toHaveLength(2);
        const selections = panel.querySelector<HTMLElement>('.meter-selections')!;
        expect(getComputedStyle(selections).position).toBe('sticky');
        const top = selections.getBoundingClientRect().top;
        body.scrollTop = body.scrollHeight; await fixture.whenStable();
        expect(selections.getBoundingClientRect().top).toBeCloseTo(top, 0);
        body.scrollTop = 0;
        await page.screenshot({ element: panel, path: `../../../../../../.angular/verifi-meter-${step}-${width}-${theme.includes('contrast') ? 'contrast' : theme ? 'dark' : 'light'}.png` });
      }
    };
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
    await page.getByRole('button', { name: 'Beta', exact: true }).click();
    await checkChoices('source');
    page.getByRole('button', { name: 'Electricity', exact: true }).element().focus();
    await userEvent.keyboard('{Enter}');
    expect(document.activeElement?.textContent).toBe('Collection unit');
    await checkChoices('unit');
    await page.getByRole('button', { name: 'MWh Megawatt-hour (MWh)', exact: true }).click();
    expect(document.activeElement?.id).toBe('meter-name');
    await checkChoices('name');
    await page.getByRole('textbox', { name: 'Meter name', exact: true }).fill('Main Electric');
    fixture.detectChanges();
    expect(host.querySelector('.meter-selections')?.textContent).toContain('Beta');
    expect(host.querySelector('.meter-selections')?.textContent).toContain('MWh');
    expect(host.querySelector('[formControlName="groupId"]')).toBeNull();
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
    await page.getByRole('button', { name: 'Beta', exact: true }).click();
    await page.getByRole('button', { name: 'Electricity', exact: true }).click();
    await page.getByRole('button', { name: 'MWh Megawatt-hour (MWh)', exact: true }).click();
    await page.getByRole('textbox', { name: 'Meter name', exact: true }).fill('Main Electric');
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(handler.addMeter).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ name: 'Main Electric', source: 'Electricity', startingUnit: 'MWh', energyUnit: 'MWh', groupId: undefined, facilityId: 'facility-b', accountId: 'account-a' }), 'account-a');
    expect(navigate).toHaveBeenCalledWith(['/v1', 'workspace', 'facility', 'facility-b', 'data', 'meters', 'new-meter', 'settings']);
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    fixture.destroy();
    await page.viewport(1600, 1000);
  });
});
