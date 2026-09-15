import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { IdbUtilityMeter, MeterReadingDataApplication } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import {
  CalendarizationExample,
  CalendarizationExampleReadingSummary,
  buildCalendarizationReferenceExample,
  buildCalendarizationExample
} from '@domain/calculations/calanderization/calendarizationExample';
import { IconName } from '@app/v1/shared/icons/icon-registry';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { MeterSlideoutComponent } from '../../../shared/meter-slideout/meter-slideout.component';
import { METER_CALENDARIZATION_METHODS, meterCalendarizationMethodLabel } from '../../../facility-meters.models';

interface CalendarizationMethodCard {
  readonly value: MeterReadingDataApplication;
  readonly label: string;
  readonly summary: string;
  readonly eyebrow: string;
  readonly icon: IconName;
  readonly tone: 'neutral' | 'facility' | 'account';
}

@Component({
  selector: 'app-meter-calendarization-help-slideout',
  templateUrl: './meter-calendarization-help-slideout.component.html',
  styleUrls: ['./meter-calendarization-help-slideout.component.css'],
  standalone: true,
  imports: [CommonModule, IconComponent, MeterSlideoutComponent]
})
export class MeterCalendarizationHelpSlideoutComponent implements OnChanges {
  @Input({ required: true }) meter!: IdbUtilityMeter;
  @Input() readings: readonly IdbUtilityMeterData[] = [];
  @Input() canChangeMethod = true;
  @Output() closed = new EventEmitter<void>();
  @Output() methodChange = new EventEmitter<MeterReadingDataApplication>();

  readonly methods: readonly CalendarizationMethodCard[] = METER_CALENDARIZATION_METHODS.map(method => ({
    ...method,
    ...calendarizationMethodPresentation(method.value)
  }));
  readonly referenceExample = buildCalendarizationReferenceExample();
  readonly weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  example?: CalendarizationExample;

  ngOnChanges(): void {
    if (this.meter) {
      this.example = buildCalendarizationExample(this.meter, this.readings);
    }
  }

  methodLabel(): string {
    return meterCalendarizationMethodLabel(this.example?.method ?? this.meter?.meterReadingDataApplication);
  }

  selectMethod(method: MeterReadingDataApplication): void {
    if (!this.canChangeMethod || !this.meter || this.example?.method === method) {
      return;
    }
    this.example = buildCalendarizationExample(
      { ...this.meter, meterReadingDataApplication: method },
      this.readings
    );
    this.methodChange.emit(method);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    }).format(value || 0);
  }

  summaryTrackBy(index: number): number {
    return index;
  }

  readingTrackBy(index: number, summary: CalendarizationExampleReadingSummary): string {
    return `${index}-${summary.readDate.getTime()}-${summary.daysApplied}`;
  }
}

function calendarizationMethodPresentation(
  method: MeterReadingDataApplication
): Pick<CalendarizationMethodCard, 'eyebrow' | 'icon' | 'tone'> {
  if (method === 'backward') {
    return { eyebrow: 'Billing periods', icon: 'calendarCheck', tone: 'facility' };
  }
  if (method === 'fullYear') {
    return { eyebrow: 'Annual totals', icon: 'calendar', tone: 'account' };
  }
  return { eyebrow: 'Entered month', icon: 'table', tone: 'neutral' };
}
