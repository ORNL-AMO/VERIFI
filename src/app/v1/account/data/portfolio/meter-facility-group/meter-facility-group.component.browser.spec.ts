import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { cdp, page, userEvent } from 'vitest/browser';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { makeFinding, StatusEvaluationState } from '@app/v1/status/status.models';
import { presentFindings } from '@app/v1/status/status.catalog';
import { facility, group, meter, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import { AccountDataModule } from '../../account-data.module';
import { AccountPortfolioMetersTabComponent } from '../account-portfolio-meters-tab/account-portfolio-meters-tab.component';
import { PORTFOLIO_PALETTES, textContrast } from '../portfolio-browser-test.helpers';

describe('meter facility board in Chromium', () => {
  it('supports large and single-facility accounts, native filters, keyboard use, themes and printing', async () => {
    await page.viewport(1600, 1000);
    const facilities = Array.from({ length: 64 }, (_, index) => facility({ guid: `facility-${index}`, name: `Plant ${String(index).padStart(2, '0')} Manufacturing and Distribution` }));
    const meters = facilities.flatMap((owner, index) => Array.from({ length: index % 5 + 1 }, (_, child) => meter({
      guid: `meter-${index}-${child}`, facilityId: owner.guid, groupId: `group-${index}`,
      name: child ? `Production and process utility meter ${child}` : 'Main', source: child % 2 ? 'Natural Gas' : 'Electricity'
    })));
    const facilitiesState = signal(facilities);
    const statusState = signal<StatusEvaluationState>('ready');
    const findings = presentFindings(meters.filter((_, index) => index % 3 !== 0).map((value, index) => makeFinding(
      'meter.configuration.invalid', index % 2 ? 'warning' : 'error', 'configuration',
      { kind: 'meter', guid: value.guid, name: value.name, accountGuid: 'account-a', facilityGuid: value.facilityId }
    )));
    TestBed.configureTestingModule({ imports: [AccountDataModule], providers: [provideRouter([]),
      { provide: AccountWorkspaceStore, useValue: {
        canWrite: signal(true), account: signal({ guid: 'account-a' }), facilities: facilitiesState, meters: signal(meters),
        meterData: signal(meters.filter((_, index) => index % 7 !== 0).map(value => reading({ meterId: value.guid, facilityId: value.facilityId }))),
        meterGroups: signal(facilities.map(owner => group({ guid: `group-${owner.guid.slice(9)}`, facilityId: owner.guid })))
      } },
      { provide: WorkspaceStatusService, useValue: { state: statusState, items: signal(findings) } },
      { provide: WorkspaceNavigationService, useValue: {
        facilityDataRoute: (owner: string, detail: string) => ['/v1', 'workspace', 'facility', owner, 'data', detail],
        facilityMeterRoute: (owner: string, guid: string, tab: string) => ['/v1', 'workspace', 'facility', owner, 'data', 'meters', guid, tab]
      } }
    ] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AccountPortfolioMetersTabComponent);
    const host = fixture.nativeElement as HTMLElement;
    host.className = 'v1-root v1-palette-steel';
    Object.assign(host.style, { width: '100%', maxWidth: '1440px', padding: '16px', display: 'block', margin: '0 auto' });
    fixture.autoDetectChanges();
    host.querySelector('.v1-account-portfolio-meters')!.classList.add('v1-account-portfolio');
    const entries = host.querySelectorAll<HTMLButtonElement>('.meter-facility-group__entry');
    expect(entries).toHaveLength(meters.length);
    expect(host.querySelectorAll('app-meter-facility-group h2')).toHaveLength(64);
    const sections = host.querySelectorAll<HTMLElement>('app-meter-facility-group');
    expect(sections[0].getBoundingClientRect().width).toBeLessThan(host.clientWidth * .4);
    expect(sections[0].getBoundingClientRect().height).not.toBe(sections[1].getBoundingClientRect().height);
    for (const palette of PORTFOLIO_PALETTES) {
      for (const dark of [false, true]) {
        for (const contrast of [false, true]) {
          host.className = `v1-root v1-palette-${palette}${dark ? ' v1-theme-dark' : ''}${contrast ? ' v1-contrast-strong' : ''}`;
          for (const tone of ['danger', 'warning']) {
            expect(textContrast(host.querySelector(`[data-tone="${tone}"] .meter-facility-group__status`)!), `${palette}, ${dark}, ${contrast}`).toBeGreaterThanOrEqual(4.5);
          }
          expect(textContrast(host.querySelector('.meter-facility-group__source')!), `source chip: ${palette}, ${dark}, ${contrast}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
    host.className = 'v1-root';
    await page.screenshot({ element: host, path: '../../../../../../../.angular/portfolio-spike/meter-board-default-light.png' });
    host.className = 'v1-root v1-palette-steel';
    const firstGuid = fixture.componentInstance.facilityGroups()[0].meters[0].meter.guid;
    const firstOwner = fixture.componentInstance.facilityGroups()[0].facility.guid;
    const facilityLink = host.querySelector<HTMLAnchorElement>('h2 a')!;
    expect(facilityLink.getAttribute('href')).toBe(`/v1/workspace/facility/${firstOwner}/data/meters`);
    facilityLink.focus();
    await userEvent.keyboard('{Enter}');
    await fixture.whenStable();
    expect(navigateByUrl).toHaveBeenCalledOnce();
    entries[0].focus();
    await userEvent.keyboard('{Enter}');
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/v1', 'workspace', 'facility', firstOwner, 'data', 'meters', firstGuid, 'settings']);
    await page.screenshot({ element: host, path: '../../../../../../../.angular/portfolio-spike/meter-board-wide.png' });

    await page.getByRole('searchbox', { name: 'Find meter, facility, source, group, or status' }).fill('plant 04');
    await vi.waitFor(() => expect(host.querySelectorAll('app-meter-facility-group')).toHaveLength(1));
    expect(host.querySelectorAll('.meter-facility-group__entry')).toHaveLength(5);
    expect(host.querySelector('.meter-facility-board--single')).toBeNull();
    await page.getByRole('combobox', { name: 'Status', exact: true }).selectOptions('noReadings');
    await vi.waitFor(() => expect(host.querySelectorAll('.meter-facility-group__entry')).toHaveLength(1));
    await page.getByRole('searchbox').fill('no match');
    await vi.waitFor(() => expect(host.textContent).toContain('No meters match'));
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await vi.waitFor(() => expect(host.querySelectorAll('app-meter-facility-group')).toHaveLength(64));

    await page.viewport(390, 740);
    host.style.maxWidth = '360px';
    host.className = 'v1-root v1-palette-neon v1-theme-dark v1-contrast-strong';
    expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth + 1);
    for (const entry of host.querySelectorAll<HTMLElement>('.meter-facility-group__entry')) {
      expect(entry.scrollWidth).toBeLessThanOrEqual(entry.clientWidth + 1);
    }
    await page.screenshot({ element: host, path: '../../../../../../../.angular/portfolio-spike/meter-board-narrow.png' });
    facilitiesState.set(facilities.slice(0, 3));
    await fixture.whenStable();
    expect(host.querySelectorAll('app-meter-facility-group')).toHaveLength(3);
    expect(host.querySelectorAll('.meter-facility-group__entry')).toHaveLength(6);
    facilitiesState.set(facilities.slice(4, 5));
    await fixture.whenStable();
    expect(host.querySelector('.meter-facility-board--single')).not.toBeNull();
    expect(host.querySelectorAll('.meter-facility-group__entry')).toHaveLength(5);
    statusState.set('error');
    await fixture.whenStable();
    expect(host.querySelectorAll('[data-tone="neutral"]')).toHaveLength(5);
    expect(host.textContent).toContain('Checks unavailable');
    await page.getByRole('combobox', { name: 'Status', exact: true }).selectOptions('valid');
    await vi.waitFor(() => expect(host.textContent).toContain('No meters match'));
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await fixture.whenStable();
    statusState.set('ready');
    await fixture.whenStable();
    host.className = 'v1-root v1-palette-steel';
    host.style.maxWidth = '1440px';
    await page.viewport(1600, 1000);
    const singleEntries = host.querySelectorAll<HTMLElement>('.meter-facility-group__entry');
    expect(singleEntries[0].getBoundingClientRect().width).toBeLessThan(host.clientWidth * .4);
    await page.screenshot({ element: host, path: '../../../../../../../.angular/portfolio-spike/meter-board-single.png' });
    const printSession = cdp() as { send(command: string, parameters: { media: string }): Promise<void> };
    await printSession.send('Emulation.setEmulatedMedia', { media: 'print' });
    try {
      expect(getComputedStyle(host.querySelector('.v1-account-portfolio-meters__toolbar')!).display).toBe('none');
      expect(singleEntries[0].getBoundingClientRect().left).toBeCloseTo(singleEntries[1].getBoundingClientRect().left, 0);
    } finally {
      await printSession.send('Emulation.setEmulatedMedia', { media: '' });
    }
    fixture.destroy();
  });
});
