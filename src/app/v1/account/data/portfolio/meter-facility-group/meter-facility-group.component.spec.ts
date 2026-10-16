import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { facility, meter } from '@app/v1/facility/data/meters/facility-meters.testing';
import { AccountDataModule } from '../../account-data.module';
import { PortfolioMeterFacilityGroup, PortfolioMeterView } from '../portfolio-meter.view';
import { MeterFacilityGroupComponent } from './meter-facility-group.component';

describe('MeterFacilityGroupComponent', () => {
  it('links the facility heading to its meter dashboard and retains accessible meter intents', () => {
    TestBed.configureTestingModule({ imports: [AccountDataModule], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(MeterFacilityGroupComponent);
    const meters = [
      { statusTone: 'danger', statusLabel: 'Has errors', statusIcon: 'danger' },
      { statusTone: 'warning', statusLabel: 'Has warnings', statusIcon: 'warning' },
      { statusTone: 'success', statusLabel: 'No active findings', statusIcon: 'success' },
      { statusTone: 'neutral', statusLabel: 'Checks pending', statusIcon: 'loading' },
      { statusTone: 'neutral', statusLabel: 'Checks unavailable', statusIcon: 'info' }
    ].map((status, index) => ({ ...status, meter: meter({ guid: `meter-${index}`, name: `Main ${index}` }), sourceIcon: 'electricity' } as PortfolioMeterView));
    fixture.componentRef.setInput('group', { facility: facility(), meters, attentionRank: 0, latestReading: 0 } satisfies PortfolioMeterFacilityGroup);
    fixture.componentRef.setInput('facilityRoute', ['/v1', 'workspace', 'facility', 'facility-a', 'data', 'meters']);
    const opened = vi.fn();
    fixture.componentInstance.openMeter.subscribe(opened);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('h2')).toHaveLength(1);
    expect(host.querySelector('h2 a')?.getAttribute('href')).toBe('/v1/workspace/facility/facility-a/data/meters');
    expect(host.querySelector('h2 a app-ui-icon:last-child')?.getAttribute('name')).toBe('chevronRight');
    expect(host.querySelector('ul')?.getAttribute('role')).toBe('list');
    expect(host.querySelector('ul')?.getAttribute('aria-label')).toBe('Facility A meters');
    expect(host.querySelector('[data-tone="success"] .meter-facility-group__status .visually-hidden')?.textContent).toBe('No active findings');
    for (const status of ['Has errors', 'Has warnings', 'Checks pending', 'Checks unavailable']) {
      expect(host.textContent).toContain(status);
    }
    expect(host.querySelector('.meter-facility-group__source')?.textContent).toContain('Electricity');
    expect(host.querySelector('.meter-facility-group__source .visually-hidden')).toBeNull();
    const entries = host.querySelectorAll<HTMLButtonElement>('.meter-facility-group__entry');
    entries[3].click();
    expect(opened).toHaveBeenCalledWith('meter-3');
    expect(host.textContent).not.toContain('First reading');
  });
});
