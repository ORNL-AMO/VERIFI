import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LabelWithTooltipComponent } from '@shared/label-with-tooltip/label-with-tooltip.component';



@NgModule({
  declarations: [
    LabelWithTooltipComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    LabelWithTooltipComponent
  ]
})
export class LabelWithTooltipModule { }
