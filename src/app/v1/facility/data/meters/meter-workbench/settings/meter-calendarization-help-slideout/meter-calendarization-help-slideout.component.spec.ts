import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { MeterCalendarizationHelpSlideoutComponent } from './meter-calendarization-help-slideout.component';

describe('MeterCalendarizationHelpSlideoutComponent', () => {
  it('renders a large dense slideout with method option cards and the reference calendar', () => {
    const fixture = setup();

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.v1-meter-slideout--large')).not.toBeNull();
    expect(element.querySelectorAll('.calendarization-help-choice')).toHaveLength(3);
    expect(element.querySelector('.calendarization-help-choice--selected')?.textContent).toContain('Calendarize Meter Data');
    expect(element.textContent).toContain('Calendar example');
    expect(element.textContent).toContain('December 2021');
    expect(element.textContent).toContain('March 2022');
    expect(element.querySelectorAll('.calendarization-help-month--compact')).toHaveLength(4);
    expect(element.textContent).toContain('Four readings are used here');
  });

  it('leaves days after the final reference reading unallocated', () => {
    const fixture = setup();

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const marchFifth = Array.from(element.querySelectorAll<HTMLElement>('.calendarization-help-day'))
      .find(day => day.getAttribute('aria-label') === 'March 5, 2022');
    expect(marchFifth).toBeDefined();
    expect(marchFifth?.className).not.toContain('calendarization-help-day--allocation');
  });

  it('changes the selected method from the option cards', () => {
    const fixture = setup();
    const emittedMethods: string[] = [];
    fixture.componentInstance.methodChange.subscribe(method => emittedMethods.push(method));

    fixture.detectChanges();
    optionButton(fixture, 'Evenly Distribute Data Annually').click();
    fixture.detectChanges();

    expect(emittedMethods).toEqual(['fullYear']);
    const selectedOption = fixture.nativeElement.querySelector('.calendarization-help-choice--selected') as HTMLElement;
    expect(selectedOption.textContent).toContain('Evenly Distribute Data Annually');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Annual distribution');
  });

  it('marks worked allocation reading dates with calendar-matching colors', () => {
    const fixture = setup();

    fixture.detectChanges();

    const januaryReading = readingDateCell(fixture, 'Jan 2, 2022');
    const februaryReading = readingDateCell(fixture, 'Feb 4, 2022');
    expect(januaryReading.querySelector('.calendarization-help-reading-dot--1')).not.toBeNull();
    expect(februaryReading.querySelector('.calendarization-help-reading-dot--2')).not.toBeNull();
  });

  it('explains the four-reading minimum for backward live examples', () => {
    const fixture = setup({
      readings: [
        reading({ guid: 'reading-a', month: 1, day: 15, year: 2022, totalEnergyUse: 100 }),
        reading({ guid: 'reading-b', month: 2, day: 15, year: 2022, totalEnergyUse: 200 }),
        reading({ guid: 'reading-c', month: 3, day: 15, year: 2022, totalEnergyUse: 300 })
      ]
    });

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('At least four readings are needed');
    expect(element.textContent).not.toContain('Worked allocation');
  });

  it('keeps method options read-only when changes are disabled', () => {
    const fixture = setup({ canChangeMethod: false });
    const emittedMethods: string[] = [];
    fixture.componentInstance.methodChange.subscribe(method => emittedMethods.push(method));

    fixture.detectChanges();
    const annualOption = optionButton(fixture, 'Evenly Distribute Data Annually');
    expect(annualOption.disabled).toBe(true);
    annualOption.click();
    fixture.detectChanges();

    expect(emittedMethods).toEqual([]);
    expect(fixture.nativeElement.querySelector('.calendarization-help-choice--selected')?.textContent).toContain('Calendarize Meter Data');
  });
});

function setup(options: {
  canChangeMethod?: boolean;
  readings?: IdbUtilityMeterData[];
} = {}): ComponentFixture<MeterCalendarizationHelpSlideoutComponent> {
  const fixture = TestBed.configureTestingModule({
    imports: [MeterCalendarizationHelpSlideoutComponent]
  }).createComponent(MeterCalendarizationHelpSlideoutComponent);
  fixture.componentInstance.meter = meter();
  fixture.componentInstance.canChangeMethod = options.canChangeMethod ?? true;
  fixture.componentInstance.readings = options.readings ?? [
    reading({ guid: 'reading-a', month: 12, day: 3, year: 2021, totalEnergyUse: 100 }),
    reading({ guid: 'reading-b', month: 1, day: 2, year: 2022, totalEnergyUse: 200 }),
    reading({ guid: 'reading-c', month: 2, day: 4, year: 2022, totalEnergyUse: 300 }),
    reading({ guid: 'reading-d', month: 3, day: 4, year: 2022, totalEnergyUse: 400 })
  ];
  fixture.componentInstance.ngOnChanges();
  return fixture;
}

function optionButton(
  fixture: ComponentFixture<MeterCalendarizationHelpSlideoutComponent>,
  label: string
): HTMLButtonElement {
  const button = Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.calendarization-help-choice')
  ).find(option => option.textContent?.includes(label));
  expect(button).toBeDefined();
  return button as HTMLButtonElement;
}

function readingDateCell(
  fixture: ComponentFixture<MeterCalendarizationHelpSlideoutComponent>,
  label: string
): HTMLElement {
  const cell = Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.calendarization-help-summary td:first-child')
  ).find(tableCell => tableCell.textContent?.includes(label));
  expect(cell).toBeDefined();
  return cell as HTMLElement;
}

function meter(options: Partial<IdbUtilityMeter> = {}): IdbUtilityMeter {
  return {
    guid: 'meter-a',
    accountId: 'account-a',
    facilityId: 'facility-a',
    name: 'Electric Main',
    source: 'Electricity',
    startingUnit: 'kWh',
    energyUnit: 'kWh',
    meterReadingDataApplication: 'backward',
    ...options
  } as IdbUtilityMeter;
}

function reading(options: Partial<IdbUtilityMeterData> = {}): IdbUtilityMeterData {
  return {
    guid: 'reading-a',
    meterId: 'meter-a',
    accountId: 'account-a',
    facilityId: 'facility-a',
    day: 1,
    month: 1,
    year: 2022,
    totalEnergyUse: 120,
    totalVolume: 120,
    totalCost: 20,
    ...options
  } as IdbUtilityMeterData;
}
