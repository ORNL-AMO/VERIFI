import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { presentFinding } from '@app/v1/status/status.catalog';
import { makeFinding, StatusItem } from '@app/v1/status/status.models';
import { MeterReadingsStatusComponent } from './meter-readings-status.component';

describe('MeterReadingsStatusComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MeterReadingsStatusComponent] });
  });

  it('renders evaluating, failure, and invalid meter setup states', () => {
    expect(setup([], 'evaluating').nativeElement.textContent).toContain('Checking meter data');
    expect(setup([], 'error').nativeElement.textContent).toContain('could not be evaluated');

    const invalidFixture = setup([finding('meter.configuration.invalid', 'error', 'configuration', { fields: ['unit'] })]);
    let settingsRequests = 0;
    invalidFixture.componentInstance.settingsRequested.subscribe(() => settingsRequests += 1);
    expect(invalidFixture.nativeElement.textContent).toContain('Complete meter setup');
    triggerButton(invalidFixture, 'Manage Settings');
    expect(settingsRequests).toBe(1);
  });

  it('renders independent quality findings and emits their actions', () => {
    const fixture = setup([
      finding('meter.data.negative', 'error', 'quality', { count: 1 }),
      finding('meter.data.duplicate-date', 'error', 'quality', { dates: ['2026-3-1'] }),
      finding('meter.data.gap', 'error', 'completeness', { count: 1, periodType: 'month' }),
      finding('meter.currency.stale', 'warning', 'currency', { latestPeriod: '2025-12', thresholdMonths: 3 }),
      finding('meter.quality.consumption-outlier', 'warning', 'quality', { count: 2 })
    ]);
    let qualityRequests = 0;
    let fillRequests = 0;
    fixture.componentInstance.qualityRequested.subscribe(() => qualityRequests += 1);
    fixture.componentInstance.fillMissingRequested.subscribe(() => fillRequests += 1);

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Review negative readings');
    expect(text).toContain('Resolve duplicate readings');
    expect(text).toContain('Fill missing meter data');
    expect(text).toContain('Update stale meter data');
    expect(text).toContain('Review consumption outliers');

    triggerButton(fixture, 'Fill Missing Months with Zeros');
    triggerButton(fixture, 'View Quality Report');
    expect(fillRequests).toBe(1);
    expect(qualityRequests).toBe(1);
  });

  it('disables fill missing action when mutating actions are unavailable', () => {
    const fixture = setup([finding('meter.data.gap', 'error', 'completeness', { count: 1, periodType: 'month' })], 'ready', false);
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'))
      .find(item => item.textContent?.includes('Fill Missing Months with Zeros'));
    expect(button?.disabled).toBe(true);
  });
});

function setup(findings: readonly StatusItem[] = [], state: 'idle' | 'evaluating' | 'ready' | 'error' = 'ready', canAct = true): ComponentFixture<MeterReadingsStatusComponent> {
  const fixture = TestBed.createComponent(MeterReadingsStatusComponent);
  fixture.componentRef.setInput('findings', findings);
  fixture.componentRef.setInput('state', state);
  fixture.componentRef.setInput('canAct', canAct);
  fixture.detectChanges();
  return fixture;
}

function finding(code: Parameters<typeof makeFinding>[0], severity: Parameters<typeof makeFinding>[1], category: Parameters<typeof makeFinding>[2], evidence: Parameters<typeof makeFinding>[4]): StatusItem {
  return presentFinding(makeFinding(code, severity, category, {
    kind: 'meter', guid: 'meter-a', name: 'Meter A', accountGuid: 'account-a', facilityGuid: 'facility-a'
  }, evidence));
}

function triggerButton(fixture: ComponentFixture<MeterReadingsStatusComponent>, label: string): void {
  const button = fixture.debugElement.queryAll(By.css('button'))
    .find(item => item.nativeElement.textContent?.includes(label));
  expect(button).toBeDefined();
  button?.triggerEventHandler('click');
}
