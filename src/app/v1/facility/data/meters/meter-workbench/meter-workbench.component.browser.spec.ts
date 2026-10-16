import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrowseHeaderDirective } from '@app/v1/shared/navigation/browse-header/browse-header.directive';
import { provideRouter } from '@angular/router';
import { SessionStorageService } from 'ngx-webstorage';
import { FacilityDataModule } from '../../facility-data.module';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { FacilityMetersWorkspaceService } from '../facility-meters-workspace.service';
import { account, facility, meter } from '../facility-meters.testing';
import { buildMeterCards } from '../models';
import { MeterWorkbenchComponent } from './meter-workbench.component';

describe('meter workbench facts in Chromium', () => {
  it('starts collapsed, closes expanded facts when the heading sticks, and allows an explicit reopen while scrolled', async () => {
    const currentMeter = meter({ guid: 'meter-a', name: 'Electricity' });
    const cards = buildMeterCards([currentMeter], [], []);
    const storage = { retrieve: vi.fn(() => null), store: vi.fn() };
    TestBed.configureTestingModule({ imports: [FacilityDataModule], providers: [provideRouter([]),
      { provide: SessionStorageService, useValue: storage },
      { provide: WorkspaceCommandBoundary, useValue: {} },
      { provide: MeterCommandHandler, useValue: {} },
      { provide: FacilityMetersWorkspaceService, useValue: {
        account: signal(account()), facility: signal(facility()), selectedMeter: signal(currentMeter),
        selectedMeterCard: signal(cards[0]), meterCards: signal(cards), selectedMeterGroup: signal(undefined),
        selectedMeterUsageFacts: signal({ facts: [] }), calendarizationState: signal('ready'),
        canWrite: signal(true), hasPending: signal(false), hasMeterRoute: signal(true)
      } },
      { provide: WorkspaceStatusService, useValue: { state: signal('ready'), meterFindings: () => [] } },
      { provide: WorkspaceNavigationService, useValue: {
        accountDataReturnRoute: (guid: string) => ['/v1', 'workspace', 'account', guid, 'data', 'portfolio', 'meters'],
        facilityDataRoute: (guid: string) => ['/v1', 'workspace', 'facility', guid, 'data', 'meters']
      } }
    ] });
    const root = document.createElement('main'); root.className = 'v1-root';
    Object.assign(root.style, { height: '420px', minHeight: '0', width: '1100px', overflow: 'auto' });
    document.body.append(root);
    const fixture = TestBed.createComponent(MeterWorkbenchComponent);
    root.append(fixture.nativeElement); fixture.detectChanges();
    const filler = document.createElement('div'); filler.style.height = '1400px'; fixture.nativeElement.append(filler);
    const sticky = fixture.debugElement.query(By.directive(BrowseHeaderDirective)).injector.get(BrowseHeaderDirective);
    const facts = root.querySelector<HTMLElement>('#v1-meter-workbench-facts')!;
    const toggle = root.querySelector<HTMLButtonElement>('.v1-meter-workbench-header__facts-toggle')!;
    expect(facts.hidden).toBe(true); expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click(); fixture.detectChanges();
    expect(facts.hidden).toBe(false);
    root.scrollTop = 120;
    await vi.waitFor(() => { fixture.detectChanges(); expect(facts.hidden).toBe(true); });
    expect(toggle.textContent).toContain('Show facts');
    expect(root.querySelector('h1')?.textContent).toContain('Electricity');
    expect(root.querySelector('app-data-workbench-tabs')).not.toBeNull();
    expect(storage.store).toHaveBeenLastCalledWith('v1WorkbenchFactsExpanded', false);
    toggle.click(); fixture.detectChanges(); await fixture.whenStable();
    expect(facts.hidden).toBe(false);
    root.scrollTop = 0;
    await vi.waitFor(() => expect(sticky.collapsed()).toBe(false));
    root.scrollTop = 120;
    await vi.waitFor(() => { fixture.detectChanges(); expect(facts.hidden).toBe(true); });
    root.scrollTop = 0; fixture.detectChanges();
    await fixture.whenStable(); expect(facts.hidden).toBe(true);
    fixture.destroy(); root.remove();
  });
});
