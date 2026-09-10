import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { WorkspaceNavigationService } from '../../../../shell/workspace-navigation.service';
import { MeterWorkbenchTabId } from '../facility-meters.models';
import { FacilityMetersWorkspaceService } from '../facility-meters-workspace.service';
import { group, meter } from '../facility-meters.testing';
import { MeterWorkbenchComponent } from './meter-workbench.component';

describe('MeterWorkbenchComponent', () => {
  it('renders the selected meter workbench tab from the route', () => {
    const fixture = setup({ tab: 'monthly' });

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Electric Main');
    expect(text).toContain('Monthly Data');
    expect(text).toContain('Monthly calendarized data review is WIP.');
    expect(text).toContain('Purchased Electricity');
  });

  it('navigates back to meters and between workbench tabs', () => {
    const fixture = setup({ tab: 'settings' });
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons.find(button => button.textContent?.trim() === 'Meters')?.click();
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'meters'
    ]);

    buttons.find(button => button.textContent?.includes('Quality Report'))?.click();
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'meters',
      'meter-electric',
      'quality'
    ]);
  });

  it('renders a not-found state for a missing or foreign meter route', () => {
    const fixture = setup({ selectedMeter: undefined, hasMeterRoute: true });

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Meter not found');
    expect(text).toContain('This meter is not available in Facility A.');
  });

  it('shows read-only and pending state messaging', () => {
    const readOnlyFixture = setup({ canWrite: false });
    readOnlyFixture.detectChanges();
    expect(readOnlyFixture.nativeElement.textContent).toContain('Meter actions are unavailable');

    TestBed.resetTestingModule();

    const pendingFixture = setup({ hasPending: true });
    pendingFixture.detectChanges();
    expect(pendingFixture.nativeElement.textContent).toContain('Another workspace update is still finishing');
  });
});

function setup(options: {
  tab?: MeterWorkbenchTabId;
  selectedMeter?: ReturnType<typeof meter>;
  hasMeterRoute?: boolean;
  canWrite?: boolean;
  hasPending?: boolean;
} = {}): ComponentFixture<MeterWorkbenchComponent> {
  const selectedMeter = signal(options.selectedMeter === undefined && options.hasMeterRoute
    ? undefined
    : options.selectedMeter ?? meter({ guid: 'meter-electric', name: 'Electric Main', groupId: 'group-energy' })
  );
  const selectedMeterGroup = signal(group({ guid: 'group-energy', name: 'Purchased Electricity' }));
  const selectedMeterReadingCount = signal(1);
  const canWrite = signal(options.canWrite ?? true);
  const hasPending = signal(options.hasPending ?? false);
  const hasMeterRoute = signal(options.hasMeterRoute ?? true);

  TestBed.configureTestingModule({
    declarations: [MeterWorkbenchComponent],
    imports: [CommonModule],
    providers: [
      {
        provide: FacilityMetersWorkspaceService,
        useValue: {
          facility: signal({ guid: 'facility-a', name: 'Facility A' }),
          selectedMeter,
          selectedMeterGroup,
          selectedMeterReadingCount,
          canWrite,
          hasPending,
          hasMeterRoute
        }
      },
      {
        provide: WorkspaceNavigationService,
        useValue: {
          facilityDataRoute: (facilityGuid: string, detail = 'meters') => [
            '/v1',
            'workspace',
            'facility',
            facilityGuid,
            'data',
            detail
          ],
          facilityMeterRoute: (facilityGuid: string, meterGuid: string, tab: MeterWorkbenchTabId = 'settings') => [
            '/v1',
            'workspace',
            'facility',
            facilityGuid,
            'data',
            'meters',
            meterGuid,
            tab
          ]
        }
      },
      { provide: Router, useValue: { navigate: vi.fn() } },
      { provide: ActivatedRoute, useValue: { data: of(options.tab ? { meterTab: options.tab } : {}) } }
    ]
  });

  return TestBed.createComponent(MeterWorkbenchComponent);
}
