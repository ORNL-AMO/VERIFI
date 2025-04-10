import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { LabelWithTooltipModule } from 'src/app/shared/label-with-tooltip/label-with-tooltip.module';
import { EditMeterFormComponent } from './edit-meter-form.component';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/_helper-pipes.module';
import { VehicleFormComponent } from './vehicle-form/vehicle-form.component';
import { EmissionsDetailsTableComponent } from './emissions-details-table/emissions-details-table.component';
import { OtherInformationFormComponent } from './other-information-form/other-information-form.component';
import { AdditionalElectricityOptionsFormComponent } from './additional-electricity-options-form/additional-electricity-options-form.component';

@NgModule({
  declarations: [
    EditMeterFormComponent,
    VehicleFormComponent,
    EmissionsDetailsTableComponent,
    OtherInformationFormComponent,
    AdditionalElectricityOptionsFormComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LabelWithTooltipModule,
    HelperPipesModule
  ],
  exports: [
    EditMeterFormComponent
  ]
})
export class EditMeterFormModule { }
