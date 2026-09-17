/** Meter creation options and calendarization choices shared by facility-meter forms. */
import { AllSources, MeterSource } from '@data/models/constantsAndTypes';
import { MeterReadingDataApplication } from '@data/models/idbModels/utilityMeter';

export const METER_SOURCES: ReadonlyArray<MeterSource> = AllSources;

export const METER_CALENDARIZATION_METHODS: ReadonlyArray<{
  readonly value: MeterReadingDataApplication;
  readonly label: string;
  readonly summary: string;
}> = [
  {
    value: 'fullMonth',
    label: 'Do Not Calendarize Meter Data',
    summary: 'Use the reading month as entered.'
  },
  {
    value: 'backward',
    label: 'Calendarize Meter Data',
    summary: 'Allocate bill usage across calendar months using daily averages between reading dates.'
  },
  {
    value: 'fullYear',
    label: 'Evenly Distribute Data Annually',
    summary: 'Sum each year of readings and distribute the total evenly across all 12 months.'
  }
];

export interface MeterDraft {
  readonly name: string;
  readonly source: MeterSource;
  readonly groupId?: string;
}

export function meterCalendarizationMethodLabel(method: MeterReadingDataApplication | undefined): string {
  return METER_CALENDARIZATION_METHODS.find(option => option.value === method)?.label ?? 'Select a calendarization method';
}
