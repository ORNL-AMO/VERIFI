import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { LabelWithTooltipModule } from 'src/app/shared/label-with-tooltip/label-with-tooltip.module';
import { EditMeterFormComponent } from './edit-meter-form.component';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';



@NgModule({
  declarations: [
    EditMeterFormComponent
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
