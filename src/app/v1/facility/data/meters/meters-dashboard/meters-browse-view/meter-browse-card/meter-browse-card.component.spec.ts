import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { ModalPortalService } from '../../../../../../shell/modal-portal.service';
import { WorkspaceNavigationService } from '../../../../../../shell/workspace-navigation.service';
import { MeterCardView } from '../../../facility-meters.models';
import { FacilityMetersWorkspaceService } from '../../../facility-meters-workspace.service';
import { group, meter } from '../../../facility-meters.testing';
import { MetersDashboardActionsService } from '../../meters-dashboard-actions.service';
import { MeterBrowseCardComponent } from './meter-browse-card.component';

describe('MeterBrowseCardComponent', () => {
  it('renders meter summary content with status, reading range, scope, and a footer group tag', () => {
    const fixture = setup({
      meter: meter({ name: 'Main Electric', source: 'Electricity' }),
      group: group({ name: 'Purchased Electricity' }),
      readingCount: 4,
      sourceColor: '#a59a04',
      statusLabel: 'Needs review',
      statusTone: 'warning',
      statusIcon: 'fa-triangle-exclamation',
      firstReadingLabel: 'Dec 2025',
      latestReadingLabel: 'Jan 2026',
      scopeLabel: 'Purchased Electricity',
      statusIssueLabels: ['No calendarization'],
      statusActionSummaries: ['A calendarization method is required to properly assign energy use to calendar months.']
    });

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Main Electric');
    expect(text).toContain('Electricity');
    expect(text).toContain('Needs review');
    expect(text).toContain('First reading');
    expect(text).toContain('Dec 2025');
    expect(text).toContain('Latest');
    expect(text).toContain('Jan 2026');
    expect(text).toContain('Scope');
    expect(text).toContain('Purchased Electricity');
    expect(text).toContain('No calendarization');
    expect(text).toContain('A calendarization method is required');
    expect(text).toContain('Purchased Electricity');
    expect(fixture.nativeElement.querySelector('.v1-meter-browse-card__source-chip')?.getAttribute('style')).toContain('#a59a04');
    expect(fixture.nativeElement.querySelector('.v1-meter-browse-card__status .fa-triangle-exclamation')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-meter-browse-card')?.classList.contains('v1-meter-browse-card--status-warning')).toBe(true);
    expect(fixture.nativeElement.querySelector('.v1-meter-browse-card__title .fa-chevron-right')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[cdkdrag]')).toBeNull();
    expect(text).not.toContain('Move meter');
    expect(text).not.toContain('Coming soon');
    expect(text).not.toContain('Units');
  });

  it('labels a good meter status as valid', () => {
    const fixture = setup({
      meter: meter({ name: 'Main Electric' }),
      readingCount: 1,
      statusLabel: 'Valid',
      statusTone: 'success',
      statusIcon: 'fa-circle-check'
    });

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Valid');
    expect(fixture.nativeElement.querySelector('.v1-meter-browse-card__status .fa-circle-check')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-meter-browse-card')?.className).not.toContain('v1-meter-browse-card--status');
  });

  it('opens the selected meter settings from the card header', () => {
    const fixture = setup({
      meter: meter({ guid: 'meter-a' }),
      readingCount: 0,
      statusLabel: 'Action needed',
      firstReadingLabel: 'No data',
      latestReadingLabel: 'No data',
      scopeLabel: 'Purchased Electricity'
    });
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[aria-label="Open Meter A settings"]') as HTMLButtonElement).click();

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'meters',
      'meter-a',
      'settings'
    ]);
  });

  it('opens meter readings from the footer action', () => {
    const fixture = setup({
      meter: meter({ guid: 'meter-a' }),
      readingCount: 0
    });
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[aria-label="Open readings"]') as HTMLButtonElement).click();

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'meters',
      'meter-a',
      'readings'
    ]);
  });

  it('copies a meter and opens the copied meter settings', async () => {
    const copiedMeter = meter({ guid: 'meter-copy', name: 'Meter A (copy)' });
    const fixture = setup({
      meter: meter({ guid: 'meter-a' }),
      readingCount: 0
    }, { copiedMeter });
    const actions = TestBed.inject(MetersDashboardActionsService) as any;
    const modalPortal = TestBed.inject(ModalPortalService) as unknown as { show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[aria-label="Copy meter"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(actions.copyMeter).not.toHaveBeenCalled();
    expect(modalPortal.show).toHaveBeenCalledOnce();

    await fixture.componentInstance.confirmCopyMeter();
    await fixture.whenStable();

    expect(actions.copyMeter).toHaveBeenCalledWith(expect.objectContaining({ guid: 'meter-a' }));
    expect(modalPortal.hide).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'meters',
      'meter-copy',
      'settings'
    ]);
  });

  it('shows copy failures on the affected card without navigating', async () => {
    const fixture = setup({
      meter: meter({ guid: 'meter-a' }),
      readingCount: 0
    });
    const actions = TestBed.inject(MetersDashboardActionsService) as any;
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };
    actions.copyMeter.mockRejectedValueOnce(new Error('Copy failed.'));

    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[aria-label="Copy meter"]') as HTMLButtonElement).click();
    await fixture.componentInstance.confirmCopyMeter();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Copy failed.');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('deletes a meter through card-local confirmation', async () => {
    const fixture = setup({
      meter: meter({ guid: 'meter-a', name: 'Meter A' }),
      readingCount: 2
    });
    const actions = TestBed.inject(MetersDashboardActionsService) as any;
    const modalPortal = TestBed.inject(ModalPortalService) as unknown as { show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };

    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[aria-label="Delete meter"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.meterToDelete()?.meter.guid).toBe('meter-a');
    expect(modalPortal.show).toHaveBeenCalledOnce();

    await fixture.componentInstance.confirmDeleteMeter();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(actions.deleteMeter).toHaveBeenCalledWith(expect.objectContaining({ guid: 'meter-a' }));
    expect(fixture.componentInstance.meterToDelete()).toBeUndefined();
    expect(modalPortal.hide).toHaveBeenCalledOnce();
  });

  it('disables mutating footer actions while read-only, pending, or saving without disabling readings navigation', () => {
    const readOnlyFixture = setup({
      meter: meter({ guid: 'meter-a' }),
      readingCount: 0
    }, { canWrite: false });
    readOnlyFixture.detectChanges();
    expect((readOnlyFixture.nativeElement.querySelector('[aria-label="Open readings"]') as HTMLButtonElement).disabled).toBe(false);
    expect((readOnlyFixture.nativeElement.querySelector('[aria-label="Copy meter"]') as HTMLButtonElement).disabled).toBe(true);
    expect((readOnlyFixture.nativeElement.querySelector('[aria-label="Delete meter"]') as HTMLButtonElement).disabled).toBe(true);

    TestBed.resetTestingModule();

    const pendingFixture = setup({
      meter: meter({ guid: 'meter-a' }),
      readingCount: 0
    }, { hasPending: true });
    pendingFixture.detectChanges();
    expect((pendingFixture.nativeElement.querySelector('[aria-label="Copy meter"]') as HTMLButtonElement).disabled).toBe(true);
    expect((pendingFixture.nativeElement.querySelector('[aria-label="Delete meter"]') as HTMLButtonElement).disabled).toBe(true);

    TestBed.resetTestingModule();

    const savingFixture = setup({
      meter: meter({ guid: 'meter-a' }),
      readingCount: 0
    });
    savingFixture.componentInstance.saving.set(true);
    savingFixture.detectChanges();

    expect((savingFixture.nativeElement.querySelector('[aria-label="Open readings"]') as HTMLButtonElement).disabled).toBe(false);
    expect((savingFixture.nativeElement.querySelector('[aria-label="Copy meter"]') as HTMLButtonElement).disabled).toBe(true);
    expect((savingFixture.nativeElement.querySelector('[aria-label="Delete meter"]') as HTMLButtonElement).disabled).toBe(true);
  });
});

function setup(card: MeterCardView, options: {
  canWrite?: boolean;
  hasPending?: boolean;
  copiedMeter?: ReturnType<typeof meter>;
} = {}): ComponentFixture<MeterBrowseCardComponent> {
  const canWrite = signal(options.canWrite ?? true);
  const hasPending = signal(options.hasPending ?? false);
  const actions = {
    copyMeter: vi.fn().mockResolvedValue(options.copiedMeter ?? meter({ guid: 'meter-copy' })),
    deleteMeter: vi.fn().mockResolvedValue(undefined)
  };

  TestBed.configureTestingModule({
    imports: [MeterBrowseCardComponent],
    providers: [
      {
        provide: FacilityMetersWorkspaceService,
        useValue: {
          facility: signal({ guid: 'facility-a', name: 'Facility A' }),
          canWrite,
          hasPending
        }
      },
      {
        provide: WorkspaceNavigationService,
        useValue: {
          facilityMeterRoute: (facilityGuid: string, meterGuid: string, tab = 'settings') => [
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
      {
        provide: ModalPortalService,
        useValue: {
          show: vi.fn(),
          hide: vi.fn()
        }
      },
      { provide: MetersDashboardActionsService, useValue: actions },
      { provide: Router, useValue: { navigate: vi.fn() } }
    ]
  });
  const fixture = TestBed.createComponent(MeterBrowseCardComponent);
  fixture.componentInstance.card = card;
  return fixture;
}
