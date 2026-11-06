import { Component, TemplateRef, input, output } from '@angular/core';
import { footprintEnergyUseUnits } from '@domain/calculations/energy-footprint/energy-footprint-units';
import type { AnnualDataFieldsComponent } from '../annual-data-fields/annual-data-fields.component';
import { AnnualConsumptionForm } from '../energy-use-setup-form.service';

/** One annual section shared by the item editor and group year wizard. */
@Component({ selector: 'app-energy-use-annual-year-fields', standalone: false,
  templateUrl: './annual-year-fields.component.html', styleUrls: ['./annual-year-fields.component.css'] })
export class AnnualYearFieldsComponent {
  readonly year = input.required<ReturnType<AnnualDataFieldsComponent['years']>[number]>();
  readonly editorKey = input('');
  readonly canEdit = input(false);
  readonly canManageYears = input(false);
  readonly showManagement = input(true);
  readonly embeddedCalculators = input(false);
  readonly calculatorRequested = output<TemplateRef<unknown> | null>();
  readonly copyRequested = output<number>();
  readonly removeRequested = output<number>();
  readonly units = footprintEnergyUseUnits;
  toggleOverride(form: AnnualConsumptionForm, amount: number | null): void {
    if (!this.canEdit()) return;
    const manual = !form.controls.overrideEnergyUse.value;
    form.patchValue({ overrideEnergyUse: manual, energyUse: manual ? amount : null }); form.markAsDirty();
  }
}
