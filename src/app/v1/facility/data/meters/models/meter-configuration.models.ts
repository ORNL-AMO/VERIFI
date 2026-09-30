/** Meter creation options and calendarization choices shared by facility-meter forms. */
import { AllSources, MeterSource } from '@data/models/constantsAndTypes';
export {
  METER_CALENDARIZATION_METHODS,
  meterCalendarizationMethodLabel
} from '@app/v1/shared/meter-settings/meter-calendarization-options';

export const METER_SOURCES: ReadonlyArray<MeterSource> = AllSources;

export interface MeterDraft {
  readonly name: string;
  readonly source: MeterSource;
  readonly groupId?: string;
}
