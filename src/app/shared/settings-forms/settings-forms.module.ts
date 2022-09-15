import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SustainabilityQuestionsFormComponent } from './sustainability-questions-form/sustainability-questions-form.component';
import { GeneralInformationFormComponent } from './general-information-form/general-information-form.component';
import { FinancialReportingFormComponent } from './financial-reporting-form/financial-reporting-form.component';
import { DefaultUnitsFormComponent } from './default-units-form/default-units-form.component';
import { ReactiveFormsModule } from '@angular/forms';
import { HelperPipesModule } from '../helper-pipes/helper-pipes.module';
import { LabelWithTooltipModule } from '../label-with-tooltip/label-with-tooltip.module';
import { EGridEmissionsTableComponent } from './default-units-form/e-grid-emissions-table/e-grid-emissions-table.component';



@NgModule({
  declarations: [
    SustainabilityQuestionsFormComponent,
    GeneralInformationFormComponent,
    FinancialReportingFormComponent,
    DefaultUnitsFormComponent,
    EGridEmissionsTableComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HelperPipesModule,
    LabelWithTooltipModule
  ],
  exports: [
    SustainabilityQuestionsFormComponent,
    GeneralInformationFormComponent,
    FinancialReportingFormComponent,
    DefaultUnitsFormComponent
  ]
})
export class SettingsFormsModule { }
