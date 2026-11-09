import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { WorkspaceCalendarizationBaseResult } from '@app/v1/shared/calendarization/workspace-calendarization.models';
import { EnergyUseWorkbenchContextService } from '../../energy-use-workbench-context.service';
import { resultsTestContext } from '../energy-use-results.testing';
import { FacilityEnergyUseBalanceService } from './facility-energy-use-balance.service';

describe('Facility footprint calendarization adapter', () => {
  it('projects the routed facility in site units, clears non-ready results and retries through the shared calculation', () => {
    const setup = resultsTestContext();
    const owner = signal({ ...setup.context.group()!.facility, energyIsSource: true });
    const base = new BehaviorSubject<WorkspaceCalendarizationBaseResult>({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'current', meters: [] });
    const project = vi.fn(() => ({ state: 'ready', meters: [] })), retry = vi.fn();
    TestBed.configureTestingModule({ providers: [...setup.providers, FacilityEnergyUseBalanceService,
      { provide: EnergyUseWorkbenchContextService, useValue: { ...setup.context, group: computed(() => ({ facility: owner() })) } },
      { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase: () => base, project, retry } }
    ] });
    const service = TestBed.inject(FacilityEnergyUseBalanceService);
    expect(service.state()).toBe('ready');
    expect(project).toHaveBeenLastCalledWith(expect.anything(), { context: { kind: 'facility', guid: 'facility-a' }, energyUnit: 'kWh', energyIsSource: false, includeEmissions: false });
    owner.set({ ...owner(), guid: 'facility-b' });
    expect(service.state()).toBe('ready');
    expect(project).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ context: { kind: 'facility', guid: 'facility-b' }, energyIsSource: false }));
    base.next({ state: 'evaluating', meters: [] });
    expect(service.state()).toBe('evaluating'); expect(service.meters()).toEqual([]);
    base.next({ state: 'error', meters: [] });
    expect(service.state()).toBe('error');
    service.retry(); expect(retry).toHaveBeenCalledOnce();
    base.complete();
  });
});
