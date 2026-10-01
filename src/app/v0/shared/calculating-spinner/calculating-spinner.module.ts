import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalculatingSpinnerComponent } from '@v0/shared/calculating-spinner/calculating-spinner.component';



@NgModule({
  declarations: [
    CalculatingSpinnerComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    CalculatingSpinnerComponent
  ]
})
export class CalculatingSpinnerModule { }
