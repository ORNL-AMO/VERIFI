import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MeterStatusCheck } from '@domain/calculations/status-check-calculations/meterStatusCheck';
import { MeterReadingsStatusComponent } from './meter-readings-status.component';

describe('MeterReadingsStatusComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MeterReadingsStatusComponent]
    });
  });

  it('renders loading and invalid meter setup alerts', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('Loading meter data and meter status details');

    const invalidFixture = setup(status({ isMeterValid: false }));
    let settingsRequests = 0;
    invalidFixture.componentInstance.settingsRequested.subscribe(() => settingsRequests += 1);

    const root = invalidFixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('The meter associated with this data has errors in its configuration');
    triggerButton(invalidFixture, 'Manage Settings');
    expect(settingsRequests).toBe(1);
  });

  it('renders data quality status alerts and emits their actions', () => {
    const fixture = setup(status({
      hasNegativeReadings: true,
      hasDuplicateEntries: true,
      missingDataMonths: [{ month: 3, year: 2026, date: new Date(2026, 2, 1) }],
      missingDataYears: [2024],
      isDataOutdated: true,
      isDataCurrent: false,
      isMeterNoLongerInUse: false,
      lastDateEntry: new Date(2025, 11, 1)
    }));
    let settingsRequests = 0;
    let qualityRequests = 0;
    let fillRequests = 0;
    fixture.componentInstance.settingsRequested.subscribe(() => settingsRequests += 1);
    fixture.componentInstance.qualityRequested.subscribe(() => qualityRequests += 1);
    fixture.componentInstance.fillMissingRequested.subscribe(() => fillRequests += 1);

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Negative values entered for one or more readings. To allow negative readings');
    expect(root.textContent).toContain('Allow Negative Readings');
    expect(root.textContent).toContain('Two or more readings have been entered for the same day');
    expect(root.textContent).toContain('Missing meter data found for 1 month');
    expect(root.textContent).toContain('Missing annual meter data for 1 year');
    expect(root.textContent).toContain('Meter settings changed after one or more readings were entered');
    expect(root.textContent).toContain('This meter has older data than the rest of the facility');

    triggerButton(fixture, 'here');
    triggerButton(fixture, 'Fill Missing Months with Zeros');
    triggerButton(fixture, 'View Quality Report');
    expect(settingsRequests).toBe(1);
    expect(fillRequests).toBe(1);
    expect(qualityRequests).toBe(1);
  });

  it('disables fill missing action when mutating actions are unavailable', () => {
    const fixture = setup(status({
      missingDataMonths: [{ month: 3, year: 2026, date: new Date(2026, 2, 1) }]
    }), false);

    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'))
      .find(item => item.textContent?.includes('Fill Missing Months with Zeros'));
    expect(button?.disabled).toBe(true);
  });
});

function setup(statusValue?: MeterStatusCheck, canAct = true): ComponentFixture<MeterReadingsStatusComponent> {
  const fixture = TestBed.createComponent(MeterReadingsStatusComponent);
  fixture.componentRef.setInput('status', statusValue);
  fixture.componentRef.setInput('canAct', canAct);
  fixture.detectChanges();
  return fixture;
}

function status(options: Partial<MeterStatusCheck> = {}): MeterStatusCheck {
  return {
    meterId: 'meter-a',
    groupId: 'group-a',
    meterName: 'Meter A',
    isMeterValid: true,
    lastDateEntry: undefined,
    hasDuplicateEntries: false,
    duplicateEntryDates: [],
    hasNoData: false,
    hasNoCalendarizationMethod: false,
    hasNegativeReadings: false,
    isDataCurrent: true,
    isDataOutdated: false,
    outdatedMonths: 3,
    status: 'good',
    actions: [],
    latestFacilityEntryDate: undefined,
    isMeterNoLongerInUse: false,
    isMissingData: false,
    missingDataMonths: [],
    missingDataYears: [],
    ...options
  } as MeterStatusCheck;
}

function triggerButton(fixture: ComponentFixture<MeterReadingsStatusComponent>, label: string): void {
  const button = fixture.debugElement.queryAll(By.css('button'))
    .find(item => item.nativeElement.textContent?.includes(label));
  expect(button).toBeDefined();
  button?.triggerEventHandler('click');
}
