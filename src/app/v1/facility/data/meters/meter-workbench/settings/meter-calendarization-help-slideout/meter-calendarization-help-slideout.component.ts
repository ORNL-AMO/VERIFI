import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { IdbUtilityMeter, MeterReadingDataApplication } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import {
  CalendarizationExample,
  CalendarizationExampleMonth,
  CalendarizationExampleReadingSummary,
  CalendarizationExampleSummaryItem,
  buildCalendarizationReferenceExample,
  buildCalendarizationExample
} from '@domain/calculations/calanderization/calendarizationExample';
import { IconName } from '@app/v1/shared/icons/icon-registry';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { MeterSlideoutComponent } from '@app/v1/facility/data/meters/shared/meter-slideout/meter-slideout.component';
import { METER_CALENDARIZATION_METHODS, meterCalendarizationMethodLabel } from '@app/v1/facility/data/meters/models';

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
  displayMonths: readonly CalendarizationExampleMonth[] = this.referenceExample.displayMonths;
  workedAllocationSummaries: readonly CalendarizationExampleSummaryItem[] = [];

  ngOnChanges(): void {
    if (this.meter) {
      this.setExample(this.meter);
    }
  }

  methodLabel(): string {
    return meterCalendarizationMethodLabel(this.example?.method ?? this.meter?.meterReadingDataApplication);
  }

  selectMethod(method: MeterReadingDataApplication): void {
    if (!this.canChangeMethod || !this.meter || this.example?.method === method) {
      return;
    }
    this.setExample({ ...this.meter, meterReadingDataApplication: method });
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

  private setExample(meter: IdbUtilityMeter): void {
    this.example = buildCalendarizationExample(meter, this.readings);
    this.displayMonths = this.example.displayMonths.length > 0
      ? this.example.displayMonths
      : this.referenceExample.displayMonths;
    this.workedAllocationSummaries = visibleWorkedAllocationSummaries(this.example);
  }
}

function visibleWorkedAllocationSummaries(
  example: CalendarizationExample
): readonly CalendarizationExampleSummaryItem[] {
  return example.summaries.flatMap(summary => {
    const visibleAllocations = summary.monthReadingSummaries
      .filter(allocation => allocation.readingIndex !== undefined && allocation.readingIndex < 4);
    if (visibleAllocations.length === 0) {
      return [];
    }
    return [{
      ...summary,
      monthReadingSummaries: visibleAllocations,
      totalEnergyUse: visibleAllocations.reduce(
        (total, allocation) => total + allocation.totalEnergyFromBill,
        0
      )
    }];
  });
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
