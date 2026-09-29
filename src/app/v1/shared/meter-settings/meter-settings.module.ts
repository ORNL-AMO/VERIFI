import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { TooltipComponent } from '@app/v1/shared/tooltip/tooltip.component';
import { MeterSettingsChargesFormComponent } from './meter-settings-charges-form/meter-settings-charges-form.component';
import { MeterSettingsCoreFormComponent } from './meter-settings-core-form/meter-settings-core-form.component';
import { MeterSettingsElectricityFormComponent } from './meter-settings-electricity-form/meter-settings-electricity-form.component';
import { MeterSettingsEmissionsDetailsComponent } from './meter-settings-emissions-details/meter-settings-emissions-details.component';
import { MeterSettingsFormComponent } from './meter-settings-form.component';
import { MeterSettingsOtherInfoComponent } from './meter-settings-other-info/meter-settings-other-info.component';
import { MeterSettingsReadingFormComponent } from './meter-settings-reading-form/meter-settings-reading-form.component';
import { MeterSettingsVehicleFormComponent } from './meter-settings-vehicle-form/meter-settings-vehicle-form.component';

@NgModule({
  declarations: [
    MeterSettingsFormComponent,
    MeterSettingsCoreFormComponent,
    MeterSettingsVehicleFormComponent,
    MeterSettingsElectricityFormComponent,
    MeterSettingsChargesFormComponent,
    MeterSettingsOtherInfoComponent,
    MeterSettingsReadingFormComponent,
    MeterSettingsEmissionsDetailsComponent
  ],
  imports: [CommonModule, ReactiveFormsModule, IconsModule, TooltipComponent],
  exports: [MeterSettingsFormComponent]
})
export class MeterSettingsModule { }
