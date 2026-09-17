import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IdbUtilityMeter, MeterCharge } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { MeterSlideoutComponent } from '@app/v1/facility/data/meters/shared/meter-slideout/meter-slideout.component';
import { MeterReadingFormContext, MeterReadingFormService } from '../meter-reading-form.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

export interface MeterReadingBillSave {
  readonly reading: IdbUtilityMeterData;
  readonly addAnother: boolean;
}

interface MeterReadingBillChargeView {
  readonly guid: string;
  readonly name: string;
  readonly usageUnit?: string;
  readonly canShowUsage: boolean;
}

@Component({
  selector: 'app-meter-reading-bill-slideout',
  templateUrl: './meter-reading-bill-slideout.component.html',
  styleUrls: ['./meter-reading-bill-slideout.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MeterSlideoutComponent, IconComponent]
})
export class MeterReadingBillSlideoutComponent implements OnChanges {
  private readonly formService = inject(MeterReadingFormService);

  @Input({ required: true }) meter!: IdbUtilityMeter;
  @Input({ required: true }) reading!: IdbUtilityMeterData;
  @Input({ required: true }) mode!: 'add' | 'edit';
  @Input() existingReadings: readonly IdbUtilityMeterData[] = [];
  @Input() saving = false;
  @Output() saved = new EventEmitter<MeterReadingBillSave>();
  @Output() cancelled = new EventEmitter<void>();

  form?: FormGroup;
  context?: MeterReadingFormContext;
  chargeViews: readonly MeterReadingBillChargeView[] = [];

  get chargesArray(): FormArray {
    return this.form?.get('chargesArray') as FormArray;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['meter'] || changes['reading'] || changes['existingReadings']) && this.meter && this.reading) {
      this.context = this.formService.contextForMeter(this.meter);
      this.form = this.formService.buildForm(this.meter, this.reading, this.existingReadings);
      this.chargeViews = this.buildChargeViews();
    }
  }

  requestClose(): void {
    if (!this.form?.dirty || window.confirm('Discard bill changes?')) {
      this.cancelled.emit();
    }
  }

  save(addAnother: boolean): void {
    if (!this.form || this.form.invalid || this.saving) {
      this.form?.markAllAsTouched();
      return;
    }
    this.saved.emit({
      reading: this.formService.updateReadingFromForm(this.meter, this.reading, this.form),
      addAnother
    });
  }

  private buildChargeViews(): readonly MeterReadingBillChargeView[] {
    return (this.reading.charges ?? []).map(chargeReading => {
      const charge = this.meter.charges?.find(meterCharge => meterCharge.guid === chargeReading.chargeGuid);
      return {
        guid: chargeReading.chargeGuid,
        name: formatChargeName(charge?.name),
        usageUnit: getChargeUsageUnit(charge, this.meter),
        canShowUsage: canShowChargeUsage(charge, this.meter)
      };
    });
  }
}

function formatChargeName(name: string | undefined): string {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    return 'Charge';
  }
  return trimmedName
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ');
}

function getChargeUsageUnit(charge: MeterCharge | undefined, meter: IdbUtilityMeter): string | undefined {
  if (!charge) {
    return undefined;
  }
  if (meter.source === 'Electricity' && charge.chargeType === 'demand') {
    return meter.demandUnit || 'kW';
  }
  if (charge.chargeType === 'consumption' || charge.chargeType === 'sewer') {
    return meter.startingUnit;
  }
  return undefined;
}

function canShowChargeUsage(charge: MeterCharge | undefined, meter: IdbUtilityMeter): boolean {
  if (!charge) {
    return false;
  }
  if (meter.source === 'Electricity') {
    return charge.chargeType === 'consumption' || charge.chargeType === 'demand';
  }
  return charge.chargeType === 'sewer';
}
